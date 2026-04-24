import type { LogEvent, LogLevel } from "../schema/types.js";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";

function levelColor(level: LogLevel | undefined): string {
  switch (level) {
    case "error":
      return RED;
    case "warn":
      return YELLOW;
    case "info":
      return BLUE;
    case "debug":
      return GRAY;
    default:
      return "";
  }
}

function statusColor(status: number): string {
  if (status >= 500) return RED;
  if (status >= 400) return YELLOW;
  if (status >= 200 && status < 300) return GREEN;
  return "";
}

export interface FormatLogLineOptions {
  color?: boolean;
  timestamps?: boolean;
}

function indent(stack: string): string {
  return stack
    .split("\n")
    .map((l) => "    " + l.trim())
    .join("\n");
}

export function formatLogLine(event: LogEvent, options: FormatLogLineOptions = {}): string {
  const useColor = options.color ?? false;
  const c = (col: string, text: string): string =>
    useColor && col ? `${col}${text}${RESET}` : text;

  const parts: string[] = [];
  if (options.timestamps ?? true) parts.push(c(DIM, event.timestamp));
  parts.push(c(CYAN, event.runtime));

  switch (event.type) {
    case "console":
      parts.push(c(levelColor(event.level), event.level), event.message);
      break;
    case "error":
      parts.push(c(RED, "error"), c(RED, `${event.name}: ${event.message}`));
      break;
    case "unhandled-rejection":
      parts.push(c(RED, "unhandled-rejection"), event.message);
      break;
    case "network":
      parts.push(c(MAGENTA, event.method), event.url);
      if (event.status != null) parts.push(c(statusColor(event.status), String(event.status)));
      if (event.failed && event.errorMessage) parts.push(c(RED, event.errorMessage));
      break;
  }

  let line = parts.join(" ");
  const stack = "stack" in event ? event.stack : undefined;
  if (stack && stack.length > 0) {
    const trimmed = shouldTruncateStack(event) ? firstFrame(stack) : stack;
    const stackText = indent(trimmed);
    line += "\n" + (useColor ? `${DIM}${stackText}${RESET}` : stackText);
  }
  return line;
}

// For low-severity console logs the full stack is noise — keep only the top
// frame so the caller is still clickable without dominating the output.
function shouldTruncateStack(event: LogEvent): boolean {
  return event.type === "console" && (event.level === "info" || event.level === "debug");
}

function firstFrame(stack: string): string {
  const lines = stack.split("\n");
  for (const l of lines) if (l.trim().length > 0) return l;
  return stack;
}
