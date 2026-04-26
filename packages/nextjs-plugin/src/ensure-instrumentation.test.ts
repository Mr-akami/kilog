import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm } from "node:fs/promises";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ensureInstrumentation } from "./ensure-instrumentation.js";

describe("ensureInstrumentation", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "kilog-ensure-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("creates both instrumentation files when absent", () => {
    const { conflicts } = ensureInstrumentation(root);
    expect(conflicts).toEqual([]);
    expect(existsSync(path.join(root, "instrumentation.ts"))).toBe(true);
    expect(existsSync(path.join(root, "instrumentation-client.ts"))).toBe(true);
  });

  it("warns and bails when user has unmanaged instrumentation.ts", () => {
    const target = path.join(root, "instrumentation.ts");
    writeFileSync(target, "// my own code\nexport function register() {}\n");

    const { conflicts } = ensureInstrumentation(root);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toContain("instrumentation.ts");
    expect(conflicts[0]).toContain("registerServer");
    // user file is untouched
    expect(readFileSync(target, "utf8")).toBe("// my own code\nexport function register() {}\n");
  });

  it("warns for unmanaged instrumentation-client at any supported extension", () => {
    writeFileSync(path.join(root, "instrumentation-client.tsx"), "export {};\n");
    const { conflicts } = ensureInstrumentation(root);
    expect(conflicts.some((c) => c.includes("instrumentation-client.tsx"))).toBe(true);
  });

  it("rewrites managed files when content drifts", () => {
    const target = path.join(root, "instrumentation.ts");
    ensureInstrumentation(root);
    const original = readFileSync(target, "utf8");
    // Simulate drift on a file we own (managed header preserved).
    writeFileSync(target, original + "// drifted\n");

    const { conflicts } = ensureInstrumentation(root);
    expect(conflicts).toEqual([]);
    expect(readFileSync(target, "utf8")).toBe(original);
  });

  it("is idempotent — second run with managed files unchanged is a no-op", () => {
    ensureInstrumentation(root);
    const before = readFileSync(path.join(root, "instrumentation.ts"), "utf8");
    ensureInstrumentation(root);
    const after = readFileSync(path.join(root, "instrumentation.ts"), "utf8");
    expect(after).toBe(before);
  });
});
