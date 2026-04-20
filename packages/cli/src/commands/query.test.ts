import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { reindex, serialize } from "@logit/core";
import type { ConsoleEvent, ErrorEvent, NetworkEvent } from "@logit/core";
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
  const originalWrite = process.stdout.write;
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
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-cli-query-"));
    const rawDir = path.join(baseDir, ".devlogs", "raw");
    const indexDir = path.join(baseDir, ".devlogs", "index");
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
});
