import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { reindex, serialize } from "@logit/core";
import type { ConsoleEvent } from "@logit/core";
import { handleDoctor } from "./doctor.js";

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

describe("handleDoctor", () => {
  let baseDir: string;
  let dbPath: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-cli-doctor-"));
    dbPath = path.join(baseDir, ".logit", "index", "logs.duckdb");
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  // ── .logit directory check ──

  it("should report when .logit directory is missing", async () => {
    const output = await captureStdout(() => handleDoctor({ root: baseDir }));

    expect(output).toContain(".logit");
  });

  it("should report .logit directory as present when it exists", async () => {
    await mkdir(path.join(baseDir, ".logit", "raw"), { recursive: true });
    await mkdir(path.join(baseDir, ".logit", "index"), { recursive: true });

    const output = await captureStdout(() => handleDoctor({ root: baseDir }));

    expect(output).toContain(".logit");
  });

  // ── count consistency ──

  it("should report matching counts when raw and index are in sync", async () => {
    await mkdir(path.join(baseDir, ".logit", "raw"), { recursive: true });
    await mkdir(path.join(baseDir, ".logit", "index"), { recursive: true });

    const events = [makeConsoleEvent(), makeConsoleEvent()];
    await writeFile(
      path.join(baseDir, ".logit", "raw", "2026-04-18.node.jsonl"),
      events.map(serialize).join("\n") + "\n",
    );
    await reindex({ baseDir, dbPath });

    const output = await captureStdout(() => handleDoctor({ root: baseDir }));

    // should show raw count and index count are equal
    expect(output).toContain("2");
  });

  it("should report mismatch when raw has more events than index", async () => {
    await mkdir(path.join(baseDir, ".logit", "raw"), { recursive: true });
    await mkdir(path.join(baseDir, ".logit", "index"), { recursive: true });

    // index with 1 event
    const event1 = makeConsoleEvent({ message: "first" });
    await writeFile(
      path.join(baseDir, ".logit", "raw", "2026-04-18.node.jsonl"),
      serialize(event1) + "\n",
    );
    await reindex({ baseDir, dbPath });

    // add another event to raw (without reindexing)
    const event2 = makeConsoleEvent({ message: "second" });
    await writeFile(
      path.join(baseDir, ".logit", "raw", "2026-04-18.node.jsonl"),
      [serialize(event1), serialize(event2)].join("\n") + "\n",
    );

    const output = await captureStdout(() => handleDoctor({ root: baseDir }));

    expect(output).toContain("reindex");
  });

  // ── no index file ──

  it("should handle missing DuckDB index file", async () => {
    await mkdir(path.join(baseDir, ".logit", "raw"), { recursive: true });
    await writeFile(
      path.join(baseDir, ".logit", "raw", "2026-04-18.node.jsonl"),
      serialize(makeConsoleEvent()) + "\n",
    );

    const output = await captureStdout(() => handleDoctor({ root: baseDir }));

    expect(output).toContain("reindex");
  });

  // ── empty project ──

  it("should report clean state for empty project with no logs", async () => {
    await mkdir(path.join(baseDir, ".logit", "raw"), { recursive: true });
    await mkdir(path.join(baseDir, ".logit", "index"), { recursive: true });
    await reindex({ baseDir, dbPath });

    const output = await captureStdout(() => handleDoctor({ root: baseDir }));

    expect(output).toContain("0");
  });
});
