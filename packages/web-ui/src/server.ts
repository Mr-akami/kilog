import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { describeRoute, openAPIRouteHandler } from "hono-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { describeSources } from "./sources.js";
import { resolveAssetJs } from "./manifest.js";
import { renderPage } from "./page.js";
import { clearAllLogs } from "./clear.js";

export type { SourceDescriptor } from "./sources.js";

export interface AppOptions {
  /** Fallback root used when the client does not provide `?root=`. Defaults to cwd. */
  root: string;
  /** Called whenever a request touches the server, used by auto-shutdown. */
  onActivity?: () => void;
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
};

function publicDir(): string {
  // Resolves to `<package-root>/dist/public`, which is where Vite emits the
  // bundled client. Works from both `src/*.ts` (tests) and `dist/*.js` (runtime).
  const thisFile = fileURLToPath(import.meta.url);
  const pkgRoot = path.resolve(path.dirname(thisFile), "..");
  return path.join(pkgRoot, "dist", "public");
}

function resolveRoot(root: string | null | undefined, fallback: string): string {
  return path.resolve(root && root.length > 0 ? root : fallback);
}

async function isPathUnderRoot(filePath: string, root: string): Promise<boolean> {
  const abs = path.resolve(filePath);
  const rootAbs = path.resolve(root);
  const rel = path.relative(rootAbs, abs);
  return rel.length > 0 && !rel.startsWith("..") && !path.isAbsolute(rel);
}

export function createApp(options: AppOptions): Hono {
  const app = new Hono();
  const touch = () => options.onActivity?.();

  app.use("*", async (c, next) => {
    touch();
    await next();
  });

  app.get(
    "/api/heartbeat",
    describeRoute({
      tags: ["session"],
      summary: "Keep-alive ping from the browser",
      description:
        "The browser calls this every 5 s. Any request resets the server's idle timer, so missing heartbeats eventually triggers auto-shutdown.",
      responses: {
        200: {
          description: "Alive.",
          content: {
            "application/json": {
              schema: { type: "object", properties: { ok: { const: true } }, required: ["ok"] },
            },
          },
        },
      },
    }),
    (c) => c.json({ ok: true }),
  );

  app.get(
    "/api/sources",
    describeRoute({
      tags: ["discovery"],
      summary: "List all .kilog/raw/*.jsonl files under the root",
      parameters: [
        {
          name: "root",
          in: "query",
          required: false,
          description: "Override the discovery root. Defaults to the server's startup cwd.",
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Discovered sources.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["root", "sources"],
                properties: {
                  root: { type: "string", description: "Absolute path actually used." },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["path", "displayPath", "project", "size", "mtime"],
                      properties: {
                        path: { type: "string" },
                        displayPath: { type: "string" },
                        project: { type: "string" },
                        size: { type: "integer", minimum: 0 },
                        mtime: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    async (c) => {
      const root = resolveRoot(c.req.query("root"), options.root);
      const sources = await describeSources(root);
      return c.json({ root, sources });
    },
  );

  app.get(
    "/api/read",
    describeRoute({
      tags: ["ingest"],
      summary: "Stream JSONL bytes from a given offset",
      description:
        "Returns the contents of the file starting at `offset`. The response header `X-File-Size` reports the file size when the stream was opened, which the client uses to advance its offset.",
      parameters: [
        {
          name: "path",
          in: "query",
          required: true,
          schema: { type: "string" },
          description: "Absolute path to the JSONL file (must be inside the resolved root).",
        },
        {
          name: "offset",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 0 },
          description: "Byte offset from which to start streaming. Default: 0.",
        },
        {
          name: "root",
          in: "query",
          required: false,
          schema: { type: "string" },
          description: "Override the discovery root.",
        },
      ],
      responses: {
        200: {
          description: "Bytes from offset to end-of-file. Headers: `X-File-Size`.",
          content: { "application/x-ndjson": { schema: { type: "string" } } },
        },
        400: {
          description: "Bad inputs.",
          content: { "text/plain": { schema: { type: "string" } } },
        },
        403: {
          description: "Forbidden path.",
          content: { "text/plain": { schema: { type: "string" } } },
        },
        404: {
          description: "File not found.",
          content: { "text/plain": { schema: { type: "string" } } },
        },
      },
    }),
    async (c) => {
      const filePath = c.req.query("path");
      const offsetStr = c.req.query("offset") ?? "0";
      const root = resolveRoot(c.req.query("root"), options.root);
      if (!filePath) return c.text("missing path", 400);
      const offset = Number.parseInt(offsetStr, 10);
      if (!Number.isFinite(offset) || offset < 0) return c.text("bad offset", 400);
      if (!(await isPathUnderRoot(filePath, root))) {
        return c.text("forbidden (path outside root)", 403);
      }
      if (!filePath.endsWith(".jsonl")) {
        return c.text("forbidden (only .jsonl files)", 403);
      }
      let fileSize: number;
      try {
        const s = await stat(filePath);
        fileSize = s.size;
      } catch {
        return c.text("not found", 404);
      }
      if (offset >= fileSize) {
        return c.body("", 200, {
          "Content-Type": "application/x-ndjson",
          "X-File-Size": String(fileSize),
        });
      }
      const handle = createReadStream(filePath, { start: offset });
      return stream(c, async (s) => {
        c.header("Content-Type", "application/x-ndjson");
        c.header("X-File-Size", String(fileSize));
        for await (const chunk of handle) {
          await s.write(chunk as Buffer);
        }
      });
    },
  );

  app.post(
    "/api/clear",
    describeRoute({
      tags: ["maintenance"],
      summary: "Delete all raw JSONL files and per-project index directories",
      description:
        "Destructive. Removes every `*.jsonl` under `<root>/**/.kilog/raw/` and every `.kilog/index/` directory. The browser UI confirms before calling this.",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                root: {
                  type: "string",
                  description: "Override the root under which files are deleted.",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "How many files / dirs were removed.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rawFilesDeleted", "indexDbsDeleted"],
                properties: {
                  rawFilesDeleted: { type: "integer", minimum: 0 },
                  indexDbsDeleted: { type: "integer", minimum: 0 },
                },
              },
            },
          },
        },
      },
    }),
    async (c) => {
      const body = (await c.req.json().catch(() => ({}))) as { root?: string };
      const resolved = resolveRoot(body.root, options.root);
      const result = await clearAllLogs(resolved);
      return c.json(result);
    },
  );

  // OpenAPI spec (JSON) + Scalar UI
  app.get(
    "/openapi.json",
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          version: "0.0.0",
          title: "@kilog/web-ui server API",
          description:
            "Backing API for the kilog browser UI. The browser uses these endpoints to enumerate JSONL sources, stream their contents into DuckDB-wasm, keep the server alive, and clear logs on disk.",
        },
        openapi: "3.1.0",
      },
    }),
  );
  app.get("/docs", apiReference({ url: "/openapi.json" }));

  // SSR page
  app.get("/", async (c) => {
    const assetJs = await resolveAssetJs(publicDir());
    const initialSources = await describeSources(options.root);
    return c.html(
      await renderPage({
        assetJs,
        initialRoot: options.root,
        initialSources,
      }),
    );
  });

  // Static assets
  app.get("/:file{.+\\..+}", async (c) => {
    const filePath = path.join(publicDir(), c.req.param("file"));
    if (!filePath.startsWith(publicDir())) return c.text("Forbidden", 403);
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
