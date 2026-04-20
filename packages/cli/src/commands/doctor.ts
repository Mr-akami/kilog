import { stat } from "node:fs/promises";
import path from "node:path";
import {
  DEVLOGS_DIR,
  listRawFiles,
  readLogFile,
  openIndex,
  closeIndex,
  queryLogs,
} from "@logit/core";

export interface DoctorOptions {
  baseDir: string;
  dbPath: string;
}

async function countRawEvents(baseDir: string): Promise<number> {
  const files = await listRawFiles(baseDir);
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
  const devlogsPath = path.join(options.baseDir, DEVLOGS_DIR);

  let devlogsExists = false;
  try {
    await stat(devlogsPath);
    devlogsExists = true;
  } catch {
    // does not exist
  }

  if (!devlogsExists) {
    process.stdout.write(".devlogs directory: missing\n");
    process.stdout.write("Run your app with logit to create .devlogs\n");
    return;
  }

  process.stdout.write(".devlogs directory: found\n");

  const rawCount = await countRawEvents(options.baseDir);
  const indexedCount = await countIndexedEvents(options.dbPath);

  if (indexedCount === -1) {
    process.stdout.write(`Raw events: ${rawCount}\n`);
    process.stdout.write("Index: not found\n");
    process.stdout.write("Run `logit reindex` to build the index\n");
    return;
  }

  process.stdout.write(`Raw events: ${rawCount}\n`);
  process.stdout.write(`Indexed events: ${indexedCount}\n`);

  if (rawCount !== indexedCount) {
    process.stdout.write(
      `Mismatch: raw=${rawCount}, indexed=${indexedCount}. Run \`logit reindex\` to fix\n`,
    );
  }
}
