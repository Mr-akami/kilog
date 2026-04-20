import path from "node:path";
import type { Runtime } from "../schema/types.js";

export const LOGIT_DIR_NAME = ".logit";
export const RAW_DIR = ".logit/raw";
export const INDEX_DIR = ".logit/index";
export const DB_FILE = "logs.duckdb";

export function dbFilePath(baseDir: string): string {
  return path.join(baseDir, INDEX_DIR, DB_FILE);
}

/** Given a `.logit/` directory (absolute), return the path to its DuckDB file. */
export function dbFilePathFromLogitDir(logitDir: string): string {
  return path.join(logitDir, "index", DB_FILE);
}

export function rawFileName(date: string, runtime: Runtime): string {
  return `${date}.${runtime}.jsonl`;
}

export function rawFilePath(baseDir: string, date: string, runtime: Runtime): string {
  return path.join(baseDir, RAW_DIR, rawFileName(date, runtime));
}
