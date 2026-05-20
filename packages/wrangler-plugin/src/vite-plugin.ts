import type { Plugin, ViteDevServer } from "vite";
import type { LogLevel } from "@kilog/core";
import { ENDPOINT } from "@kilog/core/browser";
import { clearOnce } from "@kilog/core";
import { createKilogMiddleware } from "@kilog/core/dev-receiver";

export interface KilogWranglerPluginOptions {
  /**
   * Also print captured events to stdout. `true` prints every event; a level
   * threshold (`debug` < `info` < `warn` < `error`) filters events that have
   * a level. Default: no terminal output.
   */
  terminal?: boolean | LogLevel;
  /**
   * Keep previously captured logs across dev server restarts. Default
   * (`false`) wipes `.kilog/raw/*.jsonl` and `.kilog/index/` on dev start.
   */
  persist?: boolean;
  /**
   * Explicit worker-entry path(s). When set, the auto-inject only fires for
   * files whose resolved id matches one of these. Defaults to a heuristic
   * scan of the source that looks for `export default { ... fetch(...) }`.
   */
  workerEntries?: string[];
}

const INSTRUMENT_IMPORT = `import "@kilog/wrangler-plugin/instrument";`;
const RECEIVER_GLOBAL = "globalThis.__KILOG_RECEIVER_URL__";
const ENTRY_HINT = /export\s+default\s+[\s\S]{0,200}?\bfetch\s*[(:]/;

function isLikelyWorkerEntry(code: string, id: string, entries: string[] | undefined): boolean {
  if (entries && entries.some((e) => id === e || id.endsWith(e))) return true;
  if (id.includes("/node_modules/")) return false;
  if (!/\.(ts|tsx|mts|js|jsx|mjs|cts)$/.test(id)) return false;
  if (code.includes("@kilog/wrangler-plugin/instrument")) return false;
  return ENTRY_HINT.test(code);
}

/**
 * Vite plugin that wires kilog into a `@cloudflare/vite-plugin` setup.
 *
 * - Registers a Vite dev-server middleware for `POST /__kilog` that writes
 *   events to `.kilog/raw/*.jsonl`.
 * - Auto-injects `import "@kilog/wrangler-plugin/instrument"` plus the
 *   resolved receiver URL into the worker entry file — users don't need to
 *   touch their worker code.
 *
 * Local dev only. `next build` / `wrangler deploy` are unaffected because
 * the inject only runs in `serve` mode and instrument no-ops without a
 * receiver URL.
 */
export function kilogWranglerPlugin(options: KilogWranglerPluginOptions = {}): Plugin {
  const baseDir = process.env.KILOG_DIR ?? process.cwd();
  let receiverUrl: string | undefined;
  let server: ViteDevServer | undefined;

  return {
    name: "kilog-wrangler",
    enforce: "pre",
    apply: "serve",

    async configureServer(devServer) {
      server = devServer;
      if (!options.persist) {
        await clearOnce(baseDir);
      }
      devServer.middlewares.use(createKilogMiddleware(baseDir, { terminal: options.terminal }));

      const httpServer = devServer.httpServer;
      if (httpServer) {
        httpServer.once("listening", () => {
          const address = httpServer.address();
          if (address && typeof address !== "string") {
            const host =
              address.address === "::" || address.address === "0.0.0.0"
                ? "127.0.0.1"
                : address.address;
            receiverUrl = `http://${host}:${address.port}${ENDPOINT}`;
          }
        });
      }
    },

    transform(code, id) {
      if (!server) return null;
      if (!isLikelyWorkerEntry(code, id, options.workerEntries)) return null;

      const setUrl = receiverUrl ? `${RECEIVER_GLOBAL} = ${JSON.stringify(receiverUrl)};\n` : "";
      const prelude = `${setUrl}${INSTRUMENT_IMPORT}\n`;
      return { code: prelude + code, map: null };
    },
  };
}

export default kilogWranglerPlugin;
