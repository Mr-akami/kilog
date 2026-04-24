import {
  catchUpFile,
  closeIndex,
  dbFilePathFromKilogDir,
  discoverSources,
  listRawFilesIn,
  openIndex,
} from "@kilog/core";
import { formatGenericTable } from "../format/generic-table.js";

export interface SqlOptions {
  root: string;
  sql?: string;
  project?: string;
  json?: boolean;
  schema?: boolean;
}

type DuckResult = {
  getRows(): unknown[][];
  getColumnNames?: () => string[];
  columnNames?: (() => string[]) | string[];
};

function columnNames(result: DuckResult, width: number): string[] {
  if (typeof result.getColumnNames === "function") return result.getColumnNames();
  if (typeof result.columnNames === "function") return result.columnNames();
  if (Array.isArray(result.columnNames)) return result.columnNames;
  return Array.from({ length: width }, (_, i) => `col_${i + 1}`);
}

function jsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  return value;
}

function rowsToObjects(result: DuckResult, source: string, project: string): Record<string, unknown>[] {
  const rows = result.getRows();
  const names = columnNames(result, rows[0]?.length ?? 0);
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (let i = 0; i < row.length; i++) out[names[i] ?? `col_${i + 1}`] = jsonSafe(row[i]);
    out.source = source;
    out.project = project;
    return out;
  });
}

async function runQuery(dbPath: string, sql: string, source: string, project: string): Promise<Record<string, unknown>[]> {
  const db = await openIndex(dbPath);
  try {
    const conn = await db.connect();
    const result = (await conn.runAndReadAll(sql)) as unknown as DuckResult;
    return rowsToObjects(result, source, project);
  } finally {
    await closeIndex(db);
  }
}

async function catchUp(kilogDir: string, project: string): Promise<void> {
  const db = await openIndex(dbFilePathFromKilogDir(kilogDir));
  try {
    for (const raw of await listRawFilesIn(kilogDir)) {
      await catchUpFile(db, raw, project);
    }
  } finally {
    await closeIndex(db);
  }
}

export async function handleSql(options: SqlOptions): Promise<void> {
  const sources = (await discoverSources([options.root])).filter(
    (source) => !options.project || source.project === options.project,
  );

  if (options.schema) {
    const sql =
      "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('logs', 'sources') ORDER BY table_name, ordinal_position";
    const rows: Record<string, unknown>[] = [];
    for (const source of sources) {
      rows.push(...(await runQuery(dbFilePathFromKilogDir(source.kilogDir), sql, source.kilogDir, source.project)));
    }
    if (options.json) {
      process.stdout.write(JSON.stringify(rows) + "\n");
    } else {
      process.stdout.write(formatGenericTable(rows) + (rows.length > 0 ? "\n" : ""));
    }
    return;
  }

  if (!options.sql) throw new Error("missing SQL query");

  if (sources.length > 1) {
    process.stderr.write(
      `[info] running across ${sources.length} sources - each runs independently; results tagged with source/project. use --project <name> to target one.\n`,
    );
  }

  const rows: Record<string, unknown>[] = [];
  for (const source of sources) {
    await catchUp(source.kilogDir, source.project);
    rows.push(...(await runQuery(dbFilePathFromKilogDir(source.kilogDir), options.sql, source.kilogDir, source.project)));
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(rows) + "\n");
    return;
  }

  process.stdout.write(formatGenericTable(rows) + (rows.length > 0 ? "\n" : ""));
}
