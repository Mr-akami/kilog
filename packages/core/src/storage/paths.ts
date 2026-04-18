import path from "node:path";
import type { Runtime } from "../schema/types.js";

export const DEVLOGS_DIR = ".devlogs";
export const RAW_DIR = ".devlogs/raw";
export const INDEX_DIR = ".devlogs/index";

export function rawFileName(date: string, runtime: Runtime): string {
  return `${date}.${runtime}.jsonl`;
}

export function rawFilePath(baseDir: string, date: string, runtime: Runtime): string {
  return path.join(baseDir, RAW_DIR, rawFileName(date, runtime));
}
