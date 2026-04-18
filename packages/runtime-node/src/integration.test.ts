import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRuntimeContext } from "./context.js";
import { captureConsole } from "./capture-console.js";

describe("runtime-node integration", () => {
  let baseDir: string;
  const savedLogitDir = process.env.LOGIT_DIR;
  const savedConsoleLog = console.log;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-int-"));
    process.env.LOGIT_DIR = baseDir;
  });

  afterEach(async () => {
    console.log = savedConsoleLog;
    if (savedLogitDir === undefined) {
      delete process.env.LOGIT_DIR;
    } else {
      process.env.LOGIT_DIR = savedLogitDir;
    }
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should write console events to disk through full pipeline", async () => {
    const ctx = createRuntimeContext();
    captureConsole(ctx);

    console.log("integration test message");

    const rawDir = path.join(baseDir, ".devlogs", "raw");
    await vi.waitFor(
      async () => {
        const files = await readdir(rawDir);
        expect(files.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const files = await readdir(rawDir);
    const filePath = path.join(rawDir, files[0]);
    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("integration test message");
    expect(content).toContain(ctx.session);
    expect(content).toContain('"runtime":"node"');
    expect(content).toContain('"type":"console"');
  });

  it("should attach same session to all events", async () => {
    const ctx = createRuntimeContext();
    captureConsole(ctx);

    console.log("first");
    console.log("second");

    const rawDir = path.join(baseDir, ".devlogs", "raw");
    await vi.waitFor(
      async () => {
        const files = await readdir(rawDir);
        if (files.length === 0) throw new Error("no files yet");
        const content = await readFile(path.join(rawDir, files[0]), "utf-8");
        const lines = content.trim().split("\n");
        expect(lines.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 5000 },
    );

    const files = await readdir(rawDir);
    const content = await readFile(path.join(rawDir, files[0]), "utf-8");
    const lines = content.trim().split("\n");
    const events = lines.map((line) => JSON.parse(line));
    const sessions = events.map((e: { session: string }) => e.session);

    expect(new Set(sessions).size).toBe(1);
    expect(sessions[0]).toBe(ctx.session);
  });
});
