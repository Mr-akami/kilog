// CSI (`ESC [ ... letter`) and OSC (`ESC ] ... BEL`) — strip so `message`
// stays grep/SQL/UI-friendly. `args` keeps the raw string untouched.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b\[[0-9;?]*[@-~]|\u001b\][^\u0007]*\u0007/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

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
