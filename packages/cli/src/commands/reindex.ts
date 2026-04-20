import path from "node:path";
import { reindex, discoverSources, dbFilePathFromLogitDir } from "@logit/core";

export interface ReindexHandlerOptions {
  root: string;
}

export async function handleReindex(options: ReindexHandlerOptions): Promise<void> {
  const sources = await discoverSources([options.root]);
  let total = 0;
  for (const src of sources) {
    const result = await reindex({
      baseDir: path.dirname(src.logitDir),
      dbPath: dbFilePathFromLogitDir(src.logitDir),
    });
    total += result.count;
  }
  process.stdout.write(`Reindexed ${total} events across ${sources.length} project(s)\n`);
}
