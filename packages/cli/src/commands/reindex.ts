import { reindex } from "@logit/core";

export interface ReindexHandlerOptions {
  baseDir: string;
  dbPath: string;
}

export async function handleReindex(options: ReindexHandlerOptions): Promise<void> {
  const result = await reindex(options);
  process.stdout.write(`Reindexed ${result.count} events\n`);
}
