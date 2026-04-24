# @kilog/cli

The `kilog` command. Read, query, and manage `.kilog/` across every project under your invocation directory.

## Usage

Not published to npm yet, so `npx kilog` does not work. To use it from an app inside the workspace, add `@kilog/cli` as a devDependency:

```json
{
  "scripts": { "kilog": "kilog" },
  "devDependencies": { "@kilog/cli": "workspace:*" }
}
```

Then:

```bash
pnpm kilog <command>
# or
pnpm exec kilog <command>
```

Once published, `npx kilog <command>` will also work.

## How scope is resolved

- By default, the CLI walks **down** from the current working directory and finds every `.kilog/` under it.
- `--root <path>` overrides the starting point.
- Each discovered `.kilog/` keeps its own independent `index/logs.duckdb` — there is no unified database. `logs` and `stats` merge results in memory; `sql` runs the same SQL against each discovered index and merges result rows.

## Commands

### `logs` — show logs

```bash
pnpm kilog logs
pnpm kilog logs -f
pnpm kilog logs --since 10m
pnpm kilog logs --since 2026-04-20T10:00:00Z --until 2026-04-20T11:00:00Z
pnpm kilog logs --tail 100
pnpm kilog logs --level error --runtime node
pnpm kilog logs --project web-ui
pnpm kilog logs --json
pnpm kilog logs --no-timestamps
pnpm kilog logs --since 1h | rg -i 'timeout|econnreset'
```

`logs -f` follows new entries after printing the requested backfill. `--tail 0 -f` follows only new entries.

Filters:

| Option            | Value                                                   | Description                                |
| ----------------- | ------------------------------------------------------- | ------------------------------------------ |
| `-f`, `--follow`  | flag                                                    | Keep streaming new entries after backfill  |
| `--since`         | ISO datetime or `<N>(s\|m\|h\|d\|w)`                   | Start time                                 |
| `--until`         | ISO datetime or `<N>(s\|m\|h\|d\|w)`                   | End time                                   |
| `-n`, `--tail`    | number                                                  | Last N entries across all discovered logs  |
| `--runtime`       | `node` / `browser` / `bun` / `deno`                     | Runtime                                    |
| `--type`          | `console` / `error` / `network` / `unhandled-rejection` | Event type                                 |
| `--level`         | `debug` / `info` / `warn` / `error`                     | Log level                                  |
| `--project`       | string                                                  | Project label (see the `doctor` output)    |
| `--json`          | flag                                                    | JSON output for the backfill               |
| `--no-timestamps` | flag                                                    | Hide timestamps in text output             |
| `--root`          | path                                                    | Override the discovery root (default: cwd) |

`kilog` no longer implements text search. Pipe text output to `rg`, or use `--json` with `jq` for structured filtering.

### `sql` — raw DuckDB query

```bash
pnpm kilog sql "SELECT level, COUNT(*) FROM logs GROUP BY level"
pnpm kilog sql "SELECT timestamp, project, message FROM logs WHERE level = 'error'" --json
pnpm kilog sql --schema
```

`sql` discovers every `.kilog/` under `--root`, catches each index up from raw JSONL, runs the same SQL against each independent DuckDB, and merges rows for display. SQL `LIMIT` applies per source.

### `stats` — aggregate counts

```bash
pnpm kilog stats
pnpm kilog stats --since 1h
pnpm kilog stats --level error --json
```

Uses the same structured filters as `logs`.

### `ui` — start the Web UI

```bash
pnpm kilog ui                 # http://localhost:3210
pnpm kilog ui --port 4000
pnpm kilog ui --root ../other
```

The server auto-shuts down when you close the browser tab (via a heartbeat / beacon). See [`@kilog/web-ui`](../web-ui/README.md) for details.

### `reindex` — rebuild every index

```bash
pnpm kilog reindex
```

Discovers every `.kilog/` under the root and rebuilds each `index/logs.duckdb` from scratch. Useful after editing JSONL by hand or when a DB is corrupted.

### `prune` — delete old logs

```bash
pnpm kilog prune --before 2026-04-01
```

Deletes JSONL files older than the given date in every discovered `.kilog/raw/`.

### `doctor` — health check

```bash
pnpm kilog doctor
```

Lists every discovered `.kilog/`, the project label, raw event count, and index count. Flags any mismatches with a suggested `kilog reindex`.
