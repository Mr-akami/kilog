import {
  aggregateLogs,
  catchUpFile,
  closeIndex,
  dbFilePathFromKilogDir,
  discoverSources,
  listRawFilesIn,
  openIndex,
} from "@kilog/core";
import type { AggregateRow, EventType, LogLevel, QueryFilter, Runtime } from "@kilog/core";
import { resolveTimeInput } from "../format/time.js";
import { formatTable } from "../format/table.js";

export interface StatsOptions {
  root: string;
  runtime?: Runtime;
  type?: EventType;
  level?: LogLevel;
  project?: string;
  since?: string;
  until?: string;
  json?: boolean;
}

function buildFilter(options: StatsOptions): QueryFilter {
  const filter: QueryFilter = {};
  if (options.runtime) filter.runtime = options.runtime;
  if (options.type) filter.type = options.type;
  if (options.level) filter.level = options.level;
  if (options.project) filter.project = options.project;
  if (options.since) filter.from = resolveTimeInput(options.since);
  if (options.until) filter.to = resolveTimeInput(options.until);
  return filter;
}

export async function handleStats(options: StatsOptions): Promise<void> {
  const sources = await discoverSources([options.root]);
  const filter = buildFilter(options);
  const rows: AggregateRow[] = [];

  for (const source of sources) {
    const db = await openIndex(dbFilePathFromKilogDir(source.kilogDir));
    try {
      for (const raw of await listRawFilesIn(source.kilogDir)) {
        await catchUpFile(db, raw, source.project);
      }
      rows.push(...(await aggregateLogs(db, filter)));
    } finally {
      await closeIndex(db);
    }
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(rows) + "\n");
    return;
  }

  process.stdout.write(formatTable(rows) + (rows.length > 0 ? "\n" : ""));
}
