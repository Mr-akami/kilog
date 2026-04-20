import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, writeFile, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { serialize } from "@logit/core";
import type { ConsoleEvent } from "@logit/core";
import { handlePrune } from "./prune.js";

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

describe("handlePrune", () => {
  let baseDir: string;
  let rawDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-cli-prune-"));
    rawDir = path.join(baseDir, ".logit", "raw");
    await mkdir(rawDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  // ── normal deletion ──

  it("should delete files older than --before date", async () => {
    const oldEvent = makeConsoleEvent({ timestamp: "2026-04-10T10:00:00.000Z" });
    const newEvent = makeConsoleEvent({ timestamp: "2026-04-18T10:00:00.000Z" });

    await writeFile(path.join(rawDir, "2026-04-10.node.jsonl"), serialize(oldEvent) + "\n");
    await writeFile(path.join(rawDir, "2026-04-18.node.jsonl"), serialize(newEvent) + "\n");

    await handlePrune({ root: baseDir, before: "2026-04-15" });

    const remaining = await readdir(rawDir);
    expect(remaining).toContain("2026-04-18.node.jsonl");
    expect(remaining).not.toContain("2026-04-10.node.jsonl");
  });

  it("should delete files matching the exact --before date", async () => {
    await writeFile(
      path.join(rawDir, "2026-04-15.node.jsonl"),
      serialize(makeConsoleEvent()) + "\n",
    );
    await writeFile(
      path.join(rawDir, "2026-04-16.node.jsonl"),
      serialize(makeConsoleEvent()) + "\n",
    );

    await handlePrune({ root: baseDir, before: "2026-04-15" });

    const remaining = await readdir(rawDir);
    expect(remaining).not.toContain("2026-04-15.node.jsonl");
    expect(remaining).toContain("2026-04-16.node.jsonl");
  });

  it("should display count of deleted files", async () => {
    await writeFile(
      path.join(rawDir, "2026-04-01.node.jsonl"),
      serialize(makeConsoleEvent()) + "\n",
    );
    await writeFile(
      path.join(rawDir, "2026-04-02.browser.jsonl"),
      serialize(makeConsoleEvent({ runtime: "browser" })) + "\n",
    );

    const output = await captureStdout(() => handlePrune({ root: baseDir, before: "2026-04-10" }));

    expect(output).toContain("2");
  });

  it("should recommend reindex after deletion", async () => {
    await writeFile(
      path.join(rawDir, "2026-04-01.node.jsonl"),
      serialize(makeConsoleEvent()) + "\n",
    );

    const output = await captureStdout(() => handlePrune({ root: baseDir, before: "2026-04-10" }));

    expect(output).toContain("reindex");
  });

  // ── no files to delete ──

  it("should handle case when no files match --before date", async () => {
    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      serialize(makeConsoleEvent()) + "\n",
    );

    const output = await captureStdout(() => handlePrune({ root: baseDir, before: "2026-04-01" }));

    const remaining = await readdir(rawDir);
    expect(remaining).toHaveLength(1);
    expect(output).toContain("0");
  });

  // ── empty directory ──

  it("should handle empty raw directory", async () => {
    const output = await captureStdout(() => handlePrune({ root: baseDir, before: "2026-04-18" }));

    expect(output).toContain("0");
  });

  // ── missing directory ──

  it("should handle missing .logit/raw directory", async () => {
    const emptyBase = await mkdtemp(path.join(tmpdir(), "logit-cli-prune-empty-"));

    await expect(handlePrune({ root: emptyBase, before: "2026-04-18" })).resolves.not.toThrow();

    await rm(emptyBase, { recursive: true, force: true });
  });

  // ── multiple runtimes on same date ──

  it("should delete all runtime files for a date", async () => {
    await writeFile(
      path.join(rawDir, "2026-04-01.node.jsonl"),
      serialize(makeConsoleEvent()) + "\n",
    );
    await writeFile(
      path.join(rawDir, "2026-04-01.browser.jsonl"),
      serialize(makeConsoleEvent({ runtime: "browser" })) + "\n",
    );

    await handlePrune({ root: baseDir, before: "2026-04-10" });

    const remaining = await readdir(rawDir);
    expect(remaining).toHaveLength(0);
  });
});
