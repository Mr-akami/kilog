#!/usr/bin/env node
import path from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { handleLogs } from "./commands/logs.js";
import { handleSql } from "./commands/sql.js";
import { handleStats } from "./commands/stats.js";
import { handleReindex } from "./commands/reindex.js";
import { handlePrune } from "./commands/prune.js";
import { handleDoctor } from "./commands/doctor.js";
import { handleUi } from "./commands/ui.js";
import type { Runtime, EventType, LogLevel } from "@kilog/core";

function resolveRoot(argvRoot: string | undefined): string {
  return path.resolve(argvRoot ?? process.cwd());
}

void yargs(hideBin(process.argv))
  .scriptName("kilog")
  .option("root", {
    type: "string",
    describe:
      "Scan scope for .kilog/ discovery (default: cwd). Each .kilog/ keeps its own independent index.",
  })
  .command(
    "logs [targets..]",
    "Show logs, optionally following new entries",
    (y) =>
      y
        .option("follow", {
          alias: "f",
          type: "boolean",
          describe: "Follow new log entries after printing the backfill",
        })
        .option("since", {
          type: "string",
          describe: "Show logs since ISO time or relative duration (e.g. 10m, 2h)",
        })
        .option("until", {
          type: "string",
          describe: "Show logs until ISO time or relative duration (e.g. 10m, 2h)",
        })
        .option("tail", {
          alias: "n",
          type: "number",
          describe: "Show only the last N log entries before following or exiting",
        })
        .option("runtime", { type: "string", describe: "Filter by runtime" })
        .option("type", { type: "string", describe: "Filter by event type" })
        .option("level", { type: "string", describe: "Filter by log level" })
        .option("project", {
          type: "string",
          array: true,
          describe: "Filter by one or more project labels",
        })
        .option("json", { type: "boolean", describe: "Output backfill as JSON" })
        .option("timestamps", {
          type: "boolean",
          default: true,
          describe: "Show timestamps",
        }),
    async (argv) => {
      const ac = new AbortController();
      process.on("SIGINT", () => ac.abort());
      await handleLogs({
        root: resolveRoot(argv.root),
        signal: ac.signal,
        follow: argv.follow,
        since: argv.since,
        until: argv.until,
        tail: argv.tail,
        runtime: argv.runtime as Runtime | undefined,
        type: argv.type as EventType | undefined,
        level: argv.level as LogLevel | undefined,
        project: argv.project?.[0],
        projects: [
          ...(Array.isArray(argv.project) ? argv.project : []),
          ...((argv.targets ?? []) as string[]),
        ],
        json: argv.json,
        timestamps: argv.timestamps,
      });
    },
  )
  .command(
    "sql [sql]",
    "Run raw SQL against each discovered .kilog DuckDB index",
    (y) =>
      y
        .option("project", { type: "string", describe: "Filter by project label" })
        .option("json", { type: "boolean", describe: "Output as JSON" })
        .option("schema", { type: "boolean", describe: "Print logs/sources schema" }),
    async (argv) => {
      await handleSql({
        root: resolveRoot(argv.root),
        sql: typeof argv.sql === "string" ? argv.sql : undefined,
        project: argv.project,
        json: argv.json,
        schema: argv.schema,
      });
    },
  )
  .command(
    "stats",
    "Show aggregate log counts",
    (y) =>
      y
        .option("since", {
          type: "string",
          describe: "Count logs since ISO time or relative duration (e.g. 10m, 2h)",
        })
        .option("until", {
          type: "string",
          describe: "Count logs until ISO time or relative duration (e.g. 10m, 2h)",
        })
        .option("runtime", { type: "string", describe: "Filter by runtime" })
        .option("type", { type: "string", describe: "Filter by event type" })
        .option("level", { type: "string", describe: "Filter by log level" })
        .option("project", { type: "string", describe: "Filter by project label" })
        .option("json", { type: "boolean", describe: "Output as JSON" }),
    async (argv) => {
      await handleStats({
        root: resolveRoot(argv.root),
        runtime: argv.runtime as Runtime | undefined,
        type: argv.type as EventType | undefined,
        level: argv.level as LogLevel | undefined,
        project: argv.project,
        since: argv.since,
        until: argv.until,
        json: argv.json,
      });
    },
  )
  .command(
    "reindex",
    "Rebuild the DuckDB index for every discovered .kilog/",
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
    "Check .kilog health and per-project index consistency",
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
        default: 3210,
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
