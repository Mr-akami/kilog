#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import { handleLogs } from "./commands/logs.js";
import { handleSql } from "./commands/sql.js";
import { handleStats } from "./commands/stats.js";
import { handleReindex } from "./commands/reindex.js";
import { handlePrune } from "./commands/prune.js";
import { handleDoctor } from "./commands/doctor.js";
import { handleUi } from "./commands/ui.js";
import type { Runtime, EventType, LogLevel } from "@kilog/core";

function resolveRoot(argvRoot: unknown): string {
  return path.resolve(typeof argvRoot === "string" ? argvRoot : process.cwd());
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return [];
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

const cli = cac("kilog");

cli.option(
  "--root <path>",
  "Scan scope for .kilog/ discovery (default: cwd). Each .kilog/ keeps its own independent index.",
);

cli
  .command("logs [...targets]", "Show logs, optionally following new entries")
  .option("-f, --follow", "Follow new log entries after printing the backfill")
  .option(
    "--since <time>",
    "Show logs since ISO time or relative duration (e.g. 10m, 2h)",
  )
  .option(
    "--until <time>",
    "Show logs until ISO time or relative duration (e.g. 10m, 2h)",
  )
  .option(
    "-n, --tail <n>",
    "Show only the last N log entries before following or exiting",
  )
  .option("--runtime <runtime>", "Filter by runtime")
  .option("--type <type>", "Filter by event type")
  .option("--level <level>", "Filter by log level")
  .option("--project <name>", "Filter by one or more project labels")
  .option("--json", "Output backfill as JSON")
  .option("--no-timestamps", "Hide timestamps")
  .action(async (targets: string[], opts) => {
    const ac = new AbortController();
    process.on("SIGINT", () => ac.abort());
    const projectOpts = toArray(opts.project);
    await handleLogs({
      root: resolveRoot(opts.root),
      signal: ac.signal,
      follow: opts.follow as boolean | undefined,
      since: opts.since as string | undefined,
      until: opts.until as string | undefined,
      tail: toNumber(opts.tail),
      runtime: opts.runtime as Runtime | undefined,
      type: opts.type as EventType | undefined,
      level: opts.level as LogLevel | undefined,
      project: projectOpts[0],
      projects: [...projectOpts, ...toArray(targets)],
      json: opts.json as boolean | undefined,
      timestamps: opts.timestamps !== false,
    });
  });

cli
  .command(
    "sql [sql]",
    "Run raw SQL against each discovered .kilog DuckDB index",
  )
  .option("--project <name>", "Filter by project label")
  .option("--json", "Output as JSON")
  .option("--schema", "Print logs/sources schema")
  .action(async (sql: string | undefined, opts) => {
    await handleSql({
      root: resolveRoot(opts.root),
      sql: typeof sql === "string" ? sql : undefined,
      project: opts.project as string | undefined,
      json: opts.json as boolean | undefined,
      schema: opts.schema as boolean | undefined,
    });
  });

cli
  .command("stats", "Show aggregate log counts")
  .option(
    "--since <time>",
    "Count logs since ISO time or relative duration (e.g. 10m, 2h)",
  )
  .option(
    "--until <time>",
    "Count logs until ISO time or relative duration (e.g. 10m, 2h)",
  )
  .option("--runtime <runtime>", "Filter by runtime")
  .option("--type <type>", "Filter by event type")
  .option("--level <level>", "Filter by log level")
  .option("--project <name>", "Filter by project label")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    await handleStats({
      root: resolveRoot(opts.root),
      runtime: opts.runtime as Runtime | undefined,
      type: opts.type as EventType | undefined,
      level: opts.level as LogLevel | undefined,
      project: opts.project as string | undefined,
      since: opts.since as string | undefined,
      until: opts.until as string | undefined,
      json: opts.json as boolean | undefined,
    });
  });

cli
  .command("reindex", "Rebuild the DuckDB index for every discovered .kilog/")
  .action(async (opts) => {
    await handleReindex({ root: resolveRoot(opts.root) });
  });

cli
  .command("prune", "Delete old log files")
  .option("--before <date>", "Delete logs before this date (YYYY-MM-DD)")
  .action(async (opts) => {
    if (typeof opts.before !== "string" || opts.before === "") {
      process.stderr.write("error: --before <date> is required\n");
      process.exit(1);
    }
    await handlePrune({
      root: resolveRoot(opts.root),
      before: opts.before,
    });
  });

cli
  .command(
    "doctor",
    "Check .kilog health and per-project index consistency",
  )
  .action(async (opts) => {
    await handleDoctor({ root: resolveRoot(opts.root) });
  });

cli
  .command("ui", "Start the web UI server")
  .option("--port <port>", "Server port", { default: 3210 })
  .action(async (opts) => {
    await handleUi({
      root: resolveRoot(opts.root),
      port: toNumber(opts.port) ?? 3210,
    });
  });

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as { version: string };

cli.version(pkg.version);
cli.help();

try {
  const parsed = cli.parse(process.argv, { run: false });
  if (parsed.options.help || parsed.options.version) {
    // cac already printed the requested output; exit cleanly.
    process.exit(0);
  }
  if (!cli.matchedCommand) {
    cli.outputHelp();
    process.exit(1);
  }
  await cli.runMatchedCommand();
} catch (err) {
  process.stderr.write(`${(err as Error).message}\n`);
  process.exit(1);
}
