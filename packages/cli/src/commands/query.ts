import path from "node:path";
import {
  openIndex,
  closeIndex,
  queryLogs,
  aggregateLogs,
  resolveStackFrames,
  catchUpFile,
  discoverSources,
  listRawFilesIn,
  dbFilePathFromKilogDir,
} from "@kilog/core";
import type {
  QueryFilter,
  Runtime,
  EventType,
  LogLevel,
  LogEvent,
  AggregateRow,
} from "@kilog/core";
import { formatLogLine } from "@kilog/core";
import { formatTable } from "../format/table.js";
import { durationAgoIso } from "../format/time.js";

export interface QueryOptions {
  root: string;
  runtime?: Runtime;
  type?: EventType;
  level?: LogLevel;
  project?: string;
  search?: string;
  from?: string;
  to?: string;
  last?: string;
  limit?: number;
  offset?: number;
  json?: boolean;
  aggregate?: boolean;
}

async function applySourcemapResolution(events: LogEvent[], cacheDir: string): Promise<LogEvent[]> {
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

function buildFilter(opts: QueryOptions): QueryFilter {
  const filter: QueryFilter = {};
  if (opts.runtime) filter.runtime = opts.runtime;
  if (opts.type) filter.type = opts.type;
  if (opts.level) filter.level = opts.level;
  if (opts.project) filter.project = opts.project;
  if (opts.search) filter.search = opts.search;
  if (opts.last) {
    filter.from = durationAgoIso(opts.last);
  } else {
    if (opts.from) filter.from = opts.from;
    if (opts.to) filter.to = opts.to;
  }
  return filter;
}

export async function handleQuery(options: QueryOptions): Promise<void> {
  const sources = await discoverSources([options.root]);
  const filter = buildFilter(options);

  if (options.aggregate) {
    const merged: AggregateRow[] = [];
    for (const src of sources) {
      const dbPath = dbFilePathFromKilogDir(src.kilogDir);
      const db = await openIndex(dbPath);
      try {
        for (const raw of await listRawFilesIn(src.kilogDir)) {
          await catchUpFile(db, raw, src.project);
        }
        const rows = await aggregateLogs(db, filter);
        merged.push(...rows);
      } finally {
        await closeIndex(db);
      }
    }
    process.stdout.write(formatTable(merged) + "\n");
    return;
  }

  const perSource: LogEvent[] = [];
  for (const src of sources) {
    const dbPath = dbFilePathFromKilogDir(src.kilogDir);
    const cacheDir = path.join(src.kilogDir, "cache", "sourcemaps");
    const db = await openIndex(dbPath);
    try {
      for (const raw of await listRawFilesIn(src.kilogDir)) {
        await catchUpFile(db, raw, src.project);
      }
      const raw = await queryLogs(db, filter);
      const resolved = await applySourcemapResolution(raw, cacheDir);
      perSource.push(...resolved);
    } finally {
      await closeIndex(db);
    }
  }

  perSource.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));

  const sliced = (() => {
    const start = options.offset ?? 0;
    const end = options.limit != null ? start + options.limit : undefined;
    return perSource.slice(start, end);
  })();

  if (options.json) {
    process.stdout.write(JSON.stringify(sliced) + "\n");
    return;
  }

  for (const event of sliced) {
    process.stdout.write(formatLogLine(event) + "\n");
  }
}
