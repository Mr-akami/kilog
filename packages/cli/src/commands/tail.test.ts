import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, writeFile, appendFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { serialize } from "@logit/core";
import type { ConsoleEvent } from "@logit/core";
import { handleTail } from "./tail.js";

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

describe("handleTail", () => {
  let baseDir: string;
  let rawDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-cli-tail-"));
    rawDir = path.join(baseDir, ".logit", "raw");
    await mkdir(rawDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should emit new lines appended to an existing file", async () => {
    const filePath = path.join(rawDir, "2026-04-18.node.jsonl");
    await writeFile(filePath, "");

    const lines: string[] = [];
    const controller = new AbortController();

    const tailPromise = handleTail({
      root: baseDir,
      signal: controller.signal,
      onLine: (line: string) => {
        lines.push(line);
      },
    });

    // append a new event after a short delay
    await new Promise((resolve) => setTimeout(resolve, 200));
    const event = makeConsoleEvent({ message: "streamed line" });
    await appendFile(filePath, serialize(event) + "\n");

    // wait for the watcher to pick it up
    await new Promise((resolve) => setTimeout(resolve, 500));
    controller.abort();
    await tailPromise.catch(() => {});

    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines.some((l) => l.includes("streamed line"))).toBe(true);
  });

  it("should filter by --runtime when specified", async () => {
    const nodeFile = path.join(rawDir, "2026-04-18.node.jsonl");
    const browserFile = path.join(rawDir, "2026-04-18.browser.jsonl");
    await writeFile(nodeFile, "");
    await writeFile(browserFile, "");

    const lines: string[] = [];
    const controller = new AbortController();

    const tailPromise = handleTail({
      root: baseDir,
      runtime: "node",
      signal: controller.signal,
      onLine: (line: string) => {
        lines.push(line);
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    const nodeEvent = makeConsoleEvent({ message: "node event" });
    const browserEvent = makeConsoleEvent({
      message: "browser event",
      runtime: "browser",
    });
    await appendFile(nodeFile, serialize(nodeEvent) + "\n");
    await appendFile(browserFile, serialize(browserEvent) + "\n");

    await new Promise((resolve) => setTimeout(resolve, 500));
    controller.abort();
    await tailPromise.catch(() => {});

    expect(lines.some((l) => l.includes("node event"))).toBe(true);
    expect(lines.some((l) => l.includes("browser event"))).toBe(false);
  });

  it("should handle missing .logit/raw directory gracefully", async () => {
    const emptyBase = await mkdtemp(path.join(tmpdir(), "logit-cli-tail-empty-"));
    const controller = new AbortController();

    // should not throw
    const tailPromise = handleTail({
      root: emptyBase,
      signal: controller.signal,
      onLine: () => {},
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    controller.abort();
    await tailPromise.catch(() => {});

    await rm(emptyBase, { recursive: true, force: true });
  });

  it("should detect new files created in the raw directory", async () => {
    const lines: string[] = [];
    const controller = new AbortController();

    const tailPromise = handleTail({
      root: baseDir,
      signal: controller.signal,
      onLine: (line: string) => {
        lines.push(line);
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // create a new file after watching started
    const newFile = path.join(rawDir, "2026-04-19.node.jsonl");
    const event = makeConsoleEvent({ message: "new file event" });
    await writeFile(newFile, serialize(event) + "\n");

    await new Promise((resolve) => setTimeout(resolve, 500));
    controller.abort();
    await tailPromise.catch(() => {});

    expect(lines.some((l) => l.includes("new file event"))).toBe(true);
  });
});
