import { createServer, type Server } from "node:http";
import { serve } from "@hono/node-server";
import { createApp } from "./server.js";

export { createApp } from "./server.js";

export interface ServerOptions {
  /** Preferred port. If busy, the next free port is used automatically. */
  port: number;
  root: string;
  /**
   * Idle timeout in ms. If no request is received in this window, the server
   * `process.exit(0)`s. The browser pings `/api/heartbeat` every 5 s.
   * Default: 15000.
   */
  idleTimeoutMs?: number;
  /** How often the watchdog checks for idle. Default: 5000. */
  watchdogIntervalMs?: number;
  /** Maximum port increments to try before giving up. Default: 20. */
  portRetry?: number;
}

const DEFAULT_IDLE_TIMEOUT_MS = 15_000;
const DEFAULT_WATCHDOG_INTERVAL_MS = 5_000;
const DEFAULT_PORT_RETRY = 20;

/** Find the first free port starting at `preferred` (inclusive). */
export async function findFreePort(preferred: number, maxAttempts: number): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = preferred + i;
    const available = await new Promise<boolean>((resolve) => {
      const probe: Server = createServer();
      probe.once("error", () => {
        probe.close();
        resolve(false);
      });
      probe.listen(candidate, () => {
        probe.close(() => resolve(true));
      });
    });
    if (available) return candidate;
  }
  throw new Error(`no free port in range ${preferred}-${preferred + maxAttempts - 1}`);
}

export async function startServer(options: ServerOptions): Promise<void> {
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const watchdogIntervalMs = options.watchdogIntervalMs ?? DEFAULT_WATCHDOG_INTERVAL_MS;
  const portRetry = options.portRetry ?? DEFAULT_PORT_RETRY;

  const port = await findFreePort(options.port, portRetry);
  if (port !== options.port) {
    console.log(`kilog UI: port ${options.port} busy, using ${port} instead`);
  }

  // `firstSeen` is null until the first browser request arrives. Before that,
  // the idle watchdog is inactive so the user can take their time opening the
  // page. After the first request, normal heartbeat timeouts apply.
  let firstSeen: number | null = null;
  let lastActivity = Date.now();
  let shuttingDown = false;

  const app = createApp({
    root: options.root,
    onActivity: () => {
      if (firstSeen === null) firstSeen = Date.now();
      lastActivity = Date.now();
    },
  });

  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`kilog UI running on http://localhost:${info.port}`);
    console.log(
      `(auto-shutdown after ${idleTimeoutMs / 1000}s of no heartbeat — timer starts on first access)`,
    );
  });

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(watchdog);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  };

  const watchdog = setInterval(() => {
    // Don't time out before anyone has opened the page.
    if (firstSeen === null) return;
    if (Date.now() - lastActivity >= idleTimeoutMs) {
      console.log("kilog UI: idle timeout reached, shutting down");
      shutdown();
    }
  }, watchdogIntervalMs);
  watchdog.unref?.();
}
