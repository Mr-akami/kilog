import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { findLogitDirs } from "@logit/core";

export interface PruneOptions {
  root: string;
  before: string;
}

function extractDate(filename: string): string | null {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})\./);
  return match ? match[1] : null;
}

async function pruneLogitDir(logitDir: string, before: string): Promise<number> {
  const rawDir = path.join(logitDir, "raw");
  let files: string[];
  try {
    files = await readdir(rawDir);
  } catch {
    return 0;
  }

  let deleted = 0;
  for (const file of files) {
    if (!file.endsWith(".jsonl")) continue;
    const date = extractDate(file);
    if (date && date <= before) {
      await unlink(path.join(rawDir, file));
      deleted++;
    }
  }
  return deleted;
}

export async function handlePrune(options: PruneOptions): Promise<void> {
  const dirs = await findLogitDirs(options.root);
  let total = 0;
  for (const dir of dirs) {
    total += await pruneLogitDir(dir, options.before);
  }
  process.stdout.write(`Pruned ${total} files\n`);
  if (total > 0) {
    process.stdout.write("Run `logit reindex` to update the index\n");
  }
}
