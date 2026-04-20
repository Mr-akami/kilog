import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createWriter } from "./writer.js";
import { deserialize } from "../serialize/serializer.js";
import type { ConsoleEvent, LogEvent } from "../schema/types.js";

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

describe("createWriter", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-writer-"));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should create .logit/raw directory automatically", async () => {
    const writer = createWriter({ baseDir });
    const event = makeConsoleEvent();
    await writer.append(event);
    await writer.close();

    const { readdir } = await import("node:fs/promises");
    const rawDir = path.join(baseDir, ".logit", "raw");
    const files = await readdir(rawDir);
    expect(files.length).toBeGreaterThan(0);
  });

  it("should write serialized event to correct file", async () => {
    const writer = createWriter({ baseDir });
    const event = makeConsoleEvent();
    await writer.append(event);
    await writer.close();

    const filePath = path.join(baseDir, ".logit", "raw", "2026-04-18.node.jsonl");
    const content = await readFile(filePath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(deserialize(lines[0])).toEqual(event);
  });

  it("should append multiple events to the same file", async () => {
    const writer = createWriter({ baseDir });
    const e1 = makeConsoleEvent({ message: "first" });
    const e2 = makeConsoleEvent({ message: "second" });
    await writer.append(e1);
    await writer.append(e2);
    await writer.close();

    const filePath = path.join(baseDir, ".logit", "raw", "2026-04-18.node.jsonl");
    const content = await readFile(filePath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(deserialize(lines[0]).message).toBe("first");
    expect(deserialize(lines[1]).message).toBe("second");
  });

  it("should write to separate files for different runtimes", async () => {
    const writer = createWriter({ baseDir });
    const nodeEvent = makeConsoleEvent({ runtime: "node" });
    const browserEvent = makeConsoleEvent({
      runtime: "browser",
      timestamp: "2026-04-18T10:00:00.000Z",
    });
    await writer.append(nodeEvent);
    await writer.append(browserEvent);
    await writer.close();

    const { readdir } = await import("node:fs/promises");
    const rawDir = path.join(baseDir, ".logit", "raw");
    const files = await readdir(rawDir);
    expect(files).toContain("2026-04-18.node.jsonl");
    expect(files).toContain("2026-04-18.browser.jsonl");
  });

  it("should write to separate files for different dates", async () => {
    const writer = createWriter({ baseDir });
    const e1 = makeConsoleEvent({ timestamp: "2026-04-18T10:00:00.000Z" });
    const e2 = makeConsoleEvent({ timestamp: "2026-04-19T10:00:00.000Z" });
    await writer.append(e1);
    await writer.append(e2);
    await writer.close();

    const { readdir } = await import("node:fs/promises");
    const rawDir = path.join(baseDir, ".logit", "raw");
    const files = await readdir(rawDir);
    expect(files).toContain("2026-04-18.node.jsonl");
    expect(files).toContain("2026-04-19.node.jsonl");
  });

  it("should apply redactor when provided", async () => {
    const mockRedactor = (event: LogEvent): LogEvent =>
      ({
        ...event,
        message: "[REDACTED]",
      }) as LogEvent;

    const writer = createWriter({ baseDir, redactor: mockRedactor });
    const event = makeConsoleEvent({ message: "secret data" });
    await writer.append(event);
    await writer.close();

    const filePath = path.join(baseDir, ".logit", "raw", "2026-04-18.node.jsonl");
    const content = await readFile(filePath, "utf-8");
    const restored = deserialize(content.trim());
    expect(restored.message).toBe("[REDACTED]");
  });

  it("should work without redactor", async () => {
    const writer = createWriter({ baseDir });
    const event = makeConsoleEvent({ message: "no redaction" });
    await writer.append(event);
    await writer.close();

    const filePath = path.join(baseDir, ".logit", "raw", "2026-04-18.node.jsonl");
    const content = await readFile(filePath, "utf-8");
    const restored = deserialize(content.trim());
    expect(restored.message).toBe("no redaction");
  });
});
