import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import type { DuckDBInstance } from "@duckdb/node-api";
import { deserialize } from "../serialize/serializer.js";
import { insertEvents } from "./insert.js";
import type { LogEvent } from "../schema/types.js";
import type { SourceFile } from "../discovery/discovery.js";

interface SourceState {
  lastOffset: number;
  lastMtime: string | null;
}

async function readSourceState(db: DuckDBInstance, absPath: string): Promise<SourceState | null> {
  const conn = await db.connect();
  const result = await conn.runAndReadAll(
    `SELECT last_offset, last_mtime FROM sources WHERE abs_path = $1`,
    [absPath],
  );
  const rows = result.getRows();
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    lastOffset: Number(row[0]),
    lastMtime: (row[1] as string | null) ?? null,
  };
}

async function writeSourceState(
  db: DuckDBInstance,
  absPath: string,
  offset: number,
  mtime: string,
  project: string | null,
): Promise<void> {
  const conn = await db.connect();
  await conn.run(
    `INSERT INTO sources (abs_path, last_offset, last_mtime, project) VALUES ($1, $2, $3, $4)
     ON CONFLICT (abs_path) DO UPDATE SET last_offset = EXCLUDED.last_offset, last_mtime = EXCLUDED.last_mtime, project = EXCLUDED.project`,
    [absPath, offset, mtime, project],
  );
}

export interface CatchUpResult {
  inserted: number;
}

export async function catchUpFile(
  db: DuckDBInstance,
  absPath: string,
  project: string | null = null,
): Promise<number> {
  let size: number;
  let mtime: string;
  try {
    const s = await stat(absPath);
    size = s.size;
    mtime = s.mtime.toISOString();
  } catch {
    return 0;
  }

  const prev = await readSourceState(db, absPath);
  let startOffset = prev?.lastOffset ?? 0;

  const truncated = startOffset > size;
  const mtimeRegressed = prev?.lastMtime != null && mtime < prev.lastMtime;
  if (truncated || mtimeRegressed) {
    startOffset = 0;
  }

  if (startOffset >= size) {
    await writeSourceState(db, absPath, size, mtime, project);
    return 0;
  }

  const events: LogEvent[] = [];
  let bytesRead = 0;
  const stream = createReadStream(absPath, { start: startOffset, encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    bytesRead += Buffer.byteLength(line, "utf-8") + 1; // +1 for newline
    if (line.trim() === "") continue;
    try {
      events.push(deserialize(line));
    } catch {
      // Skip malformed lines (e.g. a partial final line from a concurrent write).
    }
  }

  if (events.length > 0) {
    await insertEvents(db, events, project);
  }

  const newOffset = Math.min(startOffset + bytesRead, size);
  await writeSourceState(db, absPath, newOffset, mtime, project);
  return events.length;
}

export async function catchUpIndex(
  db: DuckDBInstance,
  files: SourceFile[] | string[],
): Promise<CatchUpResult> {
  let inserted = 0;
  for (const f of files) {
    if (typeof f === "string") {
      inserted += await catchUpFile(db, f, null);
    } else {
      inserted += await catchUpFile(db, f.absPath, f.project);
    }
  }
  return { inserted };
}
