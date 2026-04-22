import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { serialize } from "@kilog/core";
import type { ConsoleEvent } from "@kilog/core";
import { handleReindex } from "./reindex.js";

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

describe("handleReindex", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-cli-reindex-"));
    await mkdir(path.join(baseDir, ".kilog", "raw"), { recursive: true });
    await mkdir(path.join(baseDir, ".kilog", "index"), { recursive: true });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should display count of indexed events", async () => {
    const events = [
      makeConsoleEvent({ message: "one" }),
      makeConsoleEvent({ message: "two" }),
      makeConsoleEvent({ message: "three" }),
    ];
    await writeFile(
      path.join(baseDir, ".kilog", "raw", "2026-04-18.node.jsonl"),
      events.map(serialize).join("\n") + "\n",
    );

    const output = await captureStdout(() => handleReindex({ root: baseDir }));

    expect(output).toContain("3");
  });

  it("should display 0 when no jsonl files exist", async () => {
    const output = await captureStdout(() => handleReindex({ root: baseDir }));

    expect(output).toContain("0");
  });

  it("should handle multiple files", async () => {
    const rawDir = path.join(baseDir, ".kilog", "raw");
    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      [makeConsoleEvent(), makeConsoleEvent()].map(serialize).join("\n") + "\n",
    );
    await writeFile(
      path.join(rawDir, "2026-04-18.browser.jsonl"),
      [makeConsoleEvent({ runtime: "browser" })].map(serialize).join("\n") + "\n",
    );

    const output = await captureStdout(() => handleReindex({ root: baseDir }));

    expect(output).toContain("3");
  });
});
