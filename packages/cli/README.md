# @logit/cli

The `logit` command. Search, browse, and manage `.devlogs/`.

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

The CLI reads the cwd's `.devlogs/`, so run it in the same directory as your app.

Once published, `npx logit <command>` will also work.

## Commands

### `tail` — stream new entries in real time

```bash
pnpm logit tail
pnpm logit tail --runtime node
```

Streams like `tail -f`. Exit with Ctrl+C.

### `query` — search / filter

```bash
pnpm logit query                          # all
pnpm logit query --level error            # only error level
pnpm logit query --type network           # only fetch events
pnpm logit query --search "httpbin"       # full-text search
pnpm logit query --from 2026-04-20 --to 2026-04-21
pnpm logit query --limit 50 --offset 100
pnpm logit query --json                   # JSON output
pnpm logit query --aggregate              # aggregate (count table)
```

Filters:

| Option | Value | Description |
|---|---|---|
| `--runtime` | `node` / `browser` / `bun` / `deno` | Runtime |
| `--type` | `console` / `error` / `network` / `unhandled-rejection` | Event type |
| `--level` | `debug` / `info` / `warn` / `error` | Log level |
| `--search` | string | Full-text search over messages |
| `--from` / `--to` | ISO datetime | Date range |
| `--limit` / `--offset` | number | Paging |
| `--json` | flag | JSON output |
| `--aggregate` | flag | Count aggregation |

### `ui` — start the Web UI

```bash
pnpm logit ui                 # http://localhost:3000
pnpm logit ui --port 4000
```

Use `--port` if it collides with your app's dev server. See [`@logit/web-ui`](../../apps/web-ui/README.md) for details.

### `reindex` — rebuild the index

```bash
pnpm logit reindex
```

Rebuilds `index/logs.duckdb` from `raw/` JSONL files. Use when the DB is corrupted or after editing JSONL by hand.

### `prune` — delete old logs

```bash
pnpm logit prune --before 2026-04-01
```

Deletes JSONL files older than the given date.

### `doctor` — health check

```bash
pnpm logit doctor
```

Inspects the `.devlogs/` layout and checks raw / index consistency.
