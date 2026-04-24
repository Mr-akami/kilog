import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { serialize } from "@kilog/core";
import type { ConsoleEvent } from "@kilog/core";
import { handleStats } from "./stats.js";

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

describe("handleStats", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "kilog-cli-stats-"));
    const rawDir = path.join(root, ".kilog", "raw");
    await mkdir(rawDir, { recursive: true });
    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      [
        serialize(makeConsoleEvent({ level: "info" })),
        serialize(makeConsoleEvent({ level: "error" })),
      ].join("\n") + "\n",
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("prints aggregate counts", async () => {
    const output = await captureStdout(() => handleStats({ root }));
    expect(output).toContain("runtime");
    expect(output).toContain("count");
    expect(output).toContain("console");
  });

  it("supports JSON output", async () => {
    const output = await captureStdout(() => handleStats({ root, level: "error", json: true }));
    const rows = JSON.parse(output) as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0].level).toBe("error");
  });
});
