import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startDevReceiver } from "./server.js";
import { ENDPOINT } from "../browser/endpoint.js";

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

  it("accepts workerd runtime events", async () => {
    const port = await startDevReceiver({ baseDir });
    const event = {
      id: "22222222-2222-2222-2222-222222222222",
      timestamp: new Date().toISOString(),
      runtime: "workerd",
      session: "33333333-3333-3333-3333-333333333333",
      type: "console",
      level: "info",
      message: "from workerd",
    };
    const res = await fetch(`http://127.0.0.1:${port}${ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([event]),
    });
    expect(res.status).toBe(200);

    const rawDir = path.join(baseDir, ".kilog", "raw");
    const files = await readdir(rawDir);
    const workerdFile = files.find((f) => f.endsWith(".workerd.jsonl"));
    expect(workerdFile).toBeDefined();
    const body = await readFile(path.join(rawDir, workerdFile!), "utf8");
    expect(body).toContain("from workerd");
  });
});
