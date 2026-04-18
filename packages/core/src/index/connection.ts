import { DuckDBInstance } from "@duckdb/node-api";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export async function openIndex(dbPath: string): Promise<DuckDBInstance> {
  await mkdir(path.dirname(dbPath), { recursive: true });
  const instance = await DuckDBInstance.create(dbPath);
  return instance;
}

export async function closeIndex(instance: DuckDBInstance): Promise<void> {
  // DuckDBInstance doesn't have an explicit close in newer API
  // but we call it if available
  if (typeof (instance as any).close === "function") {
    await (instance as any).close();
  }
}
