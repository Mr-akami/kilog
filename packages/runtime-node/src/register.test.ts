import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

describe("register", () => {
  let baseDir: string;
  const savedLogitDir = process.env.LOGIT_DIR;
  const origConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  const origFetch = globalThis.fetch;
  let exitCountBefore: number;
  let errorCountBefore: number;
  let rejectionCountBefore: number;

  beforeAll(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-reg-"));
    process.env.LOGIT_DIR = baseDir;
    exitCountBefore = process.listenerCount("exit");
    errorCountBefore = process.listenerCount("uncaughtException");
    rejectionCountBefore = process.listenerCount("unhandledRejection");

    await import("./register.js");
  });

  afterAll(async () => {
    console.log = origConsole.log;
    console.info = origConsole.info;
    console.warn = origConsole.warn;
    console.error = origConsole.error;
    console.debug = origConsole.debug;
    globalThis.fetch = origFetch;
    if (savedLogitDir === undefined) {
      delete process.env.LOGIT_DIR;
    } else {
      process.env.LOGIT_DIR = savedLogitDir;
    }
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should wrap all console methods", () => {
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      expect(console[method]).not.toBe(origConsole[method]);
    }
  });

  it("should wrap globalThis.fetch", () => {
    expect(globalThis.fetch).not.toBe(origFetch);
  });

  it("should register uncaughtException listener", () => {
    expect(process.listenerCount("uncaughtException")).toBeGreaterThan(
      errorCountBefore,
    );
  });

  it("should register unhandledRejection listener", () => {
    expect(process.listenerCount("unhandledRejection")).toBeGreaterThan(
      rejectionCountBefore,
    );
  });

  it("should register exit listener for graceful shutdown", () => {
    expect(process.listenerCount("exit")).toBeGreaterThan(exitCountBefore);
  });
});
