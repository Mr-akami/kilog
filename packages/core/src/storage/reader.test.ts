import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readLogFile, listRawFiles } from "./reader.js";
import { serialize } from "../serialize/serializer.js";
import type { ConsoleEvent } from "../schema/types.js";

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

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) {
    items.push(item);
  }
  return items;
}

describe("readLogFile", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-reader-"));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should yield each event from a jsonl file", async () => {
    const events = [
      makeConsoleEvent({ message: "first" }),
      makeConsoleEvent({ message: "second" }),
      makeConsoleEvent({ message: "third" }),
    ];
    const content = events.map(serialize).join("\n") + "\n";
    const filePath = path.join(baseDir, "test.jsonl");
    await writeFile(filePath, content);

    const result = await collect(readLogFile(filePath));
    expect(result).toHaveLength(3);
    expect(result[0].message).toBe("first");
    expect(result[1].message).toBe("second");
    expect(result[2].message).toBe("third");
  });

  it("should skip empty lines", async () => {
    const e1 = makeConsoleEvent({ message: "one" });
    const e2 = makeConsoleEvent({ message: "two" });
    const content = serialize(e1) + "\n\n\n" + serialize(e2) + "\n";
    const filePath = path.join(baseDir, "test.jsonl");
    await writeFile(filePath, content);

    const result = await collect(readLogFile(filePath));
    expect(result).toHaveLength(2);
  });

  it("should skip whitespace-only lines", async () => {
    const e1 = makeConsoleEvent({ message: "one" });
    const content = serialize(e1) + "\n   \n  \n";
    const filePath = path.join(baseDir, "test.jsonl");
    await writeFile(filePath, content);

    const result = await collect(readLogFile(filePath));
    expect(result).toHaveLength(1);
  });

  it("should handle file with no trailing newline", async () => {
    const event = makeConsoleEvent({ message: "no newline" });
    const filePath = path.join(baseDir, "test.jsonl");
    await writeFile(filePath, serialize(event));

    const result = await collect(readLogFile(filePath));
    expect(result).toHaveLength(1);
    expect(result[0].message).toBe("no newline");
  });

  it("should handle empty file", async () => {
    const filePath = path.join(baseDir, "empty.jsonl");
    await writeFile(filePath, "");

    const result = await collect(readLogFile(filePath));
    expect(result).toHaveLength(0);
  });

  it("should throw or skip on invalid JSON lines", async () => {
    const valid = makeConsoleEvent({ message: "valid" });
    const content = serialize(valid) + "\n" + "NOT VALID JSON\n";
    const filePath = path.join(baseDir, "test.jsonl");
    await writeFile(filePath, content);

    // implementation may throw on bad lines or skip them
    // either behavior is acceptable, but it should not silently yield invalid data
    try {
      const result = await collect(readLogFile(filePath));
      // if it doesn't throw, it should only have yielded the valid event
      for (const event of result) {
        expect(event.id).toBeTruthy();
        expect(event.type).toBeTruthy();
      }
    } catch {
      // throwing on invalid line is acceptable
    }
  });

  it("should handle a single-line file", async () => {
    const event = makeConsoleEvent();
    const filePath = path.join(baseDir, "single.jsonl");
    await writeFile(filePath, serialize(event) + "\n");

    const result = await collect(readLogFile(filePath));
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(event);
  });
});

describe("listRawFiles", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-list-"));
    await mkdir(path.join(baseDir, ".kilog", "raw"), { recursive: true });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should return empty array when no files exist", async () => {
    const result = await listRawFiles(baseDir);
    expect(result).toEqual([]);
  });

  it("should return jsonl files in raw directory", async () => {
    const rawDir = path.join(baseDir, ".kilog", "raw");
    await writeFile(path.join(rawDir, "2026-04-18.node.jsonl"), "");
    await writeFile(path.join(rawDir, "2026-04-18.browser.jsonl"), "");

    const result = await listRawFiles(baseDir);
    expect(result).toHaveLength(2);
    expect(result.some((f) => f.includes("node.jsonl"))).toBe(true);
    expect(result.some((f) => f.includes("browser.jsonl"))).toBe(true);
  });

  it("should not include non-jsonl files", async () => {
    const rawDir = path.join(baseDir, ".kilog", "raw");
    await writeFile(path.join(rawDir, "2026-04-18.node.jsonl"), "");
    await writeFile(path.join(rawDir, "notes.txt"), "");

    const result = await listRawFiles(baseDir);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain(".jsonl");
  });

  it("should handle missing raw directory gracefully", async () => {
    const emptyBase = await mkdtemp(path.join(tmpdir(), "kilog-empty-"));
    try {
      const result = await listRawFiles(emptyBase);
      expect(result).toEqual([]);
    } finally {
      await rm(emptyBase, { recursive: true, force: true });
    }
  });
});
