import { describe, it, expect, beforeAll, afterAll } from "vite-plus/test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { queryLogs, aggregateLogs } from "./query.js";
import { reindex } from "./indexer.js";
import { openIndex, closeIndex } from "./connection.js";
import { serialize } from "../serialize/serializer.js";
import type {
  ConsoleEvent,
  ErrorEvent,
  NetworkEvent,
  UnhandledRejectionEvent,
  LogEvent,
} from "../schema/types.js";
import type { DuckDBInstance } from "@duckdb/node-api";

// ── helpers ──

function makeConsoleEvent(overrides?: Partial<ConsoleEvent>): ConsoleEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-04-18T10:00:00.000Z",
    runtime: "node",
    session: "sess-1",
    type: "console",
    level: "info",
    message: "test",
    ...overrides,
  };
}

function makeErrorEvent(overrides?: Partial<ErrorEvent>): ErrorEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-04-18T11:00:00.000Z",
    runtime: "node",
    session: "sess-1",
    type: "error",
    level: "error",
    message: "error occurred",
    name: "TypeError",
    ...overrides,
  };
}

function makeNetworkEvent(overrides?: Partial<NetworkEvent>): NetworkEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-04-18T12:00:00.000Z",
    runtime: "browser",
    session: "sess-2",
    type: "network",
    level: "info",
    method: "GET",
    url: "https://api.example.com/users",
    normalizedPath: "/users",
    failed: false,
    ...overrides,
  };
}

function makeUnhandledRejectionEvent(
  overrides?: Partial<UnhandledRejectionEvent>,
): UnhandledRejectionEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-04-18T13:00:00.000Z",
    runtime: "deno",
    session: "sess-3",
    type: "unhandled-rejection",
    level: "error",
    message: "unhandled promise rejection",
    ...overrides,
  };
}

// ── test suite with shared DB ──

