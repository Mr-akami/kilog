import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createLogitMiddleware } from "./server-middleware.js";

function createReq(method: string, url: string, body: string): IncomingMessage {
  const stream = Readable.from([body]);
  return Object.assign(stream, {
    method,
    url,
    headers: { "content-type": "application/json" },
  }) as unknown as IncomingMessage;
}

function createRes(): { res: ServerResponse; endPromise: Promise<void> } {
  let resolveEnd: () => void;
  const endPromise = new Promise<void>((r) => {
    resolveEnd = r;
  });
  const res = {
    statusCode: 200,
    setHeader: vi.fn(),
    end: vi.fn(() => resolveEnd()),
  } as unknown as ServerResponse;
  return { res, endPromise };
}

describe("createLogitMiddleware", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-mw-"));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should pass through non-POST requests", async () => {
    const middleware = createLogitMiddleware(baseDir);
    const req = createReq("GET", "/__logit", "");
    const { res } = createRes();
    const next = vi.fn();

    middleware(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());
  });

  it("should pass through requests to non-/__logit paths", async () => {
    const middleware = createLogitMiddleware(baseDir);
    const req = createReq("POST", "/api/data", "{}");
    const { res } = createRes();
    const next = vi.fn();

    middleware(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());
  });

  it("should return 200 on valid POST /__logit", async () => {
    const middleware = createLogitMiddleware(baseDir);
    const events = [
      {
        id: crypto.randomUUID(),
        timestamp: "2026-04-18T10:00:00.000Z",
        runtime: "browser",
        session: "browser-sess",
        type: "console",
        level: "info",
        message: "hello from browser",
      },
    ];
    const req = createReq("POST", "/__logit", JSON.stringify(events));
    const { res, endPromise } = createRes();

    middleware(req, res, vi.fn());
    await endPromise;

    expect(res.statusCode).toBe(200);
  });

  it("should write received events to disk", async () => {
    const middleware = createLogitMiddleware(baseDir);
    const events = [
      {
        id: crypto.randomUUID(),
        timestamp: "2026-04-18T10:00:00.000Z",
        runtime: "browser",
        session: "browser-sess",
        type: "console",
        level: "info",
        message: "browser log entry",
      },
    ];
    const req = createReq("POST", "/__logit", JSON.stringify(events));
    const { res, endPromise } = createRes();

    middleware(req, res, vi.fn());
    await endPromise;

    const filePath = path.join(baseDir, ".devlogs", "raw", "2026-04-18.browser.jsonl");
    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("browser log entry");
  });

  it("should write multiple events from single request", async () => {
    const middleware = createLogitMiddleware(baseDir);
    const events = [
      {
        id: crypto.randomUUID(),
        timestamp: "2026-04-18T10:00:00.000Z",
        runtime: "browser",
        session: "browser-sess",
        type: "console",
        level: "info",
        message: "first",
      },
      {
        id: crypto.randomUUID(),
        timestamp: "2026-04-18T10:00:01.000Z",
        runtime: "browser",
        session: "browser-sess",
        type: "console",
        level: "warn",
        message: "second",
      },
    ];
    const req = createReq("POST", "/__logit", JSON.stringify(events));
    const { res, endPromise } = createRes();

    middleware(req, res, vi.fn());
    await endPromise;

    const filePath = path.join(baseDir, ".devlogs", "raw", "2026-04-18.browser.jsonl");
    const content = await readFile(filePath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(content).toContain("first");
    expect(content).toContain("second");
  });

  it("should return 400 on invalid JSON body", async () => {
    const middleware = createLogitMiddleware(baseDir);
    const req = createReq("POST", "/__logit", "not valid json{{{");
    const { res, endPromise } = createRes();

    middleware(req, res, vi.fn());
    await endPromise;

    expect(res.statusCode).toBe(400);
  });
});
