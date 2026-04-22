import { stat } from "node:fs/promises";
import path from "node:path";
import { discoverSourceFiles } from "@kilog/core";

export interface SourceDescriptor {
  /** Absolute filesystem path to the JSONL file. */
  path: string;
  /** Path relative to the resolved root (display-friendly). */
  displayPath: string;
  /** Project label derived from discovery. */
  project: string;
  size: number;
  mtime: string;
}

export async function describeSources(root: string): Promise<SourceDescriptor[]> {
  const files = await discoverSourceFiles([root]);
  const out: SourceDescriptor[] = [];
  for (const f of files) {
    try {
      const s = await stat(f.absPath);
      out.push({
        path: f.absPath,
        displayPath: path.relative(root, f.absPath) || f.absPath,
        project: f.project,
        size: s.size,
        mtime: s.mtime.toISOString(),
      });
    } catch {
      // file vanished between discovery and stat
    }
  }
  return out;
}
