import { DuckDBInstance } from "@duckdb/node-api";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  CREATE_LOGS_TABLE,
  CREATE_SOURCES_TABLE,
  ADD_LOGS_PROJECT_COLUMN,
  ADD_SOURCES_PROJECT_COLUMN,
} from "./schema.sql.js";

export async function openIndex(dbPath: string): Promise<DuckDBInstance> {
  await mkdir(path.dirname(dbPath), { recursive: true });
  const instance = await DuckDBInstance.create(dbPath);
  const conn = await instance.connect();
  await conn.run(CREATE_LOGS_TABLE);
  await conn.run(CREATE_SOURCES_TABLE);
  await conn.run(ADD_LOGS_PROJECT_COLUMN);
  await conn.run(ADD_SOURCES_PROJECT_COLUMN);
  return instance;
}

export async function closeIndex(instance: DuckDBInstance): Promise<void> {
  const maybeCloseable = instance as { close?: () => Promise<void> };
  if (typeof maybeCloseable.close === "function") {
    await maybeCloseable.close();
  }
}
