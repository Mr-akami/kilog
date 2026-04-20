import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { reindex, serialize } from "@logit/core";
import type { ConsoleEvent, ErrorEvent, NetworkEvent } from "@logit/core";
import { createApp } from "../server.js";

function makeConsoleEvent(overrides?: Partial<ConsoleEvent>): ConsoleEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-04-18T10:00:00.000Z",
    runtime: "node",
    session: "sess-1",
    type: "console",
    level: "info",
    message: "test",
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
    message: "error",
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

describe("GET /api/stats", () => {
  let baseDir: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "logit-webui-stats-"));
    const rawDir = path.join(baseDir, ".devlogs", "raw");
    await mkdir(rawDir, { recursive: true });
    await mkdir(path.join(baseDir, ".devlogs", "index"), { recursive: true });

    const events = [
      makeConsoleEvent({ level: "info" }),
      makeConsoleEvent({ level: "info" }),
      makeConsoleEvent({ level: "warn" }),
      makeErrorEvent(),
      makeNetworkEvent(),
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

  it("should return aggregated stats as JSON array", async () => {
    const res = await app.request("/api/stats");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("should have runtime, type, level, count fields", async () => {
    const res = await app.request("/api/stats");
    const body = await res.json();

    for (const row of body) {
      expect(row).toHaveProperty("runtime");
      expect(row).toHaveProperty("type");
      expect(row).toHaveProperty("level");
      expect(row).toHaveProperty("count");
      expect(typeof row.count).toBe("number");
    }
  });

  it("should have correct total count", async () => {
    const res = await app.request("/api/stats");
    const body = await res.json();

    const total = body.reduce(
      (sum: number, r: { count: number }) => sum + r.count,
      0,
    );
    expect(total).toBe(5);
  });

  it("should filter stats by runtime", async () => {
    const res = await app.request("/api/stats?runtime=browser");
    const body = await res.json();

    for (const row of body) {
      expect(row.runtime).toBe("browser");
    }
    const total = body.reduce(
      (sum: number, r: { count: number }) => sum + r.count,
      0,
    );
    expect(total).toBe(1);
  });

  it("should filter stats by type", async () => {
    const res = await app.request("/api/stats?type=console");
    const body = await res.json();

    for (const row of body) {
      expect(row.type).toBe("console");
    }
  });

  it("should filter stats by level", async () => {
    const res = await app.request("/api/stats?level=error");
    const body = await res.json();

    for (const row of body) {
      expect(row.level).toBe("error");
    }
  });

  it("should return empty array for non-matching filter", async () => {
    const res = await app.request("/api/stats?runtime=bun");
    const body = await res.json();

    expect(body).toHaveLength(0);
  });
});
