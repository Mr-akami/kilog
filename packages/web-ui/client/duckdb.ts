import * as duckdb from "@duckdb/duckdb-wasm";
import mvp_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import eh_wasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";

const BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: mvp_wasm, mainWorker: mvp_worker },
  eh: { mainModule: eh_wasm, mainWorker: eh_worker },
};

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

export async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const bundle = await duckdb.selectBundle(BUNDLES);
      const worker = new Worker(bundle.mainWorker!, { type: "module" });
      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      await ensureSchema(db);
      return db;
    })();
  }
  return dbPromise;
}

async function ensureSchema(db: duckdb.AsyncDuckDB): Promise<void> {
  const conn = await db.connect();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id VARCHAR PRIMARY KEY,
        timestamp VARCHAR NOT NULL,
        runtime VARCHAR NOT NULL,
        session VARCHAR NOT NULL,
        type VARCHAR NOT NULL,
        level VARCHAR,
        message VARCHAR,
        name VARCHAR,
        stack VARCHAR,
        method VARCHAR,
        url VARCHAR,
        normalized_path VARCHAR,
        status INTEGER,
        duration DOUBLE,
        size INTEGER,
        failed BOOLEAN,
        error_message VARCHAR,
        raw_json VARCHAR,
        project VARCHAR
      )
    `);
  } finally {
    await conn.close();
  }
}

export async function insertLogEvent(
  db: duckdb.AsyncDuckDB,
  event: Record<string, unknown>,
  project: string,
): Promise<void> {
  const conn = await db.connect();
  try {
    const stmt = await conn.prepare(
      `INSERT INTO logs (id, timestamp, runtime, session, type, level, message, name, stack, method, url, normalized_path, status, duration, size, failed, error_message, raw_json, project)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (id) DO NOTHING`,
    );
    try {
      await stmt.query(
        event.id,
        event.timestamp,
        event.runtime,
        event.session,
        event.type,
        event.level ?? null,
        event.message ?? null,
        event.name ?? null,
        event.stack != null ? JSON.stringify(event.stack) : null,
        event.method ?? null,
        event.url ?? null,
        event.normalizedPath ?? null,
        event.status ?? null,
        event.duration ?? null,
        event.size ?? null,
        event.failed ?? null,
        event.errorMessage ?? null,
        JSON.stringify(event),
        project,
      );
    } finally {
      await stmt.close();
    }
  } finally {
    await conn.close();
  }
}

export async function runQuery(
  db: duckdb.AsyncDuckDB,
  sql: string,
): Promise<Record<string, unknown>[]> {
  const conn = await db.connect();
  try {
    const result = await conn.query(sql);
    return result.toArray().map((row) => (row as unknown as { toJSON: () => Record<string, unknown> }).toJSON());
  } finally {
    await conn.close();
  }
}
