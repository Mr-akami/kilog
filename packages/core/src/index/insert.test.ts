import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { openIndex, closeIndex } from "./connection.js";
import { insertEvents } from "./insert.js";
import { queryLogs } from "./query.js";
import type { ConsoleEvent, NetworkEvent, ErrorEvent } from "../schema/types.js";

describe("insertEvents", () => {
  let baseDir: string;
  let dbPath: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-insert-"));
    dbPath = path.join(baseDir, "logs.duckdb");
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("is a no-op on an empty array", async () => {
    const db = await openIndex(dbPath);
    try {
      await insertEvents(db, []);
      expect(await queryLogs(db, {})).toEqual([]);
    } finally {
      await closeIndex(db);
    }
  });

  it("inserts console events with all columns populated", async () => {
    const event: ConsoleEvent = {
      id: "c1",
      timestamp: "2026-04-20T10:00:00.000Z",
      runtime: "node",
      session: "s",
      type: "console",
      level: "warn",
      message: "hello",
      args: ["hello"],
    };
    const db = await openIndex(dbPath);
    try {
      await insertEvents(db, [event], "my-project");
      const rows = (await queryLogs(db, {})) as ConsoleEvent[];
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("c1");
      expect(rows[0].message).toBe("hello");
      expect(rows[0].level).toBe("warn");
      const tagged = (await queryLogs(db, { project: "my-project" })) as ConsoleEvent[];
      expect(tagged).toHaveLength(1);
    } finally {
      await closeIndex(db);
    }
  });

  it("stores network event fields distinctly from console", async () => {
    const event: NetworkEvent = {
      id: "n1",
      timestamp: "2026-04-20T10:00:00.000Z",
      runtime: "browser",
      session: "s",
      type: "network",
      level: "info",
      method: "POST",
      url: "https://api.example.com/users",
      normalizedPath: "/users",
      status: 201,
      duration: 42,
      size: 128,
      failed: false,
    };
    const db = await openIndex(dbPath);
    try {
      await insertEvents(db, [event]);
      const rows = (await queryLogs(db, { type: "network" })) as NetworkEvent[];
      expect(rows).toHaveLength(1);
      expect(rows[0].method).toBe("POST");
      expect(rows[0].url).toBe("https://api.example.com/users");
      expect(rows[0].status).toBe(201);
      expect(rows[0].failed).toBe(false);
    } finally {
      await closeIndex(db);
    }
  });

  it("preserves error name + stack in dedicated columns", async () => {
    const event: ErrorEvent = {
      id: "e1",
      timestamp: "2026-04-20T10:00:00.000Z",
      runtime: "node",
      session: "s",
      type: "error",
      level: "error",
      message: "boom",
      name: "TypeError",
      stack: "Error: boom\n  at foo",
    };
    const db = await openIndex(dbPath);
    try {
      await insertEvents(db, [event]);
      const rows = (await queryLogs(db, { type: "error" })) as ErrorEvent[];
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("TypeError");
      expect(rows[0].stack).toContain("at foo");
    } finally {
      await closeIndex(db);
    }
  });

  it("ignores duplicate ids via ON CONFLICT DO NOTHING", async () => {
    const event: ConsoleEvent = {
      id: "dup",
      timestamp: "2026-04-20T10:00:00.000Z",
      runtime: "node",
      session: "s",
      type: "console",
      level: "info",
      message: "first",
    };
    const db = await openIndex(dbPath);
    try {
      await insertEvents(db, [event]);
      // second call with same id + different message must not throw and must not overwrite
      await insertEvents(db, [{ ...event, message: "second" }]);
      const rows = (await queryLogs(db, {})) as ConsoleEvent[];
      expect(rows).toHaveLength(1);
      expect(rows[0].message).toBe("first");
    } finally {
      await closeIndex(db);
    }
  });

  it("defaults project to NULL when omitted", async () => {
    const event: ConsoleEvent = {
      id: "np",
      timestamp: "2026-04-20T10:00:00.000Z",
      runtime: "node",
      session: "s",
      type: "console",
      level: "info",
      message: "anon",
    };
    const db = await openIndex(dbPath);
    try {
      await insertEvents(db, [event]);
      const tagged = await queryLogs(db, { project: "anything" });
      expect(tagged).toEqual([]);
      const all = await queryLogs(db, {});
      expect(all).toHaveLength(1);
    } finally {
      await closeIndex(db);
    }
  });
});
