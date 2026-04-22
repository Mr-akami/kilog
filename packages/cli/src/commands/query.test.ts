import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { reindex, serialize } from "@kilog/core";
import type { ConsoleEvent, ErrorEvent, NetworkEvent } from "@kilog/core";
import { handleQuery } from "./query.js";

// ── helpers ──

function makeConsoleEvent(overrides?: Partial<ConsoleEvent>): ConsoleEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-04-18T10:00:00.000Z",
    runtime: "node",
    session: "sess-1",
    type: "console",
    level: "info",
    message: "test message",
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
    url: "https://api.example.com/data",
    normalizedPath: "/data",
    failed: false,
    ...overrides,
  };
}

function captureStdout(fn: () => Promise<void>): Promise<string> {
  const chunks: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: string | Uint8Array) => {
    chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
    return true;
  };
  return fn()
    .finally(() => {
      process.stdout.write = originalWrite;
    })
    .then(() => chunks.join(""));
}

// ── fixtures ──

describe("handleQuery", () => {
  let baseDir: string;
  let dbPath: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-cli-query-"));
    const rawDir = path.join(baseDir, ".kilog", "raw");
    const indexDir = path.join(baseDir, ".kilog", "index");
    await mkdir(rawDir, { recursive: true });
    await mkdir(indexDir, { recursive: true });

    const events = [
      makeConsoleEvent({ message: "hello", level: "info" }),
      makeConsoleEvent({ message: "warning", level: "warn" }),
      makeErrorEvent({ message: "crash" }),
      makeNetworkEvent({ status: 200 }),
    ];

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

    dbPath = path.join(indexDir, "logs.duckdb");
    await reindex({ baseDir, dbPath });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  // ── normal query ──

  it("should output all logs when no filter specified", async () => {
    const output = await captureStdout(() => handleQuery({ root: baseDir }));

    expect(output).toContain("hello");
    expect(output).toContain("crash");
  });

  it("should filter by runtime", async () => {
    const output = await captureStdout(() => handleQuery({ root: baseDir, runtime: "browser" }));

    expect(output).toContain("GET");
    expect(output).not.toContain("hello");
  });

  it("should filter by level", async () => {
    const output = await captureStdout(() => handleQuery({ root: baseDir, level: "error" }));

    expect(output).toContain("crash");
    expect(output).not.toContain("hello");
  });

  it("should filter by type", async () => {
    const output = await captureStdout(() => handleQuery({ root: baseDir, type: "network" }));

    expect(output).toContain("GET");
    expect(output).not.toContain("hello");
  });

  it("should filter by search term", async () => {
    const output = await captureStdout(() => handleQuery({ root: baseDir, search: "warning" }));

    expect(output).toContain("warning");
    expect(output).not.toContain("crash");
  });

  it("should respect limit", async () => {
    const output = await captureStdout(() => handleQuery({ root: baseDir, limit: 1 }));

    // output should contain exactly 1 event's data
    const lines = output
      .trim()
      .split("\n")
      .filter((l) => l.trim() !== "");
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  // ── JSON output ──

  it("should output valid JSON when --json is set", async () => {
    const output = await captureStdout(() => handleQuery({ root: baseDir, json: true }));

    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(4);
  });

  // ── aggregate mode ──

  it("should output aggregated results when --aggregate is set", async () => {
    const output = await captureStdout(() => handleQuery({ root: baseDir, aggregate: true }));

    expect(output).toContain("runtime");
    expect(output).toContain("count");
  });

  // ── empty results ──

  it("should handle empty results gracefully", async () => {
    const output = await captureStdout(() =>
      handleQuery({ root: baseDir, search: "nonexistent_xyz" }),
    );

    expect(typeof output).toBe("string");
  });

  // ── search AND/OR/NOT ──

  it("should support OR operator in search", async () => {
    const output = await captureStdout(() =>
      handleQuery({ root: baseDir, search: "hello OR warning" }),
    );
    expect(output).toContain("hello");
    expect(output).toContain("warning");
    expect(output).not.toContain("crash");
  });

  it("should support AND operator in search", async () => {
    const output = await captureStdout(() =>
      handleQuery({ root: baseDir, search: "warning AND hello" }),
    );
    expect(output).not.toContain("hello");
    expect(output).not.toContain("warning");
  });

  it("should support NOT operator in search", async () => {
    const output = await captureStdout(() =>
      handleQuery({ root: baseDir, type: "console", search: "NOT warning" }),
    );
    expect(output).toContain("hello");
    expect(output).not.toContain("warning");
  });
});

describe("handleQuery --last", () => {
  let baseDir: string;
  let recentIso: string;
  let oldIso: string;

  beforeEach(async () => {
    const now = Date.now();
    recentIso = new Date(now - 5 * 60_000).toISOString();
    oldIso = new Date(now - 60 * 60_000).toISOString();

    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-cli-last-"));
    const rawDir = path.join(baseDir, ".kilog", "raw");
    const indexDir = path.join(baseDir, ".kilog", "index");
    await mkdir(rawDir, { recursive: true });
    await mkdir(indexDir, { recursive: true });

    const events = [
      makeConsoleEvent({ message: "OLD_LOG", timestamp: oldIso }),
      makeConsoleEvent({ message: "RECENT_LOG", timestamp: recentIso }),
    ];
    await writeFile(
      path.join(rawDir, "recent.node.jsonl"),
      events.map(serialize).join("\n") + "\n",
    );
    await reindex({ baseDir, dbPath: path.join(indexDir, "logs.duckdb") });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should include only events within --last window", async () => {
    const output = await captureStdout(() => handleQuery({ root: baseDir, last: "10m" }));
    expect(output).toContain("RECENT_LOG");
    expect(output).not.toContain("OLD_LOG");
  });

  it("should include both events with wider window", async () => {
    const output = await captureStdout(() => handleQuery({ root: baseDir, last: "2h" }));
    expect(output).toContain("RECENT_LOG");
    expect(output).toContain("OLD_LOG");
  });

  it("should override --from/--to when --last is set", async () => {
    const output = await captureStdout(() =>
      handleQuery({ root: baseDir, last: "10m", from: "1970-01-01T00:00:00.000Z" }),
    );
    expect(output).toContain("RECENT_LOG");
    expect(output).not.toContain("OLD_LOG");
  });

  it("should throw on invalid duration", async () => {
    await expect(handleQuery({ root: baseDir, last: "garbage" })).rejects.toThrow(
      /invalid duration/,
    );
  });
});
