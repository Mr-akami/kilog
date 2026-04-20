import { watch, type FSWatcher } from "node:fs";
import { readdir, stat, open, mkdir } from "node:fs/promises";
import path from "node:path";
import { deserialize, findDevlogsDirs } from "@logit/core";
import type { Runtime } from "@logit/core";
import { formatLogLine } from "../format/log-line.js";

export interface TailOptions {
  root: string;
  signal: AbortSignal;
  onLine: (line: string) => void;
  runtime?: Runtime;
}

async function readNewLines(
  filePath: string,
  offsetBytes: number,
): Promise<{ lines: string[]; newOffset: number }> {
  const fileStat = await stat(filePath);
  if (fileStat.size <= offsetBytes) {
    return { lines: [], newOffset: offsetBytes };
  }
  const buf = Buffer.alloc(fileStat.size - offsetBytes);
  const fileHandle = await open(filePath, "r");
  try {
    await fileHandle.read(buf, 0, buf.length, offsetBytes);
  } finally {
    await fileHandle.close();
  }

  const text = buf.toString("utf-8");
  const rawLines = text.split("\n").filter((l) => l.trim() !== "");
  return { lines: rawLines, newOffset: fileStat.size };
}

function runtimeFromFilename(filename: string): string | null {
  // e.g. "2026-04-18.node.jsonl" -> "node"
  const match = filename.match(/^\d{4}-\d{2}-\d{2}\.(.+)\.jsonl$/);
  return match ? match[1] : null;
}

async function watchRawDir(
  rawDir: string,
  options: TailOptions,
  fileOffsets: Map<string, number>,
): Promise<FSWatcher> {
  try {
    await stat(rawDir);
  } catch {
    await mkdir(rawDir, { recursive: true });
  }

  try {
    const files = await readdir(rawDir);
    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;
      if (options.runtime) {
        const rt = runtimeFromFilename(file);
        if (rt !== options.runtime) continue;
      }
      const filePath = path.join(rawDir, file);
      const fileStat = await stat(filePath);
      fileOffsets.set(filePath, fileStat.size);
    }
  } catch {
    // ignore
  }

  async function processFile(filePath: string): Promise<void> {
    const filename = path.basename(filePath);
    if (options.runtime) {
      const rt = runtimeFromFilename(filename);
      if (rt !== options.runtime) return;
    }

    const offset = fileOffsets.get(filePath) ?? 0;
    try {
      const { lines, newOffset } = await readNewLines(filePath, offset);
      fileOffsets.set(filePath, newOffset);
      for (const line of lines) {
        try {
          const event = deserialize(line);
          options.onLine(formatLogLine(event));
        } catch {
          // skip malformed lines
        }
      }
    } catch {
      // file may have been removed
    }
  }

  return watch(rawDir, async (_eventType, filename) => {
    if (!filename || !filename.endsWith(".jsonl")) return;
    const filePath = path.join(rawDir, filename);
    await processFile(filePath);
  });
}

export async function handleTail(options: TailOptions): Promise<void> {
  const dirs = await findDevlogsDirs(options.root);
  const rawDirs = dirs.length > 0
    ? dirs.map((d) => path.join(d, "raw"))
    : [path.join(options.root, ".devlogs", "raw")]; // watch even if not yet created

  const fileOffsets = new Map<string, number>();
  const watchers: FSWatcher[] = [];

  for (const rawDir of rawDirs) {
    watchers.push(await watchRawDir(rawDir, options, fileOffsets));
  }

  options.signal.addEventListener("abort", () => {
    for (const w of watchers) w.close();
  });

  return new Promise<void>((resolve) => {
    options.signal.addEventListener("abort", () => resolve());
  });
}
