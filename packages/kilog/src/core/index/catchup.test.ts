import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, writeFile, appendFile, truncate } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { openIndex, closeIndex } from "./connection.js";
import { catchUpIndex, catchUpFile } from "./catchup.js";
import { queryLogs } from "./query.js";
import { serialize } from "../serialize/serializer.js";
import type { ConsoleEvent } from "../schema/types.js";

function makeEvent(message: string, id?: string): ConsoleEvent {
  return {
    id: id ?? crypto.randomUUID(),
    timestamp: "2026-04-20T10:00:00.000Z",
    runtime: "node",
    session: "sess-1",
    type: "console",
    level: "info",
    message,
  };
}

describe("catchUpIndex", () => {
  let baseDir: string;
  let dbPath: string;
  let jsonlPath: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-catchup-"));
    dbPath = path.join(baseDir, "logs.duckdb");
    jsonlPath = path.join(baseDir, "events.jsonl");
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("creates schema on open so querying an empty DB does not fail", async () => {
    const db = await openIndex(dbPath);
    try {
      const events = await queryLogs(db, {});
      expect(events).toEqual([]);
    } finally {
      await closeIndex(db);
    }
  });

  it("inserts all events from a fresh JSONL file", async () => {
    await writeFile(
      jsonlPath,
      [serialize(makeEvent("a")), serialize(makeEvent("b"))].join("\n") + "\n",
    );
    const db = await openIndex(dbPath);
    try {
      const result = await catchUpIndex(db, [jsonlPath]);
      expect(result.inserted).toBe(2);
      const rows = await queryLogs(db, {});
      expect(rows.map((r) => (r as ConsoleEvent).message).sort()).toEqual(["a", "b"]);
    } finally {
      await closeIndex(db);
    }
  });

  it("only inserts newly appended events on subsequent runs", async () => {
    await writeFile(jsonlPath, serialize(makeEvent("a")) + "\n");
    const db = await openIndex(dbPath);
    try {
      const first = await catchUpIndex(db, [jsonlPath]);
      expect(first.inserted).toBe(1);

      await appendFile(jsonlPath, serialize(makeEvent("b")) + "\n");
      const second = await catchUpIndex(db, [jsonlPath]);
      expect(second.inserted).toBe(1);

      const rows = await queryLogs(db, {});
      expect(rows).toHaveLength(2);
    } finally {
      await closeIndex(db);
    }
  });

  it("is a no-op when the file has not changed", async () => {
    await writeFile(jsonlPath, serialize(makeEvent("a")) + "\n");
    const db = await openIndex(dbPath);
    try {
      await catchUpIndex(db, [jsonlPath]);
      const again = await catchUpIndex(db, [jsonlPath]);
      expect(again.inserted).toBe(0);
    } finally {
      await closeIndex(db);
    }
  });

  it("skips missing files silently", async () => {
    const db = await openIndex(dbPath);
    try {
      const result = await catchUpIndex(db, [path.join(baseDir, "nope.jsonl")]);
      expect(result.inserted).toBe(0);
    } finally {
      await closeIndex(db);
    }
  });

  it("handles file truncation by re-reading from offset 0", async () => {
    await writeFile(
      jsonlPath,
      [serialize(makeEvent("a")), serialize(makeEvent("b"))].join("\n") + "\n",
    );
    const db = await openIndex(dbPath);
    try {
      await catchUpFile(db, jsonlPath);
      // truncate the file — simulates the user running `prune` or editing by hand
      await truncate(jsonlPath, 0);
      await writeFile(jsonlPath, serialize(makeEvent("c")) + "\n");
      const result = await catchUpFile(db, jsonlPath);
      // "a" and "b" are still in DB (ON CONFLICT DO NOTHING keeps old ids),
      // "c" is inserted fresh
      expect(result).toBe(1);
      const rows = await queryLogs(db, {});
      const messages = rows.map((r) => (r as ConsoleEvent).message).sort();
      expect(messages).toContain("c");
    } finally {
      await closeIndex(db);
    }
  });

  it("stores project label alongside ingested events", async () => {
    await writeFile(jsonlPath, serialize(makeEvent("hello")) + "\n");
    const db = await openIndex(dbPath);
    try {
      await catchUpIndex(db, [{ absPath: jsonlPath, project: "apps/api" }]);
      const rows = await queryLogs(db, { project: "apps/api" });
      expect(rows).toHaveLength(1);
      const none = await queryLogs(db, { project: "other" });
      expect(none).toHaveLength(0);
    } finally {
      await closeIndex(db);
    }
  });

  it("is idempotent under duplicate ids via ON CONFLICT DO NOTHING", async () => {
    const ev = makeEvent("dup", "fixed-id");
    await writeFile(jsonlPath, serialize(ev) + "\n");
    const db = await openIndex(dbPath);
    try {
      await catchUpFile(db, jsonlPath);
      // force a re-read by resetting sources row (simulate external reset)
      const conn = await db.connect();
      await conn.run(`DELETE FROM sources WHERE abs_path = $1`, [jsonlPath]);
      const result = await catchUpFile(db, jsonlPath);
      // one event read, but insert is ignored due to PK conflict
      expect(result).toBe(1);
      const rows = await queryLogs(db, {});
      expect(rows).toHaveLength(1);
    } finally {
      await closeIndex(db);
    }
  });
});
