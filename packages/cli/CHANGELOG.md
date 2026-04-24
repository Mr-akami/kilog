# @kilog/cli

## 1.1.1

### Patch Changes

- Updated dependencies [[`1ff6899`](https://github.com/Mr-akami/kilog/commit/1ff689919ddc0f036ef9f3bf5fde2f38ff24e1f9)]:
  - @kilog/core@1.1.1
  - @kilog/web-ui@1.1.1

## 1.1.0

### Patch Changes

- Updated dependencies []:
  - @kilog/core@1.1.0
  - @kilog/web-ui@1.1.0

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

### Patch Changes

- Updated dependencies [[`cb8b371`](https://github.com/Mr-akami/kilog/commit/cb8b37191b7f481ab7afa414245f87792c3e1f7b)]:
  - @kilog/core@1.0.0
  - @kilog/web-ui@1.0.0

## 0.2.1

### Patch Changes

- [#35](https://github.com/Mr-akami/kilog/pull/35) [`9b5ad58`](https://github.com/Mr-akami/kilog/commit/9b5ad58c11155df14aae8d9ea5074cb0286b94c0) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Swap the CLI argument parser from `yargs` to `cac`. Same commands, same flags, `kilog --version` / `-v` still print the package version. `@kilog/cli` now ships with a single 0-dep dependency (~40 KB) in place of yargs + @types/yargs.

## 0.2.0

### Minor Changes

- [#33](https://github.com/Mr-akami/kilog/pull/33) [`4a97a7b`](https://github.com/Mr-akami/kilog/commit/4a97a7b137d66b72b3ab59ee66420ef17fef4fc2) Thanks [@Mr-akami](https://github.com/Mr-akami)! - docker-logs-style CLI. `kilog tail` and `kilog query` are replaced by a single `kilog logs` with `-f`, `--since`, `--until`, `-n/--tail`, and `--timestamps`, matching the `docker logs` flag surface. Text search (`--search` with AND/OR/NOT) is removed — pipe to `rg`/`grep` instead, e.g. `kilog logs --since 10m | rg TypeError`.

  Also added:
  - `kilog sql <query>` — raw DuckDB passthrough, runs across every `.kilog/` and tags each row with `source` / `project`. Use `--project <name>` to target one.
  - `kilog stats` — replaces `kilog query --aggregate`.
  - `--json` on `kilog logs` / `kilog logs -f` is NDJSON (one event per line) for both backfill and follow, so `| jq` and log shipping work.

  `@kilog/core`: `QueryFilter.search` removed; added `QueryFilter.projects: string[]` and `QueryFilter.order: 'asc' | 'desc'`. `parseSearch` and the search-parser module are gone.

### Patch Changes

- Updated dependencies [[`4a97a7b`](https://github.com/Mr-akami/kilog/commit/4a97a7b137d66b72b3ab59ee66420ef17fef4fc2)]:
  - @kilog/core@0.3.0
  - @kilog/web-ui@0.1.4

## 0.1.4

### Patch Changes

- Updated dependencies [[`5e5a868`](https://github.com/Mr-akami/kilog/commit/5e5a8680695dc061239137b1b3b9567973c7935f)]:
  - @kilog/core@0.2.1
  - @kilog/web-ui@0.1.3

## 0.1.3

### Patch Changes

- Updated dependencies [[`e945f5f`](https://github.com/Mr-akami/kilog/commit/e945f5f3b0c3ce031ba7867954774b275fe0ce19)]:
  - @kilog/core@0.2.0
  - @kilog/web-ui@0.1.2

## 0.1.2

### Patch Changes

- [#18](https://github.com/Mr-akami/kilog/pull/18) [`e78e49c`](https://github.com/Mr-akami/kilog/commit/e78e49cd6f2df0677351ad78992f853da63521ad) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Change default UI server port from 3000 to 3210 to avoid collision with common dev servers.

- Updated dependencies [[`e78e49c`](https://github.com/Mr-akami/kilog/commit/e78e49cd6f2df0677351ad78992f853da63521ad)]:
  - @kilog/web-ui@0.1.1

## 0.1.1

### Patch Changes

- [#15](https://github.com/Mr-akami/kilog/pull/15) [`8d4800c`](https://github.com/Mr-akami/kilog/commit/8d4800c993e33d5151549260e6153d0e16fabf06) Thanks [@Mr-akami](https://github.com/Mr-akami)! - test

- [#16](https://github.com/Mr-akami/kilog/pull/16) [`9dc0420`](https://github.com/Mr-akami/kilog/commit/9dc04206eeb4a001b4b9fda5eaf62c8130020816) Thanks [@Mr-akami](https://github.com/Mr-akami)! - test
