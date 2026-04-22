import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getCachedResolution, setCachedResolution } from "./cache.js";

describe("sourcemap cache", () => {
  let cacheDir: string;

  beforeEach(async () => {
    cacheDir = await mkdtemp(path.join(tmpdir(), "kilog-smcache-"));
  });

  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true });
  });

  // ── cache miss ──

  it("should return null on cache miss", async () => {
    const result = await getCachedResolution(cacheDir, "nonexistent-key");

    expect(result).toBeNull();
  });

  // ── cache write + read ──

  it("should store and retrieve resolved stack", async () => {
    const key = "abc123";
    const resolved = "Error: test\n  at foo (src/index.ts:10:5)";

    await setCachedResolution(cacheDir, key, resolved);
    const result = await getCachedResolution(cacheDir, key);

    expect(result).toBe(resolved);
  });

  // ── cache file creation ──

  it("should create a cache file in the cache directory", async () => {
    await setCachedResolution(cacheDir, "test-key", "resolved stack");

    const files = await readdir(cacheDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/\.json$/);
  });

  // ── cache content format ──

  it("should store cache as valid JSON", async () => {
    await setCachedResolution(cacheDir, "json-key", "resolved data");

    const files = await readdir(cacheDir);
    const content = await readFile(path.join(cacheDir, files[0]), "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed).toHaveProperty("resolved");
    expect(parsed.resolved).toBe("resolved data");
  });

  // ── different keys ──

  it("should not collide between different keys", async () => {
    await setCachedResolution(cacheDir, "key-a", "stack A");
    await setCachedResolution(cacheDir, "key-b", "stack B");

    const resultA = await getCachedResolution(cacheDir, "key-a");
    const resultB = await getCachedResolution(cacheDir, "key-b");

    expect(resultA).toBe("stack A");
    expect(resultB).toBe("stack B");
  });

  // ── overwrite ──

  it("should overwrite existing cache for same key", async () => {
    await setCachedResolution(cacheDir, "key-1", "old value");
    await setCachedResolution(cacheDir, "key-1", "new value");

    const result = await getCachedResolution(cacheDir, "key-1");
    expect(result).toBe("new value");
  });

  // ── missing cache directory ──

  it("should create cache directory if it does not exist", async () => {
    const nested = path.join(cacheDir, "deep", "nested");

    await setCachedResolution(nested, "key", "value");
    const result = await getCachedResolution(nested, "key");

    expect(result).toBe("value");
  });

  // ── special characters in resolved content ──

  it("should handle multi-line stack traces with special chars", async () => {
    const stack =
      'Error: "quotes" & <tags>\n  at foo (file:///path/to/file.ts:10:5)\n  at bar (C:\\Users\\test\\app.js:20:3)';

    await setCachedResolution(cacheDir, "special", stack);
    const result = await getCachedResolution(cacheDir, "special");

    expect(result).toBe(stack);
  });
});
