import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { stream } from "hono/streaming";
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

function resolveRoot(root: string | null, fallback: string): string {
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

  app.get("/api/heartbeat", (c) => c.json({ ok: true }));

  app.get("/api/sources", async (c) => {
    const url = new URL(c.req.url, "http://localhost");
    const root = resolveRoot(url.searchParams.get("root"), options.root);
    const sources = await describeSources(root);
    return c.json({ root, sources });
  });

  app.get("/api/read", async (c) => {
    const url = new URL(c.req.url, "http://localhost");
    const filePath = url.searchParams.get("path");
    const offsetStr = url.searchParams.get("offset") ?? "0";
    const root = resolveRoot(url.searchParams.get("root"), options.root);

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
  });

  app.post("/api/clear", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { root?: string };
    const root = resolveRoot(body.root ?? null, options.root);
    const result = await clearAllLogs(root);
    return c.json(result);
  });

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
