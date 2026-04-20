import { stat } from "node:fs/promises";
import path from "node:path";
import {
  discoverSources,
  listRawFilesIn,
  readLogFile,
  openIndex,
  closeIndex,
  queryLogs,
  dbFilePathFromDevlogs,
} from "@logit/core";

export interface DoctorOptions {
  root: string;
}

async function countEventsIn(files: string[]): Promise<number> {
  let count = 0;
  for (const file of files) {
    for await (const _ of readLogFile(file)) {
      count++;
    }
  }
  return count;
}

async function countIndexedEvents(dbPath: string): Promise<number> {
  try {
    await stat(dbPath);
  } catch {
    return -1;
  }
  const db = await openIndex(dbPath);
  try {
    const events = await queryLogs(db, {});
    return events.length;
  } finally {
    await closeIndex(db);
  }
}

export async function handleDoctor(options: DoctorOptions): Promise<void> {
  const sources = await discoverSources([options.root]);

  if (sources.length === 0) {
    process.stdout.write(`.devlogs directories: none found under ${options.root}\n`);
    process.stdout.write("Run your app with logit to create .devlogs\n");
    return;
  }

  process.stdout.write(`.devlogs directories: ${sources.length} found\n`);

  for (const src of sources) {
    const display = path.relative(options.root, src.devlogsDir) || src.devlogsDir;
    process.stdout.write(`\n  [${src.project}] ${display}\n`);
    const rawFiles = await listRawFilesIn(src.devlogsDir);
    const rawCount = await countEventsIn(rawFiles);
    const dbPath = dbFilePathFromDevlogs(src.devlogsDir);
    const indexedCount = await countIndexedEvents(dbPath);

    if (indexedCount === -1) {
      process.stdout.write(`    raw=${rawCount}, index=missing (run \`logit reindex\`)\n`);
    } else {
      process.stdout.write(`    raw=${rawCount}, indexed=${indexedCount}`);
      if (rawCount !== indexedCount) {
        process.stdout.write("  [mismatch — run `logit reindex`]");
      }
      process.stdout.write("\n");
    }
  }
}
