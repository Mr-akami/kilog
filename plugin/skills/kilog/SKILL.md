---
name: kilog
description: Use when the user wants to inspect, search, or stream dev-time logs captured by the kilog tool — phrases like "check my logs", "logs from 10 minutes ago", "grep logs for X", "errors from today", "all logs in project foo", "why did that fetch fail", or any request that implies reading from a `.kilog/` store. Maps natural-language intent to the right `kilog` CLI invocation (logs, sql, stats, reindex, prune, doctor, ui) with correct flags, instead of cat-ing JSONL files. Trigger even when the user doesn't say "kilog" explicitly, whenever log inspection in a kilog-instrumented project is the goal.
---

# kilog CLI skill

`kilog` is a dev-time log recorder: it captures `console.*`, `fetch`, and uncaught errors from Node and browser apps into per-project `.kilog/` stores (JSONL source-of-truth + DuckDB index). This skill maps user intent → the right CLI invocation. Use it whenever the user wants to look at captured logs.

## Core concept: per-project discovery, auto catch-up

`kilog` walks down from cwd (or `--root <path>`) and finds **every** `.kilog/` under it, treating each as an independent store. Results from a multi-project workspace are merged.

- Running from the workspace root fans out across all sub-projects. Usually wanted.
- Use `--project <name>` to scope to one.
- Use `--root <path>` to pin scope explicitly (e.g. when calling from a sibling dir).

`logs`, `sql`, and `stats` ingest any new JSONL lines into the DuckDB index automatically (incremental, offset-tracked). **You never need to "reindex before querying"** — just run the command.

## When to use

Route user intent like so:

| Intent                                | Command                                             |
| ------------------------------------- | --------------------------------------------------- |
| "logs from the last N min/hours/days" | `logs --since 10m` / `--since 2h` / `--since 3d`    |
| "grep logs for X" / "find X in logs"  | `logs ... \| rg X`                                  |
| "all logs for project foo"            | `logs --project foo`                                |
| "errors only" / "level=error"         | `logs --level error`                                |
| "browser fetch failures"              | `logs --runtime browser --type network`             |
| "live stream" / "tail -f style"       | `logs -f`                                           |
| "open UI" / "browser view"            | `ui`                                                |
| "run SQL"                             | `sql "<query>"`                                     |
| "delete logs before date"             | `prune --before YYYY-MM-DD` (destructive — confirm) |
| "health check" / "is it set up"       | `doctor`                                            |

If the user shows a JSONL path directly (e.g. `.kilog/raw/2026-04-21.node.jsonl`), still prefer `kilog logs` on the enclosing project — the CLI resolves sourcemaps, merges runtimes, and returns typed events. Cat loses this.

## Invocation

Inside a workspace that depends on `@kilog/cli`: `pnpm kilog <cmd>`. If globally installed: `kilog <cmd>`. Check the project's package.json to pick the right prefix.

## Command reference

Every command accepts `--root <path>` (default: cwd).

### `kilog logs` — primary log reader

Flags:

