import { serve } from "@hono/node-server";
import { createApp } from "./server.js";

export { createApp } from "./server.js";

export interface ServerOptions {
  port: number;
  root: string;
  /**
   * Idle timeout in ms. If no request is received in this window, `process.exit(0)` is called.
   * The browser is expected to send `/api/heartbeat` periodically to keep the server alive.
   * Default: 15000.
   */
  idleTimeoutMs?: number;
  /** How often the watchdog checks for idle. Default: 5000. */
  watchdogIntervalMs?: number;
}

// Give enough slack for slow wasm init, backgrounded tabs, and brief reloads.
const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_WATCHDOG_INTERVAL_MS = 10_000;

export async function startServer(options: ServerOptions): Promise<void> {
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const watchdogIntervalMs = options.watchdogIntervalMs ?? DEFAULT_WATCHDOG_INTERVAL_MS;

  let lastActivity = Date.now();
  let server: ReturnType<typeof serve> | undefined;
  let watchdog: ReturnType<typeof setInterval> | undefined;
  let shuttingDown = false;

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (watchdog) clearInterval(watchdog);
    server?.close(() => process.exit(0));
    // fallback: force-exit after 1s if close hangs
    setTimeout(() => process.exit(0), 1000).unref();
  };

  const app = createApp({
    root: options.root,
    onActivity: () => {
      lastActivity = Date.now();
    },
  });

  server = serve({ fetch: app.fetch, port: options.port }, (info) => {
    console.log(`logit UI running on http://localhost:${info.port}`);
    console.log(`(auto-shutdown after ${idleTimeoutMs / 1000}s with no browser heartbeat)`);
  });

  watchdog = setInterval(() => {
    if (Date.now() - lastActivity >= idleTimeoutMs) {
      console.log("logit UI: idle timeout reached, shutting down");
      shutdown();
    }
  }, watchdogIntervalMs);
  watchdog.unref?.();
}
