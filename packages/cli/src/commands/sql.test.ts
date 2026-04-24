import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { serialize } from "@kilog/core";
import type { ConsoleEvent } from "@kilog/core";
import { handleSql } from "./sql.js";

function makeConsoleEvent(overrides?: Partial<ConsoleEvent>): ConsoleEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-04-18T10:00:00.000Z",
    runtime: "node",
    session: "sess-1",
    type: "console",
    level: "info",
    message: "test message",
    ...overrides,
  };
}

function captureStdout(fn: () => Promise<void>): Promise<string> {
  const chunks: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: string | Uint8Array) => {
    chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
    return true;
  };
  return fn()
    .finally(() => {
      process.stdout.write = originalWrite;
    })
    .then(() => chunks.join(""));
}

function captureOutput(fn: () => Promise<void>): Promise<{ stdout: string; stderr: string }> {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stdout.write = (chunk: string | Uint8Array) => {
    stdoutChunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
    return true;
  };
  process.stderr.write = (chunk: string | Uint8Array) => {
    stderrChunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
    return true;
  };
  return fn()
    .finally(() => {
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
    })
    .then(() => ({ stdout: stdoutChunks.join(""), stderr: stderrChunks.join("") }));
}

describe("handleSql", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "kilog-cli-sql-"));
    for (const name of ["app-a", "app-b"]) {
      const rawDir = path.join(root, name, ".kilog", "raw");
      await mkdir(rawDir, { recursive: true });
      await writeFile(
        path.join(rawDir, "2026-04-18.node.jsonl"),
        serialize(makeConsoleEvent({ message: name, timestamp: "2026-04-18T10:00:00.000Z" })) +
          "\n",
      );
    }
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("runs SQL against every discovered source", async () => {
    const { stdout, stderr } = await captureOutput(() =>
      handleSql({ root, sql: "SELECT message FROM logs ORDER BY timestamp", json: true }),
    );
    const rows = JSON.parse(stdout) as Record<string, unknown>[];
    expect(
      rows.map((row) => row.project).sort((a, b) => String(a).localeCompare(String(b))),
    ).toEqual(["app-a", "app-b"]);
    expect(stderr).toContain("running across 2 sources");
  });

  it("appends source metadata after selected columns", async () => {
    const output = await captureStdout(() =>
      handleSql({ root, sql: "SELECT message FROM logs ORDER BY timestamp", json: true }),
    );
    const rows = JSON.parse(output) as Record<string, unknown>[];
    expect(Object.keys(rows[0])).toEqual(["message", "source", "project"]);
  });

  it("prints schema information", async () => {
    const output = await captureStdout(() => handleSql({ root, schema: true }));
    expect(output).toContain("logs");
    expect(output).toContain("timestamp");
  });

  it("does not warn when targeting a single project", async () => {
    const { stderr } = await captureOutput(() =>
      handleSql({
        root,
        project: "app-a",
        sql: "SELECT COUNT(*) AS count FROM logs",
        json: true,
      }),
    );
    expect(stderr).toBe("");
  });
});
