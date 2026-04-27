import { generateBrowserRuntime } from "@kilog/core/browser";

// Auto-loaded by the generated `instrumentation-client.ts` (project root).
// Next 15.3+ runs that file in the browser before user code, so this module
// hooks `console`, `fetch`, and uncaught errors as early as the bundle allows.
//
// Gated to non-production: the runtime is dev-only (the receiver is a dev-mode
// HTTP server) and `new Function` may trip strict CSPs in production builds.
export function registerClient(): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "production") return;
  // The runtime is an IIFE inside a string; instantiating it as a Function
  // body and invoking executes the IIFE in the browser global scope.
  // eslint-disable-next-line no-implied-eval
  new Function(generateBrowserRuntime())();
}

registerClient();
