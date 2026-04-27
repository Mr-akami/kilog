import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startDevReceiver } from "./dev-receiver.js";
import { ENDPOINT } from "@kilog/core/browser";

describe("startDevReceiver", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-recv-"));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("listens on a localhost port and writes posted events to .kilog/raw", async () => {
    const port = await startDevReceiver({ baseDir });
    expect(typeof port).toBe("number");

    const event = {
      id: "11111111-1111-1111-1111-111111111111",
      timestamp: new Date().toISOString(),
      runtime: "browser",
      type: "console",
      level: "info",
      message: "hello",
    };
    const res = await fetch(`http://127.0.0.1:${port}${ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([event]),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const rawDir = path.join(baseDir, ".kilog", "raw");
    const files = await readdir(rawDir);
    expect(files.length).toBeGreaterThan(0);
    const body = await readFile(path.join(rawDir, files[0]), "utf8");
    expect(body).toContain("hello");
  });

  it("404s on non-POST or wrong path", async () => {
    const port = await startDevReceiver({ baseDir });
    const res = await fetch(`http://127.0.0.1:${port}/nope`);
    expect(res.status).toBe(404);
  });

  it("400s on invalid JSON", async () => {
    const port = await startDevReceiver({ baseDir });
    const res = await fetch(`http://127.0.0.1:${port}${ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    expect(res.status).toBe(400);
  });
});
