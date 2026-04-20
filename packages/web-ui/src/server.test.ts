import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, appendFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp } from "./server.js";
import { serialize } from "@logit/core";
import type { ConsoleEvent } from "@logit/core";

function makeEvent(message: string): ConsoleEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-04-20T10:00:00.000Z",
    runtime: "browser",
    session: "s",
    type: "console",
    level: "info",
    message,
  };
}

describe("web-ui server", () => {
  let root: string;
  let jsonlPath: string;
  let devlogsDir: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "logit-web-ui-"));
    devlogsDir = path.join(root, "apps", "sample", ".devlogs");
    const rawDir = path.join(devlogsDir, "raw");
    const indexDir = path.join(devlogsDir, "index");
    await mkdir(rawDir, { recursive: true });
    await mkdir(indexDir, { recursive: true });
    jsonlPath = path.join(rawDir, "2026-04-20.browser.jsonl");
    await writeFile(jsonlPath, serialize(makeEvent("hello")) + "\n");
    await writeFile(path.join(indexDir, "logs.duckdb"), "fake db");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("GET / renders SSR HTML with embedded initial data", async () => {
    const app = createApp({ root });
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const body = await res.text();
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain(`<input id="root" type="text" value="${root}"`);
    expect(body).toContain("window.__LOGIT_SSR__");
    expect(body).toContain('"apps');
  });

  it("GET /api/heartbeat returns ok and notifies activity", async () => {
    let activityCount = 0;
    const app = createApp({ root, onActivity: () => activityCount++ });
    const res = await app.request("/api/heartbeat");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(activityCount).toBe(1);
  });

  it("GET /api/sources enumerates discovered jsonl files", async () => {
    const app = createApp({ root });
    const res = await app.request("/api/sources");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      root: string;
      sources: { path: string; displayPath: string; project: string; size: number; mtime: string }[];
    };
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0].path).toBe(jsonlPath);
    expect(body.sources[0].project).toBe(path.join("apps", "sample"));
    expect(body.sources[0].size).toBeGreaterThan(0);
  });

  it("GET /api/read returns bytes from offset", async () => {
    const app = createApp({ root });
    const first = await app.request(`/api/read?path=${encodeURIComponent(jsonlPath)}`);
    expect(first.status).toBe(200);
    const firstBody = await first.text();
    expect(firstBody.length).toBeGreaterThan(0);

    const size = Number(first.headers.get("X-File-Size"));
    await appendFile(jsonlPath, serialize(makeEvent("second")) + "\n");

    const second = await app.request(
      `/api/read?path=${encodeURIComponent(jsonlPath)}&offset=${size}`,
    );
    expect(second.status).toBe(200);
    const secondBody = await second.text();
    expect(secondBody).toContain("second");
    expect(secondBody).not.toContain("hello");
  });

  it("GET /api/read rejects paths outside root", async () => {
    const app = createApp({ root });
    const outside = path.join("/tmp", "not-under-root.jsonl");
    const res = await app.request(`/api/read?path=${encodeURIComponent(outside)}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/read rejects non-jsonl paths", async () => {
    const app = createApp({ root });
    const otherFile = path.join(root, "apps", "sample", ".devlogs", "raw", "readme.txt");
    await writeFile(otherFile, "");
    const res = await app.request(`/api/read?path=${encodeURIComponent(otherFile)}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/read 400s on bad inputs", async () => {
    const app = createApp({ root });
    expect((await app.request("/api/read")).status).toBe(400);
    expect((await app.request(`/api/read?path=${encodeURIComponent(jsonlPath)}&offset=-1`)).status).toBe(400);
  });

  it("POST /api/clear deletes raw jsonl and index dirs", async () => {
    const app = createApp({ root });
    const res = await app.request("/api/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rawFilesDeleted: number; indexDbsDeleted: number };
    expect(body.rawFilesDeleted).toBe(1);
    expect(body.indexDbsDeleted).toBe(1);

    await expect(stat(jsonlPath)).rejects.toThrow();
    await expect(stat(path.join(devlogsDir, "index"))).rejects.toThrow();
  });
});
