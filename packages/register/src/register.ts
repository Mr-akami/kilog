import { detectRuntime } from "./index.js";

const runtime = detectRuntime();

if (runtime === "deno") {
  // @ts-expect-error -- @logit/runtime-deno is an optional peer dependency
  await import("@logit/runtime-deno/register");
} else if (runtime === "bun") {
  // @ts-expect-error -- @logit/runtime-bun is an optional peer dependency
  await import("@logit/runtime-bun/register");
} else {
  await import("@logit/runtime-node/register");
}
