import type { DuckDBInstance } from "@duckdb/node-api";
import type { LogEvent, Runtime, EventType, LogLevel } from "../schema/types.js";

export interface QueryFilter {
  runtime?: Runtime;
  type?: EventType;
  level?: LogLevel;
  search?: string;
  from?: string;
  to?: string;
  project?: string;
  limit?: number;
  offset?: number;
}

export interface AggregateRow {
  runtime: string;
  type: string;
  level: string;
  project: string | null;
  count: number;
}

function buildWhere(filter: QueryFilter): { clause: string; params: (string | number)[] } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let idx = 1;

  if (filter.runtime) {
    conditions.push(`runtime = $${idx++}`);
    params.push(filter.runtime);
  }
  if (filter.type) {
    conditions.push(`type = $${idx++}`);
    params.push(filter.type);
  }
  if (filter.level) {
    conditions.push(`level = $${idx++}`);
    params.push(filter.level);
  }
  if (filter.search) {
    conditions.push(`message ILIKE $${idx++}`);
    params.push(`%${filter.search}%`);
  }
  if (filter.from) {
    conditions.push(`timestamp >= $${idx++}`);
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push(`timestamp <= $${idx++}`);
    params.push(filter.to);
  }
  if (filter.project) {
    conditions.push(`project = $${idx++}`);
    params.push(filter.project);
  }

  const clause = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
  return { clause, params };
}

export async function queryLogs(db: DuckDBInstance, filter: QueryFilter): Promise<LogEvent[]> {
  const conn = await db.connect();
  const { clause, params } = buildWhere(filter);

  let sql = `SELECT raw_json FROM logs${clause} ORDER BY timestamp ASC`;
  if (filter.limit != null) {
    sql += ` LIMIT ${Number(filter.limit)}`;
  }
  if (filter.offset != null) {
    sql += ` OFFSET ${Number(filter.offset)}`;
  }

  const result = params.length > 0
    ? await conn.runAndReadAll(sql, params)
    : await conn.runAndReadAll(sql);
  const rows = result.getRows();
  return rows.map((row: unknown[]) => JSON.parse(row[0] as string) as LogEvent);
}

export async function aggregateLogs(db: DuckDBInstance, filter: QueryFilter): Promise<AggregateRow[]> {
  const conn = await db.connect();
  const { clause, params } = buildWhere(filter);

  const sql = `SELECT runtime, type, level, project, COUNT(*)::INTEGER as count FROM logs${clause} GROUP BY runtime, type, level, project ORDER BY project NULLS FIRST, runtime, type, level`;

  const result = params.length > 0
    ? await conn.runAndReadAll(sql, params)
    : await conn.runAndReadAll(sql);
  const rows = result.getRows();
  return rows.map((row: unknown[]) => ({
    runtime: row[0] as string,
    type: row[1] as string,
    level: row[2] as string,
    project: (row[3] as string | null) ?? null,
    count: Number(row[4]),
  }));
}

export async function listProjects(db: DuckDBInstance): Promise<string[]> {
  const conn = await db.connect();
  const result = await conn.runAndReadAll(
    `SELECT DISTINCT project FROM logs WHERE project IS NOT NULL ORDER BY project`,
  );
  return result.getRows().map((row: unknown[]) => row[0] as string);
}
