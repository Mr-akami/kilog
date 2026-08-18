import { readdir, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { INDEX_DIR, RAW_DIR } from "./paths.js";

export interface ClearProjectResult {
  rawFilesDeleted: number;
  indexDirDeleted: boolean;
}

const clearedDirs = new Set<string>();

export async function clearOnce(baseDir: string): Promise<ClearProjectResult | null> {
  const abs = path.resolve(baseDir);
  if (clearedDirs.has(abs)) return null;
  clearedDirs.add(abs);
  return clearProjectLogs(abs);
}

export async function clearProjectLogs(baseDir: string): Promise<ClearProjectResult> {
  let rawFilesDeleted = 0;
  const rawDir = path.join(baseDir, RAW_DIR);
  try {
    const entries = await readdir(rawDir);
    for (const e of entries) {
      if (!e.endsWith(".jsonl")) continue;
      await unlink(path.join(rawDir, e));
      rawFilesDeleted++;
    }
  } catch {
    // raw dir missing
  }

  let indexDirDeleted = false;
  const indexDir = path.join(baseDir, INDEX_DIR);
  try {
    await stat(indexDir);
    await rm(indexDir, { recursive: true, force: true });
    indexDirDeleted = true;
  } catch {
    // missing or unreadable
  }

  return { rawFilesDeleted, indexDirDeleted };
}
