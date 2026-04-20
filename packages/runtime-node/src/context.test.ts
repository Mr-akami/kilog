import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRuntimeContext, createBaseFields } from "./context.js";
import type { ConsoleEvent } from "@logit/core";
import { createMockContext } from "./testing.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("createRuntimeContext", () => {
  let dir: string;
  const savedLogitDir = process.env.LOGIT_DIR;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "logit-ctx-"));
    process.env.LOGIT_DIR = dir;
  });

  afterEach(async () => {
    if (savedLogitDir === undefined) {
      delete process.env.LOGIT_DIR;
    } else {
      process.env.LOGIT_DIR = savedLogitDir;
    }
    await rm(dir, { recursive: true, force: true });
  });

  it("should return session as UUID", () => {
    const ctx = createRuntimeContext();
    expect(ctx.session).toMatch(UUID_RE);
  });

  it("should generate unique session per call", () => {
    const a = createRuntimeContext();
    const b = createRuntimeContext();
    expect(a.session).not.toBe(b.session);
  });

  it("should return writer with append and close methods", () => {
    const ctx = createRuntimeContext();
    expect(typeof ctx.writer.append).toBe("function");
    expect(typeof ctx.writer.close).toBe("function");
  });

  it("should write events to LOGIT_DIR base directory", async () => {
    const ctx = createRuntimeContext();
    const event: ConsoleEvent = {
      id: crypto.randomUUID(),
      timestamp: "2026-04-18T10:00:00.000Z",
      runtime: "node",
      session: ctx.session,
      type: "console",
      level: "info",
      message: "test",
    };
    await ctx.writer.append(event);
    await ctx.writer.close();

    const rawDir = path.join(dir, ".logit", "raw");
    const files = await readdir(rawDir);
    expect(files).toContain("2026-04-18.node.jsonl");
  });
});

describe("createBaseFields", () => {
  it("should return id as UUID", () => {
    const { ctx } = createMockContext();
    const fields = createBaseFields(ctx);
    expect(fields.id).toMatch(UUID_RE);
  });

  it("should return ISO timestamp", () => {
    const { ctx } = createMockContext();
    const fields = createBaseFields(ctx);
    expect(fields.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should set runtime to node", () => {
    const { ctx } = createMockContext();
    const fields = createBaseFields(ctx);
    expect(fields.runtime).toBe("node");
  });

  it("should use session from context", () => {
    const { ctx } = createMockContext();
    const fields = createBaseFields(ctx);
    expect(fields.session).toBe("test-session");
  });

  it("should generate unique id per call", () => {
    const { ctx } = createMockContext();
    const a = createBaseFields(ctx);
    const b = createBaseFields(ctx);
    expect(a.id).not.toBe(b.id);
  });
});
