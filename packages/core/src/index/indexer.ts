import type { DuckDBInstance } from "@duckdb/node-api";
import { openIndex, closeIndex } from "./connection.js";
import {
  CREATE_LOGS_TABLE,
  DROP_LOGS_TABLE,
  DROP_SOURCES_TABLE,
  CREATE_SOURCES_TABLE,
} from "./schema.sql.js";
import { readLogFile, listRawFiles } from "../storage/reader.js";
import { insertEvents } from "./insert.js";
import type { LogEvent } from "../schema/types.js";

export interface ReindexOptions {
  baseDir: string;
  dbPath: string;
  project?: string | null;
}

export interface ReindexResult {
  count: number;
}

export async function indexFile(
  db: DuckDBInstance,
  filePath: string,
  project: string | null = null,
): Promise<number> {
  let count = 0;
  let batch: LogEvent[] = [];

  for await (const event of readLogFile(filePath)) {
    batch.push(event);
    if (batch.length >= 1000) {
      await insertEvents(db, batch, project);
      count += batch.length;
      batch = [];
    }
  }
  if (batch.length > 0) {
    await insertEvents(db, batch, project);
    count += batch.length;
  }

  return count;
}

async function resetSchema(db: DuckDBInstance): Promise<void> {
  const conn = await db.connect();
  await conn.run(DROP_LOGS_TABLE);
  await conn.run(DROP_SOURCES_TABLE);
  await conn.run(CREATE_LOGS_TABLE);
  await conn.run(CREATE_SOURCES_TABLE);
}

export async function reindex(options: ReindexOptions): Promise<ReindexResult> {
  const { baseDir, dbPath } = options;
  const db = await openIndex(dbPath);

  try {
    await resetSchema(db);
    const files = await listRawFiles(baseDir);
    let totalCount = 0;
    for (const file of files) {
      totalCount += await indexFile(db, file, options.project ?? null);
    }
    return { count: totalCount };
  } finally {
    await closeIndex(db);
  }
}
