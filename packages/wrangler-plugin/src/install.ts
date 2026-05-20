import type {
  ConsoleEvent,
  ErrorEvent as KilogErrorEvent,
  LogEvent,
  LogLevel,
  NetworkEvent,
  UnhandledRejectionEvent,
} from "@kilog/core";

// Receiver URL is injected at build time via a `define` (Vite) or `--define`
// (wrangler dev launcher). At runtime, `withKilog` may also populate it from
// `env.KILOG_RECEIVER_URL` per request. If unset, all sends are no-ops.
declare const __KILOG_RECEIVER_URL__: string | undefined;

type Globals = typeof globalThis & {
  __KILOG_RECEIVER_URL__?: string;
  __KILOG_INSTRUMENTED__?: boolean;
  __kilogOriginalFetch?: typeof fetch;
};

/**
 * Wraps `console`, `fetch`, and (where available) global error events to ship
 * a `LogEvent` stream to a local kilog receiver. Idempotent — repeated calls
 * are no-ops via a `globalThis.__KILOG_INSTRUMENTED__` guard.
 *
 * The receiver URL is resolved from `globalThis.__KILOG_RECEIVER_URL__`, which
 * the Vite path bakes in at build time and the plain-wrangler path injects
 * per-request via `withKilog`. If unset, all sends are no-ops.
 */
export function installKilogInstrumentation(): void {
  const g = globalThis as Globals;
  if (g.__KILOG_INSTRUMENTED__) return;
  g.__KILOG_INSTRUMENTED__ = true;

  try {
    if (typeof __KILOG_RECEIVER_URL__ === "string" && __KILOG_RECEIVER_URL__.length > 0) {
      g.__KILOG_RECEIVER_URL__ = __KILOG_RECEIVER_URL__;
    }
  } catch {
    // build-time `define` wasn't applied
  }

  const session = crypto.randomUUID();
  const originalFetch = globalThis.fetch.bind(globalThis);
  g.__kilogOriginalFetch = originalFetch;
  const originalConsoleError = console.error.bind(console);

  function sendEvents(events: LogEvent[]): void {
    const url = g.__KILOG_RECEIVER_URL__;
    if (!url) return;
    originalFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events),
    }).catch((err) => {
      originalConsoleError("[kilog] sendEvents failed:", err);
    });
  }

  function formatArg(v: unknown): string {
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean" || v == null) return String(v);
    if (v instanceof Error) return v.stack ?? `${v.name}: ${v.message}`;
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  function formatArgs(args: unknown[]): string {
    return args.map(formatArg).join(" ");
  }

  function captureStack(below: Function): string {
    let raw: string;
    if (Error.captureStackTrace) {
      const target: { stack?: string } = {};
      Error.captureStackTrace(target, below);
      raw = target.stack ?? "";
    } else {
      raw = new Error().stack ?? "";
    }
    const lines = raw.split("\n");
    while (lines.length && !/^\s*at\s/.test(lines[0])) lines.shift();
    return lines.join("\n");
  }

  function baseFields() {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      runtime: "workerd" as const,
      session,
    };
  }

  const LEVEL_MAP: Record<string, LogLevel> = {
    log: "info",
    info: "info",
    warn: "warn",
    error: "error",
    debug: "debug",
  };
  const METHODS = ["log", "info", "warn", "error", "debug"] as const;
  for (const method of METHODS) {
    const original = console[method].bind(console);
    const wrapped = (...args: unknown[]) => {
      original(...args);
      const event: ConsoleEvent = {
        ...baseFields(),
        type: "console",
        level: LEVEL_MAP[method],
        message: formatArgs(args),
        args,
        stack: captureStack(wrapped),
      };
      sendEvents([event]);
    };
    console[method] = wrapped;
  }

  const wrappedFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input);

    if (url.includes("__kilog")) {
      return originalFetch(input, init);
    }

    let normalizedPath = "/";
    try {
      normalizedPath = new URL(url).pathname;
    } catch {
      // non-URL input; leave default
    }
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");
    const start = performance.now();
    const stack = captureStack(wrappedFetch);

    try {
      const response = await originalFetch(input, init);
      const event: NetworkEvent = {
        ...baseFields(),
        type: "network",
        level: "info",
        method,
        url,
        normalizedPath,
        status: response.status,
        duration: performance.now() - start,
        failed: false,
        stack,
      };
      sendEvents([event]);
      return response;
    } catch (err) {
      const event: NetworkEvent = {
        ...baseFields(),
        type: "network",
        level: "info",
        method,
        url,
        normalizedPath,
        duration: performance.now() - start,
        failed: true,
        errorMessage: err instanceof Error ? err.message : String(err),
        stack,
      };
      sendEvents([event]);
      throw err;
    }
  };
  globalThis.fetch = wrappedFetch;

  if (typeof addEventListener === "function") {
    addEventListener("error", (rawEvent: Event) => {
      const e = rawEvent as Event & { error?: unknown; message?: string };
      const err = e.error;
      const isError = err instanceof Error;
      const event: KilogErrorEvent = {
        ...baseFields(),
        type: "error",
        level: "error",
        message: isError ? err.message : String(e.message ?? err ?? "Error"),
        name: isError ? err.name : "Error",
        stack: isError ? err.stack : undefined,
      };
      sendEvents([event]);
    });

    addEventListener("unhandledrejection", (rawEvent: Event) => {
      const e = rawEvent as Event & { reason?: unknown };
      const reason = e.reason;
      const isError = reason instanceof Error;
      const event: UnhandledRejectionEvent = {
        ...baseFields(),
        type: "unhandled-rejection",
        level: "error",
        message: isError ? reason.message : String(reason),
        name: isError ? reason.name : undefined,
        stack: isError ? reason.stack : undefined,
      };
      sendEvents([event]);
    });
  }
}
