import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { appendFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { reindex, serialize } from "@kilog/core";
import type { ConsoleEvent, NetworkEvent } from "@kilog/core";
import { handleLogs } from "./logs.js";

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

describe("handleLogs", () => {
  let baseDir: string;
  let rawDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-cli-logs-"));
    rawDir = path.join(baseDir, ".kilog", "raw");
    await mkdir(rawDir, { recursive: true });
    await mkdir(path.join(baseDir, ".kilog", "index"), { recursive: true });

    const events = [
      makeConsoleEvent({ message: "old", timestamp: "2026-04-18T08:00:00.000Z" }),
      makeConsoleEvent({ message: "hello", timestamp: "2026-04-18T10:00:00.000Z" }),
      makeConsoleEvent({
        message: "warning",
        level: "warn",
        timestamp: "2026-04-18T11:00:00.000Z",
      }),
      makeNetworkEvent({ timestamp: "2026-04-18T12:00:00.000Z" }),
    ];

    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      events
        .filter((event) => event.runtime === "node")
        .map(serialize)
        .join("\n") + "\n",
    );
    await writeFile(
      path.join(rawDir, "2026-04-18.browser.jsonl"),
      events
        .filter((event) => event.runtime === "browser")
        .map(serialize)
        .join("\n") + "\n",
    );
    await reindex({
      baseDir,
      dbPath: path.join(baseDir, ".kilog", "index", "logs.duckdb"),
      project: path.basename(baseDir),
    });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("prints logs in chronological order", async () => {
    const output = await captureStdout(() => handleLogs({ root: baseDir }));
    expect(output.indexOf("old")).toBeLessThan(output.indexOf("hello"));
    expect(output).toContain("warning");
  });

  it("filters by runtime and level", async () => {
    const output = await captureStdout(() =>
      handleLogs({ root: baseDir, runtime: "node", level: "warn" }),
    );
    expect(output).toContain("warning");
    expect(output).not.toContain("hello");
    expect(output).not.toContain("GET");
  });

  it("filters by project label", async () => {
    const output = await captureStdout(() =>
      handleLogs({ root: baseDir, project: path.basename(baseDir), tail: 1 }),
    );
    expect(output).toContain("GET");
  });

  it("filters by multiple project labels", async () => {
    const monoRoot = await mkdtemp(path.join(tmpdir(), "kilog-cli-logs-multi-"));
    try {
      for (const [name, message] of [
        ["app-a", "from-a"],
        ["app-b", "from-b"],
      ] as const) {
        const appDir = path.join(monoRoot, name);
        const appRawDir = path.join(appDir, ".kilog", "raw");
        await mkdir(appRawDir, { recursive: true });
        await mkdir(path.join(appDir, ".kilog", "index"), { recursive: true });
        await writeFile(
          path.join(appRawDir, "2026-04-18.node.jsonl"),
          serialize(makeConsoleEvent({ message })) + "\n",
        );
        await reindex({
          baseDir: appDir,
          dbPath: path.join(appDir, ".kilog", "index", "logs.duckdb"),
          project: name,
        });
      }

      const output = await captureStdout(() =>
        handleLogs({ root: monoRoot, projects: ["app-a", "app-b"] }),
      );
      expect(output).toContain("from-a");
      expect(output).toContain("from-b");
    } finally {
      await rm(monoRoot, { recursive: true, force: true });
    }
  });

  it("supports --since and --tail", async () => {
    const output = await captureStdout(() =>
      handleLogs({ root: baseDir, since: "2026-04-18T09:00:00.000Z", tail: 1 }),
    );
    expect(output).toContain("GET");
    expect(output).not.toContain("warning");
    expect(output).not.toContain("old");
  });

  it("emits NDJSON for --json backfill", async () => {
    const output = await captureStdout(() => handleLogs({ root: baseDir, json: true, tail: 2 }));
    const lines = output
      .trim()
      .split("\n")
      .filter((line) => line.trim() !== "");

    expect(lines).toHaveLength(2);
    const events = lines.map((line) => JSON.parse(line) as { timestamp: string; type: string });
    expect(events[0].timestamp <= events[1].timestamp).toBe(true);
    expect(events[1].type).toBe("network");
  });

  it("can omit timestamps", async () => {
    const output = await captureStdout(() => handleLogs({ root: baseDir, tail: 1, timestamps: false }));
    expect(output).not.toContain("2026-04-18T");
  });

  it("backfills then follows appended events", async () => {
    const lines: string[] = [];
    const controller = new AbortController();
    const promise = handleLogs({
      root: baseDir,
      follow: true,
      tail: 1,
      signal: controller.signal,
      onLine: (line) => lines.push(line),
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    await appendFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      serialize(makeConsoleEvent({ message: "streamed", timestamp: "2026-04-18T13:00:00.000Z" })) +
        "\n",
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    controller.abort();
    await promise;

    expect(lines.some((line) => line.includes("GET"))).toBe(true);
    expect(lines.some((line) => line.includes("streamed"))).toBe(true);
  });

  it("keeps NDJSON shape while following with --json", async () => {
    const lines: string[] = [];
    const controller = new AbortController();
    const promise = handleLogs({
      root: baseDir,
      follow: true,
      tail: 1,
      json: true,
      signal: controller.signal,
      onLine: (line) => lines.push(line),
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    await appendFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      serialize(
        makeConsoleEvent({
          message: "streamed-json",
          level: "error",
          timestamp: "2026-04-18T13:00:00.000Z",
        }),
      ) + "\n",
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    controller.abort();
    await promise;

    expect(lines).toHaveLength(2);
    const events = lines.map((line) => JSON.parse(line) as { message?: string; type: string });
    expect(events[0].type).toBe("network");
    expect(events[1].message).toBe("streamed-json");
  });

  it("exits immediately when no .kilog sources are found, even with --follow", async () => {
    const emptyRoot = await mkdtemp(path.join(tmpdir(), "kilog-cli-logs-empty-"));
    try {
      await expect(handleLogs({ root: emptyRoot, follow: true })).resolves.toBeUndefined();
    } finally {
      await rm(emptyRoot, { recursive: true, force: true });
    }
  });
});
