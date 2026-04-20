import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { reindex, serialize } from "@logit/core";
import type { ConsoleEvent, ErrorEvent, NetworkEvent } from "@logit/core";
import { createApp } from "../server.js";

// ── helpers ──

function makeConsoleEvent(overrides?: Partial<ConsoleEvent>): ConsoleEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-04-18T10:00:00.000Z",
    runtime: "node",
    session: "sess-1",
    type: "console",
    level: "info",
    message: "test log",
    ...overrides,
  };
}

function makeErrorEvent(overrides?: Partial<ErrorEvent>): ErrorEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-04-18T11:00:00.000Z",
    runtime: "node",
    session: "sess-1",
    type: "error",
    level: "error",
    message: "test error",
    name: "Error",
    ...overrides,
  };
}

function makeNetworkEvent(overrides?: Partial<NetworkEvent>): NetworkEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-04-18T12:00:00.000Z",
    runtime: "browser",
    session: "sess-2",
    type: "network",
    level: "info",
    method: "GET",
    url: "https://api.example.com/data",
    normalizedPath: "/data",
    failed: false,
    ...overrides,
  };
}

describe("GET /api/logs", () => {
  let baseDir: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-webui-logs-"));
    const rawDir = path.join(baseDir, ".devlogs", "raw");
    await mkdir(rawDir, { recursive: true });
    await mkdir(path.join(baseDir, ".devlogs", "index"), { recursive: true });

    const events = [
      makeConsoleEvent({ message: "info msg", level: "info" }),
      makeConsoleEvent({ message: "warn msg", level: "warn" }),
      makeErrorEvent({ message: "error msg" }),
      makeNetworkEvent({ status: 200 }),
    ];

    await writeFile(
      path.join(rawDir, "2026-04-18.node.jsonl"),
      events.filter((e) => e.runtime === "node").map(serialize).join("\n") + "\n",
    );
    await writeFile(
      path.join(rawDir, "2026-04-18.browser.jsonl"),
      events.filter((e) => e.runtime === "browser").map(serialize).join("\n") + "\n",
    );

    const dbPath = path.join(baseDir, ".devlogs", "index", "logs.duckdb");
    await reindex({ baseDir, dbPath });

    app = createApp({ baseDir, dbPath });
  });

  afterAll(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should return all logs as JSON array", async () => {
    const res = await app.request("/api/logs");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(4);
  });

  it("should filter by runtime query parameter", async () => {
    const res = await app.request("/api/logs?runtime=browser");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThan(0);
    for (const event of body) {
      expect(event.runtime).toBe("browser");
    }
  });

  it("should filter by type query parameter", async () => {
    const res = await app.request("/api/logs?type=error");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(1);
    expect(body[0].type).toBe("error");
  });

  it("should filter by level query parameter", async () => {
    const res = await app.request("/api/logs?level=warn");

    expect(res.status).toBe(200);
    const body = await res.json();
    for (const event of body) {
      expect(event.level).toBe("warn");
    }
  });

  it("should filter by search query parameter", async () => {
    const res = await app.request("/api/logs?search=error+msg");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(1);
  });

  it("should respect limit query parameter", async () => {
    const res = await app.request("/api/logs?limit=2");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(2);
  });

  it("should respect offset query parameter", async () => {
    const res = await app.request("/api/logs?offset=3");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(1);
  });

  it("should return empty array for non-matching filter", async () => {
    const res = await app.request("/api/logs?search=nonexistent_xyz");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);
  });

  it("should combine multiple filters", async () => {
    const res = await app.request("/api/logs?runtime=node&level=info");

    expect(res.status).toBe(200);
    const body = await res.json();
    for (const event of body) {
      expect(event.runtime).toBe("node");
      expect(event.level).toBe("info");
    }
  });
});
