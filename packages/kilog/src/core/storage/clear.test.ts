import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdir, mkdtemp, rm, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { clearOnce, clearProjectLogs } from "./clear.js";
import { INDEX_DIR, RAW_DIR } from "./paths.js";

describe("clearProjectLogs", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-clear-"));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("deletes all .jsonl files in raw/", async () => {
    const rawDir = path.join(baseDir, RAW_DIR);
    await mkdir(rawDir, { recursive: true });
    await writeFile(path.join(rawDir, "2026-01-01.node.jsonl"), "a\n");
    await writeFile(path.join(rawDir, "2026-01-02.browser.jsonl"), "b\n");

    const result = await clearProjectLogs(baseDir);

    expect(result.rawFilesDeleted).toBe(2);
  });

  it("leaves non-jsonl files untouched", async () => {
    const rawDir = path.join(baseDir, RAW_DIR);
    await mkdir(rawDir, { recursive: true });
    await writeFile(path.join(rawDir, "keep.txt"), "keep");
    await writeFile(path.join(rawDir, "2026-01-01.node.jsonl"), "a\n");

    const result = await clearProjectLogs(baseDir);

    expect(result.rawFilesDeleted).toBe(1);
    await stat(path.join(rawDir, "keep.txt"));
  });

  it("removes index dir recursively", async () => {
    const indexDir = path.join(baseDir, INDEX_DIR);
    await mkdir(indexDir, { recursive: true });
    await writeFile(path.join(indexDir, "logs.duckdb"), "x");

    const result = await clearProjectLogs(baseDir);

    expect(result.indexDirDeleted).toBe(true);
    await expect(stat(indexDir)).rejects.toThrow();
  });

  it("is a no-op when .kilog/ is absent", async () => {
    const result = await clearProjectLogs(baseDir);
    expect(result.rawFilesDeleted).toBe(0);
    expect(result.indexDirDeleted).toBe(false);
  });
});

describe("clearOnce", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-clearonce-"));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("runs clear the first time and skips subsequent calls for the same dir", async () => {
    const rawDir = path.join(baseDir, RAW_DIR);
    await mkdir(rawDir, { recursive: true });
    await writeFile(path.join(rawDir, "a.jsonl"), "a\n");

    const first = await clearOnce(baseDir);
    expect(first?.rawFilesDeleted).toBe(1);

    await writeFile(path.join(rawDir, "b.jsonl"), "b\n");
    const second = await clearOnce(baseDir);
    expect(second).toBeNull();

    await stat(path.join(rawDir, "b.jsonl"));
  });
});
