import path from "node:path";
import type { Runtime } from "../schema/types.js";

export const KILOG_DIR_NAME = ".kilog";
export const RAW_DIR = ".kilog/raw";
export const INDEX_DIR = ".kilog/index";
export const DB_FILE = "logs.duckdb";

export function dbFilePath(baseDir: string): string {
  return path.join(baseDir, INDEX_DIR, DB_FILE);
}

/** Given a `.kilog/` directory (absolute), return the path to its DuckDB file. */
export function dbFilePathFromKilogDir(kilogDir: string): string {
  return path.join(kilogDir, "index", DB_FILE);
}

export function rawFileName(date: string, runtime: Runtime): string {
  return `${date}.${runtime}.jsonl`;
}

export function rawFilePath(baseDir: string, date: string, runtime: Runtime): string {
  return path.join(baseDir, RAW_DIR, rawFileName(date, runtime));
}
