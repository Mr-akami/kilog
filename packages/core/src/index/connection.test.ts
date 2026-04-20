import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { openIndex, closeIndex } from "./connection.js";

async function listColumns(
  db: Awaited<ReturnType<typeof openIndex>>,
  table: string,
): Promise<string[]> {
  const conn = await db.connect();
  const res = await conn.runAndReadAll(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  return res.getRows().map((r: unknown[]) => r[0] as string);
}

describe("openIndex", () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "logit-connection-"));
    dbPath = path.join(dir, "nested", "db", "logs.duckdb");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates the parent directory when opening for the first time", async () => {
    const db = await openIndex(dbPath);
    try {
      const s = await stat(path.dirname(dbPath));
      expect(s.isDirectory()).toBe(true);
    } finally {
      await closeIndex(db);
    }
  });

  it("creates logs and sources tables with the expected columns", async () => {
    const db = await openIndex(dbPath);
    try {
      const logs = await listColumns(db, "logs");
      // Sanity-check a few required columns; don't pin the full set so the
      // schema can evolve without touching this test.
      for (const col of [
        "id",
        "timestamp",
        "runtime",
        "session",
        "type",
        "level",
        "message",
        "raw_json",
        "project",
      ]) {
        expect(logs).toContain(col);
      }

      const sources = await listColumns(db, "sources");
      for (const col of ["abs_path", "last_offset", "last_mtime", "project"]) {
        expect(sources).toContain(col);
      }
    } finally {
      await closeIndex(db);
    }
  });

  it("is idempotent when reopening an existing DB", async () => {
    const first = await openIndex(dbPath);
    await closeIndex(first);
    // Should not throw because CREATE TABLE IF NOT EXISTS + ALTER IF NOT EXISTS.
    const second = await openIndex(dbPath);
    try {
      const logs = await listColumns(second, "logs");
      expect(logs).toContain("project");
    } finally {
      await closeIndex(second);
    }
  });
});