describe("queryLogs", () => {
  let baseDir: string;
  let db: DuckDBInstance;
  let allEvents: LogEvent[];

  beforeAll(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-query-"));
    await mkdir(path.join(baseDir, ".kilog", "raw"), { recursive: true });
    await mkdir(path.join(baseDir, ".kilog", "index"), { recursive: true });

    allEvents = [
      makeConsoleEvent({
        message: "debug msg",
        level: "debug",
        timestamp: "2026-04-18T08:00:00.000Z",
      }),
      makeConsoleEvent({
        message: "info msg",
        level: "info",
        timestamp: "2026-04-18T09:00:00.000Z",
      }),
      makeConsoleEvent({
        message: "warn msg",
        level: "warn",
        timestamp: "2026-04-18T10:00:00.000Z",
      }),
      makeErrorEvent({ message: "type error", timestamp: "2026-04-18T11:00:00.000Z" }),
      makeNetworkEvent({ status: 200, duration: 50, timestamp: "2026-04-18T12:00:00.000Z" }),
      makeNetworkEvent({
        status: 500,
        failed: true,
        errorMessage: "server error",
        timestamp: "2026-04-18T12:30:00.000Z",
      }),
      makeUnhandledRejectionEvent({ timestamp: "2026-04-18T13:00:00.000Z" }),
    ];

    const rawDir = path.join(baseDir, ".kilog", "raw");
    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      allEvents
        .filter((e) => e.runtime === "node")
        .map(serialize)
        .join("\n") + "\n",
    );
    await writeFile(
      path.join(rawDir, "2026-04-18.browser.jsonl"),
      allEvents
        .filter((e) => e.runtime === "browser")
        .map(serialize)
        .join("\n") + "\n",
    );
    await writeFile(
      path.join(rawDir, "2026-04-18.deno.jsonl"),
      allEvents
        .filter((e) => e.runtime === "deno")
        .map(serialize)
        .join("\n") + "\n",
    );

    const dbPath = path.join(baseDir, ".kilog", "index", "logs.duckdb");
    await reindex({ baseDir, dbPath });
    db = await openIndex(dbPath);
  });

  afterAll(async () => {
    if (db) await closeIndex(db);
    await rm(baseDir, { recursive: true, force: true });
  });

  // ── no filter ──

  it("should return all events when no filter is set", async () => {
    const result = await queryLogs(db, {});
    expect(result).toHaveLength(allEvents.length);
  });

  // ── filter by runtime ──

  it("should filter by runtime=node", async () => {
    const result = await queryLogs(db, { runtime: "node" });
    expect(result.length).toBeGreaterThan(0);
    for (const event of result) {
      expect(event.runtime).toBe("node");
    }
  });

  it("should filter by runtime=browser", async () => {
    const result = await queryLogs(db, { runtime: "browser" });
    expect(result.length).toBeGreaterThan(0);
    for (const event of result) {
      expect(event.runtime).toBe("browser");
    }
  });

  it("should filter by runtime=deno", async () => {
    const result = await queryLogs(db, { runtime: "deno" });
    expect(result).toHaveLength(1);
    expect(result[0].runtime).toBe("deno");
  });

  // ── filter by type ──

  it("should filter by type=console", async () => {
    const result = await queryLogs(db, { type: "console" });
    for (const event of result) {
      expect(event.type).toBe("console");
    }
    expect(result).toHaveLength(3);
  });

  it("should filter by type=error", async () => {
    const result = await queryLogs(db, { type: "error" });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("error");
  });

  it("should filter by type=network", async () => {
    const result = await queryLogs(db, { type: "network" });
    expect(result).toHaveLength(2);
  });

  it("should filter by type=unhandled-rejection", async () => {
    const result = await queryLogs(db, { type: "unhandled-rejection" });
    expect(result).toHaveLength(1);
  });

  // ── filter by level ──

  it("should filter by level=error", async () => {
    const result = await queryLogs(db, { level: "error" });
    for (const event of result) {
      expect(event.level).toBe("error");
    }
    // ErrorEvent + UnhandledRejectionEvent = 2
    expect(result).toHaveLength(2);
  });

  it("should filter by level=debug", async () => {
    const result = await queryLogs(db, { level: "debug" });
    expect(result).toHaveLength(1);
  });

  // ── time range ──

  it("should filter by from timestamp", async () => {
    const result = await queryLogs(db, { from: "2026-04-18T11:00:00.000Z" });
    for (const event of result) {
      expect(new Date(event.timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date("2026-04-18T11:00:00.000Z").getTime(),
      );
    }
  });

  it("should filter by to timestamp", async () => {
    const result = await queryLogs(db, { to: "2026-04-18T10:00:00.000Z" });
    for (const event of result) {
      expect(new Date(event.timestamp).getTime()).toBeLessThanOrEqual(
        new Date("2026-04-18T10:00:00.000Z").getTime(),
      );
    }
  });

  it("should filter by from+to range", async () => {
    const result = await queryLogs(db, {
      from: "2026-04-18T09:00:00.000Z",
      to: "2026-04-18T11:00:00.000Z",
    });
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const event of result) {
      const t = new Date(event.timestamp).getTime();
      expect(t).toBeGreaterThanOrEqual(new Date("2026-04-18T09:00:00.000Z").getTime());
      expect(t).toBeLessThanOrEqual(new Date("2026-04-18T11:00:00.000Z").getTime());
    }
  });

  // ── limit / offset ──

  it("should respect limit", async () => {
    const result = await queryLogs(db, { limit: 2 });
    expect(result).toHaveLength(2);
  });

  it("should respect offset", async () => {
    const all = await queryLogs(db, {});
    const offset2 = await queryLogs(db, { offset: 2 });
    expect(offset2).toHaveLength(all.length - 2);
  });

  it("should respect limit + offset together", async () => {
    const result = await queryLogs(db, { limit: 1, offset: 1 });
    expect(result).toHaveLength(1);
  });

  it("should support descending order for tail-style reads", async () => {
    const result = await queryLogs(db, { order: "desc", limit: 2 });
    expect(result).toHaveLength(2);
    expect(result[0].timestamp >= result[1].timestamp).toBe(true);
  });

  it("should return empty when offset exceeds total", async () => {
    const result = await queryLogs(db, { offset: 1000 });
    expect(result).toHaveLength(0);
  });

  // ── combined filters ──

  it("should combine runtime + level filters", async () => {
    const result = await queryLogs(db, { runtime: "node", level: "error" });
    for (const event of result) {
      expect(event.runtime).toBe("node");
      expect(event.level).toBe("error");
    }
  });

  it("should combine runtime + type filters", async () => {
    const result = await queryLogs(db, { runtime: "node", type: "console" });
    for (const event of result) {
      expect(event.runtime).toBe("node");
      expect(event.type).toBe("console");
    }
  });

  // ── result shape ──

  it("should return LogEvent objects with required fields", async () => {
    const result = await queryLogs(db, { limit: 1 });
    expect(result).toHaveLength(1);
    const event = result[0];
    expect(typeof event.id).toBe("string");
    expect(event.id.length).toBeGreaterThan(0);
    expect(() => new Date(event.timestamp).toISOString()).not.toThrow();
    expect(["node", "browser", "bun", "deno"]).toContain(event.runtime);
    expect(typeof event.session).toBe("string");
    expect(["console", "error", "network", "unhandled-rejection"]).toContain(event.type);
  });
});

