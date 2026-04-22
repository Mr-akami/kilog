import { detectRuntime } from "./index.js";

const runtime = detectRuntime();

if (runtime === "deno") {
  // @ts-expect-error -- @kilog/runtime-deno is an optional peer dependency
  await import("@kilog/runtime-deno/register");
} else if (runtime === "bun") {
  // @ts-expect-error -- @kilog/runtime-bun is an optional peer dependency
  await import("@kilog/runtime-bun/register");
} else {
  await import("@kilog/runtime-node/register");
}
