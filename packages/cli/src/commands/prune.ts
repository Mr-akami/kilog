import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { RAW_DIR } from "@logit/core";

export interface PruneOptions {
  baseDir: string;
  before: string;
}

function extractDate(filename: string): string | null {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})\./);
  return match ? match[1] : null;
}

export async function handlePrune(options: PruneOptions): Promise<void> {
  const rawDir = path.join(options.baseDir, RAW_DIR);

  let files: string[];
  try {
    files = await readdir(rawDir);
  } catch {
    process.stdout.write("Pruned 0 files\n");
    return;
  }

  const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));
  let deleted = 0;

  for (const file of jsonlFiles) {
    const date = extractDate(file);
    if (date && date <= options.before) {
      await unlink(path.join(rawDir, file));
      deleted++;
    }
  }

  process.stdout.write(`Pruned ${deleted} files\n`);
  if (deleted > 0) {
    process.stdout.write("Run `logit reindex` to update the index\n");
  }
}
