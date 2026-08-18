import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { RAW_DIR } from "./paths.js";
import { rawFileName } from "./paths.js";
import { serialize } from "../serialize/serializer.js";
import type { LogEvent } from "../schema/types.js";

export interface WriterOptions {
  baseDir: string;
  redactor?: (event: LogEvent) => LogEvent;
}

export interface Writer {
  append(event: LogEvent): Promise<void>;
  close(): Promise<void>;
}

export function createWriter(options: WriterOptions): Writer {
  const { baseDir, redactor } = options;
  let initialized = false;
  let rawDir: string;

  async function ensureDir(): Promise<void> {
    if (!initialized) {
      rawDir = path.join(baseDir, RAW_DIR);
      await mkdir(rawDir, { recursive: true });
      initialized = true;
    }
  }

  return {
    async append(event: LogEvent): Promise<void> {
      await ensureDir();
      const processed = redactor ? redactor(event) : event;
      const line = serialize(processed);
      const date = event.timestamp.slice(0, 10);
      const fileName = rawFileName(date, event.runtime);
      const filePath = path.join(rawDir, fileName);
      await appendFile(filePath, line + "\n");
    },
    async close(): Promise<void> {
      // no-op for file-based writer
    },
  };
}
