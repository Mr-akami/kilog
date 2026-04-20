import path from "node:path";
import {
  openIndex,
  closeIndex,
  queryLogs,
  aggregateLogs,
  resolveStackFrames,
} from "@logit/core";
import type { QueryFilter, Runtime, EventType, LogLevel, LogEvent } from "@logit/core";
import { formatLogLine } from "../format/log-line.js";
import { formatTable } from "../format/table.js";

export interface QueryOptions {
  baseDir: string;
  dbPath: string;
  runtime?: Runtime;
  type?: EventType;
  level?: LogLevel;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  json?: boolean;
  aggregate?: boolean;
}

async function applySourcemapResolution(
  events: LogEvent[],
  cacheDir: string,
): Promise<LogEvent[]> {
  const resolved: LogEvent[] = [];
  for (const event of events) {
    if ("stack" in event && event.stack) {
      const resolvedStack = await resolveStackFrames(event.stack, cacheDir);
      resolved.push({ ...event, stack: resolvedStack });
    } else {
      resolved.push(event);
    }
  }
  return resolved;
}

export async function handleQuery(options: QueryOptions): Promise<void> {
  const { baseDir, dbPath, json, aggregate, ...rest } = options;
  const cacheDir = path.join(baseDir, ".devlogs", "cache", "sourcemaps");

  const filter: QueryFilter = {};
  if (rest.runtime) filter.runtime = rest.runtime;
  if (rest.type) filter.type = rest.type;
  if (rest.level) filter.level = rest.level;
  if (rest.search) filter.search = rest.search;
  if (rest.from) filter.from = rest.from;
  if (rest.to) filter.to = rest.to;
  if (rest.limit != null) filter.limit = rest.limit;
  if (rest.offset != null) filter.offset = rest.offset;

  const db = await openIndex(dbPath);
  try {
    if (aggregate) {
      const rows = await aggregateLogs(db, filter);
      process.stdout.write(formatTable(rows) + "\n");
      return;
    }

    const rawEvents = await queryLogs(db, filter);
    const events = await applySourcemapResolution(rawEvents, cacheDir);

    if (json) {
      process.stdout.write(JSON.stringify(events) + "\n");
      return;
    }

    for (const event of events) {
      process.stdout.write(formatLogLine(event) + "\n");
    }
  } finally {
    await closeIndex(db);
  }
}
