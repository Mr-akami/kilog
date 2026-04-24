---
"@kilog/cli": minor
"@kilog/core": minor
"@kilog/kilog": patch
---

docker-logs-style CLI. `kilog tail` and `kilog query` are replaced by a single `kilog logs` with `-f`, `--since`, `--until`, `-n/--tail`, and `--timestamps`, matching the `docker logs` flag surface. Text search (`--search` with AND/OR/NOT) is removed — pipe to `rg`/`grep` instead, e.g. `kilog logs --since 10m | rg TypeError`.

Also added:

- `kilog sql <query>` — raw DuckDB passthrough, runs across every `.kilog/` and tags each row with `source` / `project`. Use `--project <name>` to target one.
- `kilog stats` — replaces `kilog query --aggregate`.
- `--json` on `kilog logs` / `kilog logs -f` is NDJSON (one event per line) for both backfill and follow, so `| jq` and log shipping work.

`@kilog/core`: `QueryFilter.search` removed; added `QueryFilter.projects: string[]` and `QueryFilter.order: 'asc' | 'desc'`. `parseSearch` and the search-parser module are gone.
