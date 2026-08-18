import { createWriter } from "../storage/writer.js";
import { createRedactor } from "../redact/index.js";
import { formatLogLine } from "../format/index.js";
import type { LogEvent, LogLevel } from "../schema/types.js";

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export interface ProcessOptions {
  baseDir: string;
  terminal?: boolean | LogLevel;
}

function shouldPrint(event: LogEvent, terminal: boolean | LogLevel | undefined): boolean {
  if (!terminal) return false;
  if (terminal === true) return true;
  const threshold = LEVEL_RANK[terminal];
  const eventLevel = "level" in event ? event.level : undefined;
  if (eventLevel == null) return false;
  return LEVEL_RANK[eventLevel] >= threshold;
}

export async function processEvents(body: string, options: ProcessOptions): Promise<void> {
  const events = JSON.parse(body) as LogEvent[];
  const writer = createWriter({ baseDir: options.baseDir, redactor: createRedactor() });
  for (const event of events) {
    await writer.append(event);
    if (shouldPrint(event, options.terminal)) {
      process.stdout.write(formatLogLine(event, { color: true }) + "\n");
    }
  }
}