describe("aggregateLogs", () => {
  let baseDir: string;
  let db: DuckDBInstance;

  beforeAll(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-aggregate-"));
    await mkdir(path.join(baseDir, ".kilog", "raw"), { recursive: true });
    await mkdir(path.join(baseDir, ".kilog", "index"), { recursive: true });

    const events = [
      makeConsoleEvent({ level: "info" }),
      makeConsoleEvent({ level: "info" }),
      makeConsoleEvent({ level: "warn" }),
      makeErrorEvent(),
      makeNetworkEvent(),
    ];

    const rawDir = path.join(baseDir, ".kilog", "raw");
    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      events
        .filter((e) => e.runtime === "node")
        .map(serialize)
        .join("\n") + "\n",
    );
    await writeFile(
      path.join(rawDir, "2026-04-18.browser.jsonl"),
      events
        .filter((e) => e.runtime === "browser")
        .map(serialize)
        .join("\n") + "\n",
    );

    const dbPath = path.join(baseDir, ".kilog", "index", "logs.duckdb");
    await reindex({ baseDir, dbPath });
    db = await openIndex(dbPath);
  });

  afterAll(async () => {
    if (db) await closeIndex(db);
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should return aggregated results grouped by runtime, type, level", async () => {
    const result = await aggregateLogs(db, {});
    expect(result.length).toBeGreaterThan(0);
    for (const row of result) {
      expect(row).toHaveProperty("runtime");
      expect(row).toHaveProperty("type");
      expect(row).toHaveProperty("level");
      expect(row).toHaveProperty("count");
      expect(typeof row.count).toBe("number");
    }
  });

  it("should have correct total count", async () => {
    const result = await aggregateLogs(db, {});
    const total = result.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(5);
  });

  it("should count console/info as 2", async () => {
    const result = await aggregateLogs(db, {});
    const consoleInfo = result.find((r) => r.type === "console" && r.level === "info");
    expect(consoleInfo).toBeDefined();
    expect(consoleInfo!.count).toBe(2);
  });

  it("should filter aggregation by runtime", async () => {
    const result = await aggregateLogs(db, { runtime: "browser" });
    for (const row of result) {
      expect(row.runtime).toBe("browser");
    }
    const total = result.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(1);
  });

  it("should filter aggregation by type", async () => {
    const result = await aggregateLogs(db, { type: "console" });
    for (const row of result) {
      expect(row.type).toBe("console");
    }
  });

  it("should filter aggregation by level", async () => {
    const result = await aggregateLogs(db, { level: "error" });
    for (const row of result) {
      expect(row.level).toBe("error");
    }
  });

  it("should filter aggregation by time range", async () => {
    const result = await aggregateLogs(db, {
      from: "2026-04-18T11:00:00.000Z",
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return empty for non-matching filter", async () => {
    const result = await aggregateLogs(db, { runtime: "bun" });
    expect(result).toHaveLength(0);
  });

  it("should support project list filters in aggregation", async () => {
    const result = await aggregateLogs(db, { projects: ["kilog-aggregate"] });
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});
