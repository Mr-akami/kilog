// Wrap a Cloudflare Worker module-style default export so that, on each
// request, the receiver URL is hydrated from `env.KILOG_RECEIVER_URL`
// (provided by the `kilog-wrangler` launcher via `--var`). When the receiver
// URL has already been baked in at build time (Vite path), this is a no-op
// passthrough.
//
// Usage:
//   import "@kilog/wrangler-plugin/instrument";
//   import { withKilog } from "@kilog/wrangler-plugin/with-kilog";
//   export default withKilog({
//     async fetch(request, env, ctx) { ... },
//   });

type Globals = typeof globalThis & {
  __KILOG_RECEIVER_URL__?: string;
};

interface EnvWithReceiver {
  KILOG_RECEIVER_URL?: string;
}

function hydrateReceiverUrl(env: unknown): void {
  if (env == null || typeof env !== "object") return;
  const g = globalThis as Globals;
  if (g.__KILOG_RECEIVER_URL__) return;
  const url = (env as EnvWithReceiver).KILOG_RECEIVER_URL;
  if (typeof url === "string" && url.length > 0) {
    g.__KILOG_RECEIVER_URL__ = url;
  }
}

// We intentionally treat the handler as a record of unknowns so we don't pin
// users to a specific Cloudflare workers-types version. The runtime checks
// for callable `fetch` / `scheduled` / `queue` properties; everything else is
// passed through unchanged.
export function withKilog<H extends object>(handler: H): H {
  const src = handler as Record<string, unknown>;
  const wrapped: Record<string, unknown> = { ...src };

  for (const key of ["fetch", "scheduled", "queue"] as const) {
    const fn = src[key];
    if (typeof fn !== "function") continue;
    const bound = (fn as (...args: unknown[]) => unknown).bind(handler);
    wrapped[key] = (...args: unknown[]) => {
      // env is always the second positional argument across these handlers.
      hydrateReceiverUrl(args[1]);
      return bound(...args);
    };
  }

  return wrapped as H;
}
