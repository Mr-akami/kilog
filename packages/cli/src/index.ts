#!/usr/bin/env node
import path from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { handleTail } from "./commands/tail.js";
import { handleQuery } from "./commands/query.js";
import { handleReindex } from "./commands/reindex.js";
import { handlePrune } from "./commands/prune.js";
import { handleDoctor } from "./commands/doctor.js";
import { handleUi } from "./commands/ui.js";
import type { Runtime, EventType, LogLevel } from "@logit/core";

function resolveRoot(argvRoot: string | undefined): string {
  return path.resolve(argvRoot ?? process.cwd());
}

yargs(hideBin(process.argv))
  .scriptName("logit")
  .option("root", {
    type: "string",
    describe:
      "Scan scope for .logit/ discovery (default: cwd). Each .logit/ keeps its own independent index.",
  })
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
        root: resolveRoot(argv.root),
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
        .option("project", { type: "string", describe: "Filter by project label" })
        .option("search", { type: "string", describe: "Full-text search" })
        .option("from", { type: "string", describe: "Start date (ISO)" })
        .option("to", { type: "string", describe: "End date (ISO)" })
        .option("limit", { type: "number", describe: "Max results" })
        .option("offset", { type: "number", describe: "Skip N results" })
        .option("json", { type: "boolean", describe: "Output as JSON" })
        .option("aggregate", {
          type: "boolean",
          describe: "Aggregate mode (counts per project)",
        }),
    async (argv) => {
      await handleQuery({
        root: resolveRoot(argv.root),
        runtime: argv.runtime as Runtime | undefined,
        type: argv.type as EventType | undefined,
        level: argv.level as LogLevel | undefined,
        project: argv.project,
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
    "Rebuild the DuckDB index for every discovered .logit/",
    () => {},
    async (argv) => {
      await handleReindex({ root: resolveRoot(argv.root) });
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
      await handlePrune({ root: resolveRoot(argv.root), before: argv.before });
    },
  )
  .command(
    "doctor",
    "Check .logit health and per-project index consistency",
    () => {},
    async (argv) => {
      await handleDoctor({ root: resolveRoot(argv.root) });
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
      await handleUi({ root: resolveRoot(argv.root), port: argv.port });
    },
  )
  .demandCommand(1, "Please specify a command")
  .strict()
  .help()
  .parse();
