import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createKilogMiddleware } from "./server-middleware.js";

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

describe("createKilogMiddleware", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-mw-"));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should pass through non-POST requests", async () => {
    const middleware = createKilogMiddleware(baseDir);
    const req = createReq("GET", "/__kilog", "");
    const { res } = createRes();
    const next = vi.fn();

    middleware(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());
  });

  it("should pass through requests to non-/__kilog paths", async () => {
    const middleware = createKilogMiddleware(baseDir);
    const req = createReq("POST", "/api/data", "{}");
    const { res } = createRes();
    const next = vi.fn();

    middleware(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());
  });

  it("should return 200 on valid POST /__kilog", async () => {
    const middleware = createKilogMiddleware(baseDir);
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
    const req = createReq("POST", "/__kilog", JSON.stringify(events));
    const { res, endPromise } = createRes();

    middleware(req, res, vi.fn());
    await endPromise;

    expect(res.statusCode).toBe(200);
  });

  it("should write received events to disk", async () => {
    const middleware = createKilogMiddleware(baseDir);
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
    const req = createReq("POST", "/__kilog", JSON.stringify(events));
    const { res, endPromise } = createRes();

    middleware(req, res, vi.fn());
    await endPromise;

    const filePath = path.join(baseDir, ".kilog", "raw", "2026-04-18.browser.jsonl");
    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("browser log entry");
  });

  it("should write multiple events from single request", async () => {
    const middleware = createKilogMiddleware(baseDir);
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
    const req = createReq("POST", "/__kilog", JSON.stringify(events));
    const { res, endPromise } = createRes();

    middleware(req, res, vi.fn());
    await endPromise;

    const filePath = path.join(baseDir, ".kilog", "raw", "2026-04-18.browser.jsonl");
    const content = await readFile(filePath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(content).toContain("first");
    expect(content).toContain("second");
  });

  it("should return 400 on invalid JSON body", async () => {
    const middleware = createKilogMiddleware(baseDir);
    const req = createReq("POST", "/__kilog", "not valid json{{{");
    const { res, endPromise } = createRes();

    middleware(req, res, vi.fn());
    await endPromise;

    expect(res.statusCode).toBe(400);
  });

  // ── terminal option ──

  function captureStdout(): { chunks: string[]; restore: () => void } {
    const chunks: string[] = [];
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    };
    return { chunks, restore: () => (process.stdout.write = original) };
  }

  it("should not print to stdout by default", async () => {
    const middleware = createKilogMiddleware(baseDir);
    const events = [
      {
        id: crypto.randomUUID(),
        timestamp: "2026-04-18T10:00:00.000Z",
        runtime: "browser",
        session: "s",
        type: "console",
        level: "info",
        message: "silent",
      },
    ];
    const req = createReq("POST", "/__kilog", JSON.stringify(events));
    const { res, endPromise } = createRes();
    const capture = captureStdout();
    try {
      middleware(req, res, vi.fn());
      await endPromise;
    } finally {
      capture.restore();
    }
    expect(capture.chunks.join("")).not.toContain("silent");
  });

  it("should print all events when terminal: true", async () => {
    const middleware = createKilogMiddleware(baseDir, { terminal: true });
    const events = [
      {
        id: crypto.randomUUID(),
        timestamp: "2026-04-18T10:00:00.000Z",
        runtime: "browser",
        session: "s",
        type: "console",
        level: "info",
        message: "hello-info",
      },
      {
        id: crypto.randomUUID(),
        timestamp: "2026-04-18T10:00:01.000Z",
        runtime: "browser",
        session: "s",
        type: "console",
        level: "debug",
        message: "hello-debug",
      },
    ];
    const req = createReq("POST", "/__kilog", JSON.stringify(events));
    const { res, endPromise } = createRes();
    const capture = captureStdout();
    try {
      middleware(req, res, vi.fn());
      await endPromise;
    } finally {
      capture.restore();
    }
    const out = capture.chunks.join("");
    expect(out).toContain("hello-info");
    expect(out).toContain("hello-debug");
    expect(out).toContain("\x1b[");
  });

  it("should only print at or above threshold when terminal: 'warn'", async () => {
    const middleware = createKilogMiddleware(baseDir, { terminal: "warn" });
    const events = [
      {
        id: crypto.randomUUID(),
        timestamp: "2026-04-18T10:00:00.000Z",
        runtime: "browser",
        session: "s",
        type: "console",
        level: "info",
        message: "below-threshold",
      },
      {
        id: crypto.randomUUID(),
        timestamp: "2026-04-18T10:00:01.000Z",
        runtime: "browser",
        session: "s",
        type: "console",
        level: "warn",
        message: "at-threshold",
      },
      {
        id: crypto.randomUUID(),
        timestamp: "2026-04-18T10:00:02.000Z",
        runtime: "browser",
        session: "s",
        type: "console",
        level: "error",
        message: "above-threshold",
      },
    ];
    const req = createReq("POST", "/__kilog", JSON.stringify(events));
    const { res, endPromise } = createRes();
    const capture = captureStdout();
    try {
      middleware(req, res, vi.fn());
      await endPromise;
    } finally {
      capture.restore();
    }
    const out = capture.chunks.join("");
    expect(out).not.toContain("below-threshold");
    expect(out).toContain("at-threshold");
    expect(out).toContain("above-threshold");
  });
});
