# @logit/cli

The `logit` command. Search, browse, and manage `.logit/` across every project under your invocation directory.

## Usage

Not published to npm yet, so `npx logit` does not work. To use it from an app inside the workspace, add `@logit/cli` as a devDependency:

```json
{
  "scripts": { "logit": "logit" },
  "devDependencies": { "@logit/cli": "workspace:*" }
}
```

Then:

```bash
pnpm logit <command>
# or
pnpm exec logit <command>
```

Once published, `npx logit <command>` will also work.

## How scope is resolved

- By default, the CLI walks **down** from the current working directory and finds every `.logit/` under it.
- `--root <path>` overrides the starting point.
- Each discovered `.logit/` keeps its own independent `index/logs.duckdb` — there is no unified database. Results from multiple projects are merged in memory at query time.

## Commands

### `tail` — stream new entries in real time

```bash
pnpm logit tail
pnpm logit tail --runtime node
pnpm logit tail --root ../other-project
```

Streams like `tail -f` across every `.logit/raw/` under the root. Exit with Ctrl+C.

### `query` — search / filter

```bash
pnpm logit query                          # all
pnpm logit query --level error            # only error level
pnpm logit query --type network           # only fetch events
pnpm logit query --project web-ui         # only one project
pnpm logit query --search "httpbin"                 # single term
pnpm logit query --search "db AND timeout"          # AND
pnpm logit query --search "ENOENT OR EACCES"        # OR
pnpm logit query --search "error AND NOT timeout"   # NOT
pnpm logit query --last 10m                          # last 10 minutes
pnpm logit query --last 2h                           # last 2 hours
pnpm logit query --last 3d                           # last 3 days
pnpm logit query --from 2026-04-20 --to 2026-04-21
pnpm logit query --limit 50 --offset 100
pnpm logit query --json                   # JSON output
pnpm logit query --aggregate              # per-project counts
```

Filters:

| Option                 | Value                                                   | Description                                |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------ |
| `--runtime`            | `node` / `browser` / `bun` / `deno`                     | Runtime                                    |
| `--type`               | `console` / `error` / `network` / `unhandled-rejection` | Event type                                 |
| `--level`              | `debug` / `info` / `warn` / `error`                     | Log level                                  |
| `--project`            | string                                                  | Project label (see the `doctor` output)    |
| `--search`             | string                                                  | Message search (see syntax below)          |
| `--last`               | `<N>(s\|m\|h\|d\|w)` e.g. `10m`, `2h`, `3d`                | Relative window ending at now. Overrides `--from`/`--to`. |
| `--from` / `--to`      | ISO datetime                                            | Date range                                 |
| `--limit` / `--offset` | number                                                  | Paging (applied after merge)               |
| `--json`               | flag                                                    | JSON output                                |
| `--aggregate`          | flag                                                    | Per-project count aggregation              |
| `--root`               | path                                                    | Override the discovery root (default: cwd) |

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
pnpm logit ui                 # http://localhost:3000
pnpm logit ui --port 4000
pnpm logit ui --root ../other
```

The server auto-shuts down when you close the browser tab (via a heartbeat / beacon). See [`@logit/web-ui`](../web-ui/README.md) for details.

### `reindex` — rebuild every index

```bash
pnpm logit reindex
```

Discovers every `.logit/` under the root and rebuilds each `index/logs.duckdb` from scratch. Useful after editing JSONL by hand or when a DB is corrupted.

### `prune` — delete old logs

```bash
pnpm logit prune --before 2026-04-01
```

Deletes JSONL files older than the given date in every discovered `.logit/raw/`.

### `doctor` — health check

```bash
pnpm logit doctor
```

Lists every discovered `.logit/`, the project label, raw event count, and index count. Flags any mismatches with a suggested `logit reindex`.
