import type * as duckdb from "@duckdb/duckdb-wasm";
import { insertLogEvent } from "./duckdb.js";

export interface SourceDescriptor {
  path: string;
  displayPath: string;
  project: string;
  size: number;
  mtime: string;
}

export interface SourcesResponse {
  root: string;
  sources: SourceDescriptor[];
}

interface SourceState {
  offset: number;
  mtime: string;
}

export class Ingester {
  private state = new Map<string, SourceState>();
  private root: string;

  constructor(initialRoot: string) {
    this.root = initialRoot;
  }

  setRoot(root: string): void {
    if (root === this.root) return;
    this.root = root;
    this.state.clear();
  }

  getRoot(): string {
    return this.root;
  }

  resetOffsets(): void {
    this.state.clear();
  }

  async listSources(): Promise<SourcesResponse> {
    const url = `/api/sources?root=${encodeURIComponent(this.root)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`/api/sources failed: ${res.status}`);
    return res.json();
  }

  async catchUpAll(db: duckdb.AsyncDuckDB): Promise<number> {
    const { sources } = await this.listSources();
    let inserted = 0;
    for (const src of sources) {
      inserted += await this.catchUpFile(db, src);
    }
    // drop state for files that disappeared
    const current = new Set(sources.map((s) => s.path));
    for (const key of this.state.keys()) {
      if (!current.has(key)) this.state.delete(key);
    }
    return inserted;
  }

  private async catchUpFile(db: duckdb.AsyncDuckDB, src: SourceDescriptor): Promise<number> {
    const prev = this.state.get(src.path);
    let offset = prev?.offset ?? 0;
    const truncated = offset > src.size;
    const mtimeRegressed = prev != null && src.mtime < prev.mtime;
    if (truncated || mtimeRegressed) offset = 0;

    if (offset >= src.size) {
      this.state.set(src.path, { offset: src.size, mtime: src.mtime });
      return 0;
    }

    const url = `/api/read?path=${encodeURIComponent(src.path)}&root=${encodeURIComponent(this.root)}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`read failed: ${src.displayPath}: ${res.status}`);
      return 0;
    }
    const text = await res.text();
    const lines = text.split("\n");
    let inserted = 0;
    for (const line of lines) {
      if (line.trim() === "") continue;
      try {
        const event = JSON.parse(line) as Record<string, unknown>;
        await insertLogEvent(db, event, src.project);
        inserted++;
      } catch {
        // skip malformed
      }
    }
    const newSize = Number(res.headers.get("X-File-Size") ?? src.size);
    this.state.set(src.path, { offset: newSize, mtime: src.mtime });
    return inserted;
  }
}
