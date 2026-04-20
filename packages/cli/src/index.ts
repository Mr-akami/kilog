#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { handleTail } from "./commands/tail.js";
import { handleQuery } from "./commands/query.js";
import { handleReindex } from "./commands/reindex.js";
import { handlePrune } from "./commands/prune.js";
import { handleDoctor } from "./commands/doctor.js";
import { handleUi } from "./commands/ui.js";
import { dbFilePath } from "@logit/core";
import type { Runtime, EventType, LogLevel } from "@logit/core";

const DEFAULT_BASE_DIR = process.cwd();
const DEFAULT_DB_PATH = dbFilePath(DEFAULT_BASE_DIR);

yargs(hideBin(process.argv))
  .scriptName("logit")
  .command(
    "tail",
    "Stream new log entries in real-time",
    (y) =>
      y.option("runtime", {
        type: "string",
        describe: "Filter by runtime",
      }),
    async (argv) => {
      const ac = new AbortController();
      process.on("SIGINT", () => ac.abort());
      await handleTail({
        baseDir: DEFAULT_BASE_DIR,
        signal: ac.signal,
        onLine: (line) => process.stdout.write(line + "\n"),
        runtime: argv.runtime as Runtime | undefined,
      });
    },
  )
  .command(
    "query",
    "Search logs with filters",
    (y) =>
      y
        .option("runtime", { type: "string", describe: "Filter by runtime" })
        .option("type", { type: "string", describe: "Filter by event type" })
        .option("level", { type: "string", describe: "Filter by log level" })
        .option("search", { type: "string", describe: "Full-text search" })
        .option("from", { type: "string", describe: "Start date (ISO)" })
        .option("to", { type: "string", describe: "End date (ISO)" })
        .option("limit", { type: "number", describe: "Max results" })
        .option("offset", { type: "number", describe: "Skip N results" })
        .option("json", { type: "boolean", describe: "Output as JSON" })
        .option("aggregate", {
          type: "boolean",
          describe: "Aggregate mode",
        }),
    async (argv) => {
      await handleQuery({
        baseDir: DEFAULT_BASE_DIR,
        dbPath: DEFAULT_DB_PATH,
        runtime: argv.runtime as Runtime | undefined,
        type: argv.type as EventType | undefined,
        level: argv.level as LogLevel | undefined,
        search: argv.search,
        from: argv.from,
        to: argv.to,
        limit: argv.limit,
        offset: argv.offset,
        json: argv.json,
        aggregate: argv.aggregate,
      });
    },
  )
  .command(
    "reindex",
    "Rebuild the DuckDB index from raw JSONL files",
    () => {},
    async () => {
      await handleReindex({
        baseDir: DEFAULT_BASE_DIR,
        dbPath: DEFAULT_DB_PATH,
      });
    },
  )
  .command(
    "prune",
    "Delete old log files",
    (y) =>
      y.option("before", {
        type: "string",
        demandOption: true,
        describe: "Delete logs before this date (YYYY-MM-DD)",
      }),
    async (argv) => {
      await handlePrune({
        baseDir: DEFAULT_BASE_DIR,
        before: argv.before,
      });
    },
  )
  .command(
    "doctor",
    "Check .devlogs health and index consistency",
    () => {},
    async () => {
      await handleDoctor({
        baseDir: DEFAULT_BASE_DIR,
        dbPath: DEFAULT_DB_PATH,
      });
    },
  )
  .command(
    "ui",
    "Start the web UI server",
    (y) =>
      y.option("port", {
        type: "number",
        default: 3000,
        describe: "Server port",
      }),
    async (argv) => {
      await handleUi({
        baseDir: DEFAULT_BASE_DIR,
        port: argv.port,
      });
    },
  )
  .demandCommand(1, "Please specify a command")
  .strict()
  .help()
  .parse();
