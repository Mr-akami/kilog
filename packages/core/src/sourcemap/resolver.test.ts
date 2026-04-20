import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveStackFrames } from "./index.js";

describe("resolveStackFrames", () => {
  let cacheDir: string;
  let sourceDir: string;

  beforeEach(async () => {
    const tmpBase = await mkdtemp(path.join(tmpdir(), "logit-sourcemap-"));
    cacheDir = path.join(tmpBase, "cache", "sourcemaps");
    sourceDir = path.join(tmpBase, "sources");
    await mkdir(cacheDir, { recursive: true });
    await mkdir(sourceDir, { recursive: true });
  });

  afterEach(async () => {
    // clean up both cache and source directories
    const parent = path.dirname(path.dirname(cacheDir));
    await rm(parent, { recursive: true, force: true });
  });

  // ── no source map available ──

  it("should return original stack when no .map files exist", async () => {
    const stack =
      "Error: boom\n  at foo (/app/dist/index.js:10:5)\n  at bar (/app/dist/util.js:20:3)";

    const resolved = await resolveStackFrames(stack, cacheDir);

    expect(resolved).toBe(stack);
  });

  // ── valid source map ──

  it("should resolve frame positions when source map exists", async () => {
    // create a minimal source map
    const sourceMap = {
      version: 3,
      sources: ["../src/index.ts"],
      names: [],
      mappings: "AAAA",
      file: "index.js",
    };
    const jsPath = path.join(sourceDir, "index.js");
    const mapPath = path.join(sourceDir, "index.js.map");

    await writeFile(jsPath, "// compiled code\n");
    await writeFile(mapPath, JSON.stringify(sourceMap));

    const stack = `Error: test\n  at foo (${jsPath}:1:1)`;
    const resolved = await resolveStackFrames(stack, cacheDir);

    // should contain the original source file reference
    expect(resolved).toContain("index.ts");
  });

  // ── inline sourceMappingURL ──

  it("should handle sourceMappingURL comment in JS file", async () => {
    const sourceMap = {
      version: 3,
      sources: ["../src/app.ts"],
      names: [],
      mappings: "AAAA",
      file: "app.js",
    };
    const jsContent = `"use strict";\nconsole.log("hello");\n//# sourceMappingURL=app.js.map\n`;
    const jsPath = path.join(sourceDir, "app.js");
    const mapPath = path.join(sourceDir, "app.js.map");

    await writeFile(jsPath, jsContent);
    await writeFile(mapPath, JSON.stringify(sourceMap));

    const stack = `Error: test\n  at main (${jsPath}:2:1)`;
    const resolved = await resolveStackFrames(stack, cacheDir);

    expect(resolved).toContain("app.ts");
  });

  // ── malformed stack ──

  it("should return original string for non-stack input", async () => {
    const input = "just a regular string with no frames";

    const resolved = await resolveStackFrames(input, cacheDir);

    expect(resolved).toBe(input);
  });

  it("should handle empty stack string", async () => {
    const resolved = await resolveStackFrames("", cacheDir);

    expect(resolved).toBe("");
  });

  // ── mixed resolvable and non-resolvable frames ──

  it("should resolve only frames with available source maps", async () => {
    const sourceMap = {
      version: 3,
      sources: ["../src/found.ts"],
      names: [],
      mappings: "AAAA",
      file: "found.js",
    };
    const jsPath = path.join(sourceDir, "found.js");
    await writeFile(jsPath, "// code\n");
    await writeFile(path.join(sourceDir, "found.js.map"), JSON.stringify(sourceMap));

    const stack = [
      "Error: mixed",
      `  at a (${jsPath}:1:1)`,
      "  at b (/nonexistent/file.js:5:3)",
    ].join("\n");

    const resolved = await resolveStackFrames(stack, cacheDir);

    expect(resolved).toContain("found.ts");
    expect(resolved).toContain("/nonexistent/file.js:5:3");
  });

  // ── multi-line mappings with delta accumulation ──

  it("should resolve with multi-line mappings using delta values", async () => {
    // mappings: line1 col0->source0:line0:col0, line2 col0->source0:line1:col0
    // "AAAA" = [0,0,0,0], "AACA" = [0,0,1,0] (delta: origLine+1)
    const sourceMap = {
      version: 3,
      sources: ["../src/multi.ts"],
      names: [],
      mappings: "AAAA;AACA",
      file: "multi.js",
    };
    const jsPath = path.join(sourceDir, "multi.js");
    await writeFile(jsPath, "line1;\nline2;\n");
    await writeFile(path.join(sourceDir, "multi.js.map"), JSON.stringify(sourceMap));

    const stack = `Error: multi\n  at fn (${jsPath}:2:1)`;
    const resolved = await resolveStackFrames(stack, cacheDir);

    expect(resolved).toContain("multi.ts:2:");
  });

  it("should resolve with multiple segments per line (comma-separated)", async () => {
    // "AAAA,GACC" = seg1[0,0,0,0], seg2[3,0,1,1] (col+=3, origLine+=1, origCol+=1)
    const sourceMap = {
      version: 3,
      sources: ["../src/segments.ts"],
      names: [],
      mappings: "AAAA,GACC",
      file: "segments.js",
    };
    const jsPath = path.join(sourceDir, "segments.js");
    await writeFile(jsPath, "var a = b;\n");
    await writeFile(path.join(sourceDir, "segments.js.map"), JSON.stringify(sourceMap));

    const stack = `Error: seg\n  at fn (${jsPath}:1:4)`;
    const resolved = await resolveStackFrames(stack, cacheDir);

    // column 4 (0-indexed: 3) matches 2nd segment, which maps to origLine 2, origCol 2
    expect(resolved).toContain("segments.ts:2:2");
  });

  // ── corrupted source map ──

  it("should handle corrupted source map file gracefully", async () => {
    const jsPath = path.join(sourceDir, "bad.js");
    await writeFile(jsPath, "// code\n");
    await writeFile(path.join(sourceDir, "bad.js.map"), "not valid json {{{");

    const stack = `Error: bad\n  at fn (${jsPath}:1:1)`;
    const resolved = await resolveStackFrames(stack, cacheDir);

    // should not throw; return original or partially resolved
    expect(resolved).toContain("Error: bad");
  });
});
