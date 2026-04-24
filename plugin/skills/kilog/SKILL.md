---
name: kilog
description: Use when the user wants to inspect, search, or stream dev-time logs captured by the kilog tool — phrases like "check my logs", "logs from 10 minutes ago", "grep logs for X", "errors from today", "all logs in project foo", "why did that fetch fail", or any request that implies reading from a `.kilog/` store. Maps natural-language intent to the right `kilog` CLI invocation (logs, sql, stats, reindex, prune, doctor, ui) with correct flags, instead of cat-ing JSONL files. Trigger even when the user doesn't say "kilog" explicitly, whenever log inspection in a kilog-instrumented project is the goal.
---

# kilog CLI skill

`kilog` records dev-time `console.*`, `fetch`, and uncaught errors into per-project `.kilog/` stores (JSONL + DuckDB index). Route user intent to the right invocation.

## When to trigger

Reach for this skill whenever the user wants to read or reason about captured dev logs in a kilog-instrumented project. The user rarely says "kilog" — infer from intent.

- **Strong triggers** (almost always kilog): "show me the logs", "check the logs", "tail the logs", "what's in the logs", "grep the logs for X", "errors from today", "last 10 minutes of logs", "live stream", "what did the API return", "なんのログが出てる", "ログを見て", "ログを調査", "ログに X は出てる?".
- **Likely triggers** (investigate via logs first): "why did <request> fail", "debug this fetch", "what happened when I clicked X", "the page broke — why", "調査して", "原因を見て", "何が起きた" — if the project uses kilog, default to `kilog logs` (filtered by `--level error` / `--type network` / `--since` as appropriate) before guessing.
- **Do not trigger** for: setting up kilog itself, adding instrumentation, editing config, or reading non-captured sources (server access logs, docker logs, CI output).

## Scope

`kilog` walks down from cwd (or `--root <path>`) and operates on every `.kilog/` it finds. `logs` / `sql` / `stats` auto-catch-up the index — **never run `reindex` before querying**. Invoke as `pnpm kilog <cmd>` in a workspace, or `kilog <cmd>` if globally installed.

## Intent → command

| Intent                                | Command                                             |
| ------------------------------------- | --------------------------------------------------- |
| "logs from the last N min/hours/days" | `logs --since 10m` / `--since 2h` / `--since 3d`    |
| "grep logs for X"                     | `logs ... \| rg X`                                  |
| "logs for project foo"                | `logs foo` (positional) or `--project foo`          |
| "errors only"                         | `logs --level error`                                |
| "browser fetch failures"              | `logs --runtime browser --type network`             |
| "live stream" / "tail -f"             | `logs -f`                                           |
| "open UI"                             | `ui [--port 3210]`                                  |
| "run SQL"                             | `sql "<query>"`                                     |
| "delete logs before date"             | `prune --before YYYY-MM-DD` (destructive — confirm) |
| "health check" / "is it set up"       | `doctor`                                            |

## `kilog logs` flags

- `--since <t>` / `--until <t>` — relative `<N>(s|m|h|d|w)` (e.g. `10m`, `2h`, `3d`) **or** ISO 8601 (`2026-04-21T12:00:00Z`). No compound (`1h30m`), no named (`10min`, `2hr`) — CLI errors on invalid input.
- `-f`, `--follow` — print backfill then stream
- `-n`, `--tail <n>` — last N entries
- `--runtime node|browser|bun|deno`
- `--type console|network|error|unhandled-rejection`
- `--level debug|info|warn|error`
- `--project <name>` — or pass as trailing positional args: `kilog logs app-a app-b`
- `--json` — NDJSON (1 event / line). Pipe with `jq 'select(.level=="error")'`, not `jq '.[]'`.
- `--no-timestamps`

Text search: pipe to `rg`. Kilog has no built-in regex or boolean search.

## `kilog sql "<query>"`

Raw SQL against every discovered `.kilog/index/logs.duckdb`, rows tagged with `source` / `project`. `LIMIT` applies per source.

- `--json` — rows as JSON
- `--schema` — dump `logs` / `sources` schema
- `--project <name>` — restrict sources

## `kilog stats`

Aggregate counts by project / runtime / type / level. Same filters as `logs`. Good first call when project names are unknown.

## Rules

- **Prefer `kilog logs` over cat of `.kilog/raw/*.jsonl`** — CLI resolves sourcemaps and returns typed events.
- **Never invoke `prune` without explicit confirmation.** Destructive, irreversible.
- **Never invent flags.** Relative windows → `--since 10m` etc. Last-N output → `--tail N`.
- **Default scope is wide** (every `.kilog/` under cwd). Narrow with `--project` / positional target / `--root` when the user implies one project; mention when the fan-out may be wider than wanted.
- **Empty result?** Run `doctor` first — index drift is rare, but missing instrumentation (`--import @kilog/register` or `@kilog/vite-plugin`) is common.
