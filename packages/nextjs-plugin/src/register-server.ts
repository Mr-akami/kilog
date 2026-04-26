// Auto-loaded by the generated `instrumentation.ts` (project root).
// Next.js fires `register()` once per server process; this module performs
// console/fetch/error capture for the Node runtime only. The Edge runtime is
// skipped because `@kilog/runtime-node` requires Node APIs.
export async function registerServer(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  await import("@kilog/register");
}
