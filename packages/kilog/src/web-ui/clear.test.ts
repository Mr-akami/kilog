import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, mkdir, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { clearAllLogs } from "./clear.js";

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

describe("clearAllLogs", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "kilog-clear-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns zeros when no .kilog/ exists", async () => {
    const result = await clearAllLogs(root);
    expect(result).toEqual({ rawFilesDeleted: 0, indexDbsDeleted: 0 });
  });

  it("deletes every JSONL in every discovered .kilog/raw/", async () => {
    const a = path.join(root, "apps", "a", ".kilog", "raw");
    const b = path.join(root, "apps", "b", ".kilog", "raw");
    await mkdir(a, { recursive: true });
    await mkdir(b, { recursive: true });
    await writeFile(path.join(a, "2026-04-20.node.jsonl"), "{}\n");
    await writeFile(path.join(a, "2026-04-21.node.jsonl"), "{}\n");
    await writeFile(path.join(b, "2026-04-20.browser.jsonl"), "{}\n");

    const result = await clearAllLogs(root);

    expect(result.rawFilesDeleted).toBe(3);
    expect(await exists(path.join(a, "2026-04-20.node.jsonl"))).toBe(false);
    expect(await exists(path.join(b, "2026-04-20.browser.jsonl"))).toBe(false);
  });

  it("removes each .kilog/index/ directory entirely", async () => {
    const kilogDir = path.join(root, "apps", "a", ".kilog");
    const indexDir = path.join(kilogDir, "index");
    const rawDir = path.join(kilogDir, "raw");
    await mkdir(indexDir, { recursive: true });
    await mkdir(rawDir, { recursive: true });
    await writeFile(path.join(indexDir, "logs.duckdb"), "fake db");
    await writeFile(path.join(indexDir, "sources-state.json"), "{}");

    const result = await clearAllLogs(root);

    expect(result.indexDbsDeleted).toBe(1);
    expect(await exists(indexDir)).toBe(false);
  });

  it("does not delete non-jsonl files in raw/", async () => {
    const rawDir = path.join(root, "apps", "a", ".kilog", "raw");
    await mkdir(rawDir, { recursive: true });
    await writeFile(path.join(rawDir, "notes.txt"), "keep me");
    await writeFile(path.join(rawDir, "2026-04-20.node.jsonl"), "{}\n");

    const result = await clearAllLogs(root);

    expect(result.rawFilesDeleted).toBe(1);
    expect(await exists(path.join(rawDir, "notes.txt"))).toBe(true);
  });

  it("leaves unrelated files outside .kilog/ untouched", async () => {
    const keeper = path.join(root, "apps", "a", "src", "file.ts");
    await mkdir(path.dirname(keeper), { recursive: true });
    await writeFile(keeper, "source");
    const rawDir = path.join(root, "apps", "a", ".kilog", "raw");
    await mkdir(rawDir, { recursive: true });
    await writeFile(path.join(rawDir, "2026-04-20.node.jsonl"), "{}\n");

    await clearAllLogs(root);

    expect(await exists(keeper)).toBe(true);
  });
});
