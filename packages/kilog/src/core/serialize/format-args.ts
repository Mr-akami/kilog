import { stripAnsi } from "../ansi.js";

/**
 * Format an argument for a console message. Strings pass through (ANSI stripped),
 * Errors include their stack, and other values are JSON-stringified (with
 * cycle-safe fallback) so objects become "{...}" instead of "[object Object]".
 */
export function formatArg(value: unknown): string {
  if (typeof value === "string") return stripAnsi(value);
  if (typeof value === "number" || typeof value === "boolean" || value == null) {
    return String(value);
  }
  if (value instanceof Error) {
    return stripAnsi(value.stack ?? `${value.name}: ${value.message}`);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

export function formatArgs(args: readonly unknown[]): string {
  return args.map(formatArg).join(" ");
}
