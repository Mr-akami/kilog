import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { reindex, indexFile } from "./indexer.js";
import { openIndex, closeIndex } from "./connection.js";
import { serialize } from "../serialize/serializer.js";
import type { ConsoleEvent, ErrorEvent, NetworkEvent } from "../schema/types.js";

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
    message: "boom",
    name: "Error",
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
    url: "https://api.example.com/data",
    normalizedPath: "/data",
    failed: false,
    ...overrides,
  };
}

describe("reindex", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-indexer-"));
    await mkdir(path.join(baseDir, ".devlogs", "raw"), { recursive: true });
    await mkdir(path.join(baseDir, ".devlogs", "index"), { recursive: true });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should return count 0 when no jsonl files exist", async () => {
    const dbPath = path.join(baseDir, ".devlogs", "index", "logs.duckdb");
    const result = await reindex({ baseDir, dbPath });
    expect(result.count).toBe(0);
  });

  it("should index all events from a single jsonl file", async () => {
    const events = [
      makeConsoleEvent({ message: "one" }),
      makeConsoleEvent({ message: "two" }),
      makeConsoleEvent({ message: "three" }),
    ];
    const rawDir = path.join(baseDir, ".devlogs", "raw");
    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      events.map(serialize).join("\n") + "\n",
    );

    const dbPath = path.join(baseDir, ".devlogs", "index", "logs.duckdb");
    const result = await reindex({ baseDir, dbPath });
    expect(result.count).toBe(3);
  });

  it("should index events from multiple jsonl files", async () => {
    const nodeEvents = [
      makeConsoleEvent({ message: "node-1" }),
      makeConsoleEvent({ message: "node-2" }),
    ];
    const browserEvents = [makeNetworkEvent()];
    const rawDir = path.join(baseDir, ".devlogs", "raw");
    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      nodeEvents.map(serialize).join("\n") + "\n",
    );
    await writeFile(
      path.join(rawDir, "2026-04-18.browser.jsonl"),
      browserEvents.map(serialize).join("\n") + "\n",
    );

    const dbPath = path.join(baseDir, ".devlogs", "index", "logs.duckdb");
    const result = await reindex({ baseDir, dbPath });
    expect(result.count).toBe(3);
  });

  it("should drop and recreate on reindex (idempotent)", async () => {
    const events = [makeConsoleEvent()];
    const rawDir = path.join(baseDir, ".devlogs", "raw");
    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      events.map(serialize).join("\n") + "\n",
    );

    const dbPath = path.join(baseDir, ".devlogs", "index", "logs.duckdb");
    await reindex({ baseDir, dbPath });
    const result = await reindex({ baseDir, dbPath });
    // should still be 1, not 2 (table was dropped and recreated)
    expect(result.count).toBe(1);
  });

  it("should handle mixed event types", async () => {
    const events = [makeConsoleEvent(), makeErrorEvent(), makeNetworkEvent()];
    const rawDir = path.join(baseDir, ".devlogs", "raw");
    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      events.map(serialize).join("\n") + "\n",
    );

    const dbPath = path.join(baseDir, ".devlogs", "index", "logs.duckdb");
    const result = await reindex({ baseDir, dbPath });
    expect(result.count).toBe(3);
  });

  it("should handle large batch (>1000 events)", async () => {
    const events = Array.from({ length: 1100 }, (_, i) =>
      makeConsoleEvent({ message: `event-${i}`, id: crypto.randomUUID() }),
    );
    const rawDir = path.join(baseDir, ".devlogs", "raw");
    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      events.map(serialize).join("\n") + "\n",
    );

    const dbPath = path.join(baseDir, ".devlogs", "index", "logs.duckdb");
    const result = await reindex({ baseDir, dbPath });
    expect(result.count).toBe(1100);
  });
});

describe("indexFile", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-indexfile-"));
    await mkdir(path.join(baseDir, ".devlogs", "raw"), { recursive: true });
    await mkdir(path.join(baseDir, ".devlogs", "index"), { recursive: true });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should return count of indexed events from a single file", async () => {
    const events = [makeConsoleEvent(), makeConsoleEvent()];
    const filePath = path.join(baseDir, ".devlogs", "raw", "test.jsonl");
    await writeFile(filePath, events.map(serialize).join("\n") + "\n");

    const dbPath = path.join(baseDir, ".devlogs", "index", "logs.duckdb");
    const db = await openIndex(dbPath);
    try {
      const count = await indexFile(db, filePath);
      expect(count).toBe(2);
    } finally {
      await closeIndex(db);
    }
  });

  it("should return 0 for empty file", async () => {
    const filePath = path.join(baseDir, ".devlogs", "raw", "empty.jsonl");
    await writeFile(filePath, "");

    const dbPath = path.join(baseDir, ".devlogs", "index", "logs.duckdb");
    const db = await openIndex(dbPath);
    try {
      const count = await indexFile(db, filePath);
      expect(count).toBe(0);
    } finally {
      await closeIndex(db);
    }
  });
});
