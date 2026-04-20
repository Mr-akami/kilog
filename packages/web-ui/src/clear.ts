import { readdir, rm, unlink } from "node:fs/promises";
import path from "node:path";
import { discoverSources } from "@logit/core";

export interface ClearResult {
  rawFilesDeleted: number;
  indexDbsDeleted: number;
}

export async function clearAllLogs(root: string): Promise<ClearResult> {
  const sources = await discoverSources([root]);
  let rawFilesDeleted = 0;
  let indexDbsDeleted = 0;

  for (const src of sources) {
    const rawDir = path.join(src.devlogsDir, "raw");
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

    const indexDir = path.join(src.devlogsDir, "index");
    try {
      await rm(indexDir, { recursive: true, force: true });
      indexDbsDeleted++;
    } catch {
      // ignore
    }
  }

  return { rawFilesDeleted, indexDbsDeleted };
}
