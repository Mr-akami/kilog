import type { DuckDBInstance } from "@duckdb/node-api";
import { serialize } from "../serialize/serializer.js";
import type { LogEvent } from "../schema/types.js";

const INSERT_SQL = `INSERT INTO logs (id, timestamp, runtime, session, type, level, message, name, stack, method, url, normalized_path, status, duration, size, failed, error_message, raw_json, project) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) ON CONFLICT (id) DO NOTHING`;

export async function insertEvents(
  db: DuckDBInstance,
  events: LogEvent[],
  project: string | null = null,
): Promise<void> {
  if (events.length === 0) return;
  const conn = await db.connect();
  for (const event of events) {
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
      project,
    ];
    await conn.run(INSERT_SQL, values);
  }
}
