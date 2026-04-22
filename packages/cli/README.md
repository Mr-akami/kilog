# @kilog/cli

TEST
The `kilog` command. Search, browse, and manage `.kilog/` across every project under your invocation directory.

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
- Each discovered `.kilog/` keeps its own independent `index/logs.duckdb` — there is no unified database. Results from multiple projects are merged in memory at query time.

## Commands

### `tail` — stream new entries in real time

```bash
pnpm kilog tail
pnpm kilog tail --runtime node
pnpm kilog tail --root ../other-project
```

Streams like `tail -f` across every `.kilog/raw/` under the root. Exit with Ctrl+C.

### `query` — search / filter

```bash
pnpm kilog query                          # all
pnpm kilog query --level error            # only error level
pnpm kilog query --type network           # only fetch events
pnpm kilog query --project web-ui         # only one project
pnpm kilog query --search "httpbin"                 # single term
pnpm kilog query --search "db AND timeout"          # AND
pnpm kilog query --search "ENOENT OR EACCES"        # OR
pnpm kilog query --search "error AND NOT timeout"   # NOT
pnpm kilog query --last 10m                          # last 10 minutes
pnpm kilog query --last 2h                           # last 2 hours
pnpm kilog query --last 3d                           # last 3 days
pnpm kilog query --from 2026-04-20 --to 2026-04-21
pnpm kilog query --limit 50 --offset 100
pnpm kilog query --json                   # JSON output
pnpm kilog query --aggregate              # per-project counts
```

Filters:

| Option                 | Value                                                   | Description                                               |
| ---------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| `--runtime`            | `node` / `browser` / `bun` / `deno`                     | Runtime                                                   |
| `--type`               | `console` / `error` / `network` / `unhandled-rejection` | Event type                                                |
| `--level`              | `debug` / `info` / `warn` / `error`                     | Log level                                                 |
| `--project`            | string                                                  | Project label (see the `doctor` output)                   |
| `--search`             | string                                                  | Message search (see syntax below)                         |
| `--last`               | `<N>(s\|m\|h\|d\|w)` e.g. `10m`, `2h`, `3d`             | Relative window ending at now. Overrides `--from`/`--to`. |
| `--from` / `--to`      | ISO datetime                                            | Date range                                                |
| `--limit` / `--offset` | number                                                  | Paging (applied after merge)                              |
| `--json`               | flag                                                    | JSON output                                               |
| `--aggregate`          | flag                                                    | Per-project count aggregation                             |
| `--root`               | path                                                    | Override the discovery root (default: cwd)                |

Under the hood, `query` opens each project's DuckDB, does a differential catch-up from the raw JSONL (only new bytes since last run), runs the filter, and merges results sorted by timestamp.

#### `--search` syntax

- Case-insensitive substring match against message.
- Operators (uppercase only): `AND`, `OR`, `NOT`. AND binds tighter than OR. No parentheses.
- Escape operators / backslash as `\AND` `\OR` `\NOT` `\\`.
- `%` / `_` in the term are treated as literal.

```
foo                         single term
connection refused          phrase (spaces are literal)
a AND b                     both
a OR b                      either
a AND NOT b                 a but not b
NOT timeout                 exclude
a AND b OR c                (a AND b) OR c
foo \AND bar                literal "foo AND bar"
```

### `ui` — start the Web UI

```bash
pnpm kilog ui                 # http://localhost:3000
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
