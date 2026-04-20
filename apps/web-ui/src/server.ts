import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import {
  openIndex,
  closeIndex,
  queryLogs,
  aggregateLogs,
} from "@logit/core";
import type { QueryFilter, Runtime, EventType, LogLevel } from "@logit/core";

export interface AppOptions {
  baseDir: string;
  dbPath: string;
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function publicDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(thisFile), "..", "public");
}

function parseFilter(params: URLSearchParams): QueryFilter {
  const filter: QueryFilter = {};

  const runtime = params.get("runtime");
  if (runtime) filter.runtime = runtime as Runtime;

  const type = params.get("type");
  if (type) filter.type = type as EventType;

  const level = params.get("level");
  if (level) filter.level = level as LogLevel;

  const search = params.get("search");
  if (search) filter.search = search;

  const from = params.get("from");
  if (from) filter.from = from;

  const to = params.get("to");
  if (to) filter.to = to;

  const limit = params.get("limit");
  if (limit) filter.limit = parseInt(limit, 10);

  const offset = params.get("offset");
  if (offset) filter.offset = parseInt(offset, 10);

  return filter;
}

export function createApp(options: AppOptions): Hono {
  const app = new Hono();

  app.get("/api/logs", async (c) => {
    const filter = parseFilter(new URL(c.req.url, "http://localhost").searchParams);
    const db = await openIndex(options.dbPath);
    try {
      const events = await queryLogs(db, filter);
      return c.json(events);
    } finally {
      await closeIndex(db);
    }
  });

  app.get("/api/stats", async (c) => {
    const filter = parseFilter(new URL(c.req.url, "http://localhost").searchParams);
    const db = await openIndex(options.dbPath);
    try {
      const rows = await aggregateLogs(db, filter);
      return c.json(rows);
    } finally {
      await closeIndex(db);
    }
  });

  // Static file serving
  app.get("/", async (c) => {
    const content = await readFile(path.join(publicDir(), "index.html"), "utf-8");
    return c.html(content);
  });

  app.get("/:file{.+\\..+}", async (c) => {
    const filePath = path.join(publicDir(), c.req.param("file"));
    // Prevent path traversal
    if (!filePath.startsWith(publicDir())) {
      return c.text("Forbidden", 403);
    }
    try {
      const content = await readFile(filePath);
      const ext = path.extname(filePath);
      const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
      return c.body(content, 200, { "Content-Type": contentType });
    } catch {
      return c.text("Not Found", 404);
    }
  });

  return app;
}
