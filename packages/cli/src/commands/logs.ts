import { watch, type FSWatcher } from "node:fs";
import { mkdir, open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  catchUpFile,
  closeIndex,
  dbFilePathFromKilogDir,
  deserialize,
  discoverSources,
  formatLogLine,
  listRawFilesIn,
  openIndex,
  queryLogs,
  resolveStackFrames,
} from "@kilog/core";
import type { DiscoveredSource, EventType, LogEvent, LogLevel, QueryFilter, Runtime } from "@kilog/core";
import { resolveTimeInput } from "../format/time.js";

export interface LogsOptions {
  root: string;
  signal?: AbortSignal;
  follow?: boolean;
  tail?: number;
  runtime?: Runtime;
  type?: EventType;
  level?: LogLevel;
  project?: string;
  projects?: string[];
  since?: string;
  until?: string;
  json?: boolean;
  timestamps?: boolean;
  onLine?: (line: string) => void;
}

function buildFilter(options: LogsOptions): QueryFilter {
  const filter: QueryFilter = {};
  if (options.runtime) filter.runtime = options.runtime;
  if (options.type) filter.type = options.type;
  if (options.level) filter.level = options.level;
  if (options.projects && options.projects.length > 0) {
    filter.projects = options.projects;
  } else if (options.project) {
    filter.project = options.project;
  }
  if (options.since) filter.from = resolveTimeInput(options.since);
  if (options.until) filter.to = resolveTimeInput(options.until);
  return filter;
}

function matchesEvent(event: LogEvent, source: DiscoveredSource, filter: QueryFilter): boolean {
  if (filter.runtime && event.runtime !== filter.runtime) return false;
  if (filter.type && event.type !== filter.type) return false;
  if (filter.level && event.level !== filter.level) return false;
  if (filter.project && source.project !== filter.project) return false;
  if (filter.projects && filter.projects.length > 0 && !filter.projects.includes(source.project)) {
    return false;
  }
  if (filter.from && event.timestamp < filter.from) return false;
  if (filter.to && event.timestamp > filter.to) return false;
  return true;
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

async function catchUpSource(source: DiscoveredSource): Promise<void> {
  const db = await openIndex(dbFilePathFromKilogDir(source.kilogDir));
  try {
    for (const raw of await listRawFilesIn(source.kilogDir)) {
      await catchUpFile(db, raw, source.project);
    }
  } finally {
    await closeIndex(db);
  }
}

async function readSourceLogs(source: DiscoveredSource, filter: QueryFilter): Promise<LogEvent[]> {
  const db = await openIndex(dbFilePathFromKilogDir(source.kilogDir));
  try {
    for (const raw of await listRawFilesIn(source.kilogDir)) {
      await catchUpFile(db, raw, source.project);
    }
    const events = await queryLogs(db, filter);
    return applySourcemapResolution(events, path.join(source.kilogDir, "cache", "sourcemaps"));
  } finally {
    await closeIndex(db);
  }
}

async function readBackfill(sources: DiscoveredSource[], filter: QueryFilter, tail?: number): Promise<LogEvent[]> {
  const perSourceFilter = tail != null ? { ...filter, order: "desc" as const, limit: tail } : filter;
  const events: LogEvent[] = [];
  for (const source of sources) {
    events.push(...(await readSourceLogs(source, perSourceFilter)));
  }

  if (tail != null) {
    return events
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
      .slice(0, tail)
      .reverse();
  }

  return events.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
}

async function readNewLines(
  filePath: string,
  offsetBytes: number,
): Promise<{ lines: string[]; newOffset: number }> {
  const fileStat = await stat(filePath);
  if (fileStat.size <= offsetBytes) return { lines: [], newOffset: offsetBytes };

  const buf = Buffer.alloc(fileStat.size - offsetBytes);
  const fileHandle = await open(filePath, "r");
  try {
    await fileHandle.read(buf, 0, buf.length, offsetBytes);
  } finally {
    await fileHandle.close();
  }

  return {
    lines: buf
      .toString("utf-8")
      .split("\n")
      .filter((line) => line.trim() !== ""),
    newOffset: fileStat.size,
  };
}

function runtimeFromFilename(filename: string): string | null {
  const match = filename.match(/^\d{4}-\d{2}-\d{2}\.(.+)\.jsonl$/);
  return match ? match[1] : null;
}

async function watchSource(
  source: DiscoveredSource,
  filter: QueryFilter,
  emit: (event: LogEvent) => void,
  offsets: Map<string, number>,
): Promise<FSWatcher> {
  const rawDir = path.join(source.kilogDir, "raw");
  try {
    await stat(rawDir);
  } catch {
    await mkdir(rawDir, { recursive: true });
  }

  for (const file of await readdir(rawDir).catch(() => [] as string[])) {
    if (!file.endsWith(".jsonl")) continue;
    if (filter.runtime && runtimeFromFilename(file) !== filter.runtime) continue;
    const filePath = path.join(rawDir, file);
    offsets.set(filePath, (await stat(filePath)).size);
  }

  async function processFile(filePath: string): Promise<void> {
    const filename = path.basename(filePath);
    if (filter.runtime && runtimeFromFilename(filename) !== filter.runtime) return;

    const offset = offsets.get(filePath) ?? 0;
    try {
      const { lines, newOffset } = await readNewLines(filePath, offset);
      offsets.set(filePath, newOffset);
      for (const line of lines) {
        try {
          const event = deserialize(line);
          if (matchesEvent(event, source, filter)) emit(event);
        } catch {
          // Ignore malformed JSONL fragments.
        }
      }
      if (lines.length > 0) await catchUpSource(source);
    } catch {
      // File may have been removed or rotated.
    }
  }

  return watch(rawDir, async (_eventType, filename) => {
    if (!filename || !filename.endsWith(".jsonl")) return;
    await processFile(path.join(rawDir, filename));
  });
}

export async function handleLogs(options: LogsOptions): Promise<void> {
  const sources = await discoverSources([options.root]);
  const filter = buildFilter(options);
  const emitLine = options.onLine ?? ((line: string) => process.stdout.write(line + "\n"));
  const emitEvent = (event: LogEvent): void => {
    if (options.json) {
      emitLine(JSON.stringify(event));
      return;
    }
    emitLine(formatLogLine(event, { timestamps: options.timestamps ?? true }));
  };

  const backfill = await readBackfill(sources, filter, options.tail);
  for (const event of backfill) emitEvent(event);

  if (!options.follow) return;
  if (sources.length === 0) return;

  const signal = options.signal ?? new AbortController().signal;
  const watchers: FSWatcher[] = [];
  const offsets = new Map<string, number>();
  for (const source of sources) {
    watchers.push(await watchSource(source, filter, emitEvent, offsets));
  }

  signal.addEventListener("abort", () => {
    for (const watcher of watchers) watcher.close();
  });

  return new Promise<void>((resolve) => {
    signal.addEventListener("abort", () => resolve());
  });
}
