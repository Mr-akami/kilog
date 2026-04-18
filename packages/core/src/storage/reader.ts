import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import path from "node:path";
import { deserialize } from "../serialize/serializer.js";
import { RAW_DIR } from "./paths.js";
import type { LogEvent } from "../schema/types.js";

export async function* readLogFile(filePath: string): AsyncGenerator<LogEvent> {
  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim() === "") continue;
    yield deserialize(line);
  }
}

export async function listRawFiles(baseDir: string): Promise<string[]> {
  const rawDir = path.join(baseDir, RAW_DIR);
  try {
    const files = await readdir(rawDir);
    return files
      .filter((f: string) => f.endsWith(".jsonl"))
      .map((f: string) => path.join(rawDir, f));
  } catch {
    return [];
  }
}
