import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../..");

export function readJson(relativePath: string): Record<string, unknown> {
  const raw = readFileSync(resolve(ROOT, relativePath), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

export const PUBLIC_PACKAGE_PATHS = [
  "packages/core",
  "packages/runtime-node",
  "packages/vite-plugin",
  "packages/cli",
  "packages/web-ui",
  "packages/register",
] as const;

export const PACKAGE_NAMES: Record<string, string> = {
  "packages/core": "@kilog/core",
  "packages/runtime-node": "@kilog/runtime-node",
  "packages/vite-plugin": "@kilog/vite-plugin",
  "packages/cli": "@kilog/cli",
  "packages/web-ui": "@kilog/web-ui",
  "packages/register": "@kilog/register",
};
