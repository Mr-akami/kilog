# @kilog/core

## 1.1.1

### Patch Changes

- [#47](https://github.com/Mr-akami/kilog/pull/47) [`1ff6899`](https://github.com/Mr-akami/kilog/commit/1ff689919ddc0f036ef9f3bf5fde2f38ff24e1f9) Thanks [@Mr-akami](https://github.com/Mr-akami)! - fix(core): strip ANSI escape sequences from `ConsoleEvent.message` so captured logs stay grep/SQL/UI-friendly. Raw args are still preserved in `ConsoleEvent.args` — no data lost. Fixes garbage like `[39m ...` appearing in `kilog logs` / web-ui when the source process (e.g. Vite's dev banner) emits colored output.

## 1.1.0

## 1.0.0

### Major Changes

- [#41](https://github.com/Mr-akami/kilog/pull/41) [`cb8b371`](https://github.com/Mr-akami/kilog/commit/cb8b37191b7f481ab7afa414245f87792c3e1f7b) Thanks [@Mr-akami](https://github.com/Mr-akami)! - 1.0.0 — stable API. All packages are now versioned in lockstep (changesets `fixed` group).

  What's considered stable as of 1.0.0:
  - `.kilog/` on-disk layout (`raw/*.jsonl` + `index/logs.duckdb`) and JSONL event schema.
  - `kilog` CLI surface: `logs` / `sql` / `stats` / `reindex` / `prune` / `doctor` / `ui`, their flags, and docker-logs compatibility (`-f`, `--since`, `--until`, `-n/--tail`, `--timestamps`, positional `[TARGET...]`).
  - `@kilog/core` public exports: `QueryFilter`, `queryLogs`, `discoverSources`, `openIndex`, and the serialization / format helpers.
  - `@kilog/vite-plugin` options (`terminal`, `persist`).
  - `@kilog/register` / `@kilog/runtime-node` `KILOG_DIR` / `KILOG_PERSIST` env contract.

  Breaking changes that triggered this bump: none — this is the formal "we promise stability now" cut. Follow-up features stay minor; breakage goes to 2.0.

## 0.3.0

### Minor Changes

- [#33](https://github.com/Mr-akami/kilog/pull/33) [`4a97a7b`](https://github.com/Mr-akami/kilog/commit/4a97a7b137d66b72b3ab59ee66420ef17fef4fc2) Thanks [@Mr-akami](https://github.com/Mr-akami)! - docker-logs-style CLI. `kilog tail` and `kilog query` are replaced by a single `kilog logs` with `-f`, `--since`, `--until`, `-n/--tail`, and `--timestamps`, matching the `docker logs` flag surface. Text search (`--search` with AND/OR/NOT) is removed — pipe to `rg`/`grep` instead, e.g. `kilog logs --since 10m | rg TypeError`.

  Also added:
  - `kilog sql <query>` — raw DuckDB passthrough, runs across every `.kilog/` and tags each row with `source` / `project`. Use `--project <name>` to target one.
  - `kilog stats` — replaces `kilog query --aggregate`.
  - `--json` on `kilog logs` / `kilog logs -f` is NDJSON (one event per line) for both backfill and follow, so `| jq` and log shipping work.

  `@kilog/core`: `QueryFilter.search` removed; added `QueryFilter.projects: string[]` and `QueryFilter.order: 'asc' | 'desc'`. `parseSearch` and the search-parser module are gone.

## 0.2.1

### Patch Changes

- [#25](https://github.com/Mr-akami/kilog/pull/25) [`5e5a868`](https://github.com/Mr-akami/kilog/commit/5e5a8680695dc061239137b1b3b9567973c7935f) Thanks [@Mr-akami](https://github.com/Mr-akami)! - fix: drop misleading "Error" header from captured stacks and collapse stack to top frame for info/debug console logs

## 0.2.0

### Minor Changes

- [#20](https://github.com/Mr-akami/kilog/pull/20) [`e945f5f`](https://github.com/Mr-akami/kilog/commit/e945f5f3b0c3ce031ba7867954774b275fe0ce19) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Clear `.kilog/raw/*.jsonl` and `.kilog/index/` on start by default so logs reflect only the current run. Opt out with `KILOG_PERSIST=1` (runtime-node) or `kilog({ persist: true })` (vite-plugin). New `clearProjectLogs` / `clearOnce` helpers exported from `@kilog/core`; `clearOnce` dedups per-baseDir so register + vite-plugin in the same process wipe exactly once.
