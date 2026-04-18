import type { DuckDBInstance } from "@duckdb/node-api";
import { openIndex, closeIndex } from "./connection.js";
import { CREATE_LOGS_TABLE, DROP_LOGS_TABLE } from "./schema.sql.js";
import { readLogFile, listRawFiles } from "../storage/reader.js";
import { serialize } from "../serialize/serializer.js";
import type { LogEvent } from "../schema/types.js";

export interface ReindexOptions {
  baseDir: string;
  dbPath: string;
}

export interface ReindexResult {
  count: number;
}

async function insertBatch(db: DuckDBInstance, batch: LogEvent[]): Promise<void> {
  if (batch.length === 0) return;
  const conn = await db.connect();
  for (const event of batch) {
    const e = event as unknown as Record<string, unknown>;
    const values: (string | number | boolean | null)[] = [
      e.id as string,
      e.timestamp as string,
      e.runtime as string,
      e.session as string,
      e.type as string,
      (e.level as string) ?? null,
      (e.message as string) ?? null,
      (e.name as string) ?? null,
      (e.stack as string) ?? null,
      (e.method as string) ?? null,
      (e.url as string) ?? null,
      (e.normalizedPath as string) ?? null,
      (e.status as number) ?? null,
      (e.duration as number) ?? null,
      (e.size as number) ?? null,
      (e.failed as boolean) ?? null,
      (e.errorMessage as string) ?? null,
      serialize(event),
    ];
    await conn.run(
      `INSERT INTO logs (id, timestamp, runtime, session, type, level, message, name, stack, method, url, normalized_path, status, duration, size, failed, error_message, raw_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      values,
    );
  }
}

export async function indexFile(db: DuckDBInstance, filePath: string): Promise<number> {
  const conn = await db.connect();
  await conn.run(CREATE_LOGS_TABLE);

  let count = 0;
  let batch: LogEvent[] = [];

  for await (const event of readLogFile(filePath)) {
    batch.push(event);
    if (batch.length >= 1000) {
      await insertBatch(db, batch);
      count += batch.length;
      batch = [];
    }
  }
  if (batch.length > 0) {
    await insertBatch(db, batch);
    count += batch.length;
  }

  return count;
}

export async function reindex(options: ReindexOptions): Promise<ReindexResult> {
  const { baseDir, dbPath } = options;
  const db = await openIndex(dbPath);

  try {
    const conn = await db.connect();
    await conn.run(DROP_LOGS_TABLE);
    await conn.run(CREATE_LOGS_TABLE);

    const files = await listRawFiles(baseDir);
    let totalCount = 0;

    for (const file of files) {
      let batch: LogEvent[] = [];
      for await (const event of readLogFile(file)) {
        batch.push(event);
        if (batch.length >= 1000) {
          await insertBatch(db, batch);
          totalCount += batch.length;
          batch = [];
        }
      }
      if (batch.length > 0) {
        await insertBatch(db, batch);
        totalCount += batch.length;
      }
    }

    return { count: totalCount };
  } finally {
    await closeIndex(db);
  }
}
