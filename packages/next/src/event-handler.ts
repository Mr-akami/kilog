import { createWriter, createRedactor, formatLogLine } from "@kilog/core";
import type { LogEvent, LogLevel } from "@kilog/core";

export interface KilogHandlerOptions {
  /**
   * Also print captured events to stdout.
   * - `true`: print every event.
   * - `LogLevel`: print events at or above that level.
   * - `false` / omitted (default): no terminal output.
   */
  terminal?: boolean | LogLevel;
  /**
   * Base directory that holds `.kilog/`. Defaults to `process.env.KILOG_DIR` or
   * `process.cwd()`.
   */
  baseDir?: string;
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function shouldPrint(event: LogEvent, terminal: boolean | LogLevel | undefined): boolean {
  if (!terminal) return false;
  if (terminal === true) return true;
  const threshold = LEVEL_RANK[terminal];
  const eventLevel = "level" in event ? event.level : undefined;
  if (eventLevel == null) return false;
  return LEVEL_RANK[eventLevel] >= threshold;
}

export async function processEvents(body: string, options: KilogHandlerOptions = {}): Promise<void> {
  const baseDir = options.baseDir ?? process.env.KILOG_DIR ?? process.cwd();
  const events = JSON.parse(body) as LogEvent[];
  const writer = createWriter({ baseDir, redactor: createRedactor() });
  for (const event of events) {
    await writer.append(event);
    if (shouldPrint(event, options.terminal)) {
      process.stdout.write(formatLogLine(event, { color: true }) + "\n");
    }
  }
}
