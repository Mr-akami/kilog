import type { Runtime } from "@logit/core";

export function detectRuntime(): Runtime {
  if ((globalThis as Record<string, unknown>).Deno) return "deno";
  if ((globalThis as Record<string, unknown>).Bun) return "bun";
  return "node";
}