- `--since <time>` — relative duration or absolute start time. Duration is `<N><unit>` where unit is `s` / `m` / `h` / `d` / `w` (e.g. `10m`, `2h`, `3d`, `1w`).
- `--until <time>` — relative duration or absolute end time (ISO 8601, e.g. `2026-04-21T12:00:00Z`).
- `-f`, `--follow` — print backfill, then stream new entries.
- `-n`, `--tail <n>` — print the last N entries across all discovered logs.
- `--runtime node|browser`
- `--type console|network|error|unhandled-rejection`
- `--level debug|info|warn|error`
- `--project <name>` — project label (as labelled in the user's `.kilog/` or package discovery)
- `--json` — emit structured events instead of formatted lines. Use when piping to jq or processing further.
- `--no-timestamps` — hide timestamps in text output.

Results are merged across every `.kilog/` under `--root` and sorted chronologically.

For text search, pipe to `rg`. Kilog intentionally does not implement regex or boolean text search.

### `kilog sql "<query>"`

Run raw SQL against every discovered `.kilog/index/logs.duckdb` and merge the rows. SQL `LIMIT` applies per source.

- `--json` — emit rows as JSON.
- `--schema` — print `logs` and `sources` schema information.
- `--project <name>` — restrict source project.

### `kilog stats`

Aggregate counts by project/runtime/type/level. Same structured filters as `logs`. Useful when the user asks "what got logged where?" or to discover project names before filtering.

### `kilog ui [--port 3210]`

Start the Hono + DuckDB-wasm browser UI. Auto-shuts down when the tab closes. Use when the user wants an interactive view, ad-hoc SQL, or the richer browser display.

### `kilog prune --before YYYY-MM-DD`

Delete raw files older than date. **Destructive, not reversible.** Always confirm intent with the user before running; never invoke unsolicited.

### `kilog doctor`

Health check: enumerates discovered `.kilog/` directories, checks index consistency, reports drift. First stop when "logs look wrong".

## Time-window arguments

Two distinct flags, pick by intent:

- **Relative "the last N units"** → `--since <N><unit>` (unit ∈ `s m h d w`). Examples: `--since 10m`, `--since 2h`, `--since 1d`. No ISO math, no shell date trickery.
- **Absolute moment or range** → `--since <iso>` and optionally `--until <iso>`. ISO 8601 only (`2026-04-21T12:00:00Z`, `2026-04-21`).

If the user phrases the window as "last 10 minutes", "past hour", "within the last 3 days", reach for `--since`. If they say "from April 21 at noon" or name a specific timestamp, use that value with `--since` and add `--until` when they provide an end.

Compound durations (`1h30m`) and named units (`10min`, `2hr`) are NOT supported — use the single `<N><unit>` form. Passing an invalid duration to `--since` causes the CLI to error out with a clear message, so don't guess.

## Worked examples

### Logs from the last 10 minutes

```bash
pnpm kilog logs --since 10m
```

### Grep by keyword

```bash
pnpm kilog logs | rg "TypeError"
# Narrow structurally first:
pnpm kilog logs --level error | rg "TypeError"
```

### All logs for a given project

```bash
# Don't know the project name yet? list first:
pnpm kilog stats
# Then scope:
pnpm kilog logs --project my-app --tail 200
```

### Pipe into another tool

```bash
pnpm kilog logs --since 1h --json | jq '.[] | select(.level=="error") | .message'
```

### Browse in the UI

```bash
pnpm kilog ui          # default port 3210
pnpm kilog ui --port 4000
```

## Rules

- **Prefer `kilog logs` over cat of `.kilog/raw/*.jsonl`.** JSONL is raw source but the CLI resolves sourcemaps, merges runtimes/projects, and returns typed events. Dropping to cat loses these.
- **Never invoke `prune` without explicit user confirmation.** It deletes files and is not reversible. Ask, even if the user's intent seems clear.
- **Never invent flags.** For relative windows use `--since 10m` (or similar). For last-N output use `--tail N`.
- **`--root` defaults to cwd** and fans out across every child project. If the user's request implicitly scopes to one project, add `--project` or `cd` / `--root` into it. Mention when the fan-out result is broader than likely wanted.
- **Empty result? Run `doctor` before assuming "no logs exist".** Index drift is possible though rare, and missing instrumentation is more likely: verify the app registered `@kilog/register` (Node) or `@kilog/vite-plugin` (browser).
- **Large result sets:** default to `--tail 100` (or similar) unless the user explicitly wants everything. Mention the limit in the response so they can widen it.

## Troubleshooting quick-reference

| Symptom                        | Likely cause          | Next step                                       |
| ------------------------------ | --------------------- | ----------------------------------------------- |
| "no logs at all"               | app not instrumented  | check `--import @kilog/register` or vite plugin |
| "logs from yesterday missing"  | `prune` ran / rotated | check `.kilog/raw/*.jsonl` dates                |
| "too many projects in results" | scope too wide        | add `--project` or narrow `--root`              |
| `doctor` reports drift (rare)  | schema corruption     | `kilog reindex` (full rebuild — escape hatch)   |

## Non-goals

This skill does NOT:

- Modify app source to add instrumentation — that's a separate setup task.
- Parse raw JSONL outside the CLI — always delegate to `kilog logs` or `kilog sql`.
- Run `prune` or any destructive command without explicit user go-ahead.
