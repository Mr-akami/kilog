# @kilog/kilog

## 0.2.9

### Patch Changes

- [#39](https://github.com/Mr-akami/kilog/pull/39) [`6ce49ec`](https://github.com/Mr-akami/kilog/commit/6ce49ece5573f47dca1d9f5a827fc220362800b5) Thanks [@Mr-akami](https://github.com/Mr-akami)! - update skills

## 0.2.8

### Patch Changes

- [#37](https://github.com/Mr-akami/kilog/pull/37) [`76b2fb4`](https://github.com/Mr-akami/kilog/commit/76b2fb46c97707eb3c4e175485aee40e0c06f7b1) Thanks [@Mr-akami](https://github.com/Mr-akami)! - README: add Claude Code plugin install section (`/plugin install` + `curl` fetch). Also trims the companion Claude skill (`plugin/skills/kilog/SKILL.md`) by ~60% to cut agent context usage, and adds a "When to trigger" section mapping natural-language phrases ("show me the logs", "ログを見て", "調査して") to the skill.

## 0.2.7

### Patch Changes

- Updated dependencies [[`9b5ad58`](https://github.com/Mr-akami/kilog/commit/9b5ad58c11155df14aae8d9ea5074cb0286b94c0)]:
  - @kilog/cli@0.2.1

## 0.2.6

### Patch Changes

- [#33](https://github.com/Mr-akami/kilog/pull/33) [`4a97a7b`](https://github.com/Mr-akami/kilog/commit/4a97a7b137d66b72b3ab59ee66420ef17fef4fc2) Thanks [@Mr-akami](https://github.com/Mr-akami)! - docker-logs-style CLI. `kilog tail` and `kilog query` are replaced by a single `kilog logs` with `-f`, `--since`, `--until`, `-n/--tail`, and `--timestamps`, matching the `docker logs` flag surface. Text search (`--search` with AND/OR/NOT) is removed — pipe to `rg`/`grep` instead, e.g. `kilog logs --since 10m | rg TypeError`.

  Also added:

  - `kilog sql <query>` — raw DuckDB passthrough, runs across every `.kilog/` and tags each row with `source` / `project`. Use `--project <name>` to target one.
  - `kilog stats` — replaces `kilog query --aggregate`.
  - `--json` on `kilog logs` / `kilog logs -f` is NDJSON (one event per line) for both backfill and follow, so `| jq` and log shipping work.

  `@kilog/core`: `QueryFilter.search` removed; added `QueryFilter.projects: string[]` and `QueryFilter.order: 'asc' | 'desc'`. `parseSearch` and the search-parser module are gone.

- Updated dependencies [[`4a97a7b`](https://github.com/Mr-akami/kilog/commit/4a97a7b137d66b72b3ab59ee66420ef17fef4fc2)]:
  - @kilog/cli@0.2.0
  - @kilog/core@0.3.0
  - @kilog/register@0.1.3
  - @kilog/runtime-node@0.2.2
  - @kilog/vite-plugin@0.2.3
  - @kilog/web-ui@0.1.4

## 0.2.5

### Patch Changes

- [#31](https://github.com/Mr-akami/kilog/pull/31) [`a31034d`](https://github.com/Mr-akami/kilog/commit/a31034df224aac73f5656c2e535e219d2ae2d736) Thanks [@Mr-akami](https://github.com/Mr-akami)! - doc: rewrite README intro — lead with AI-agent log search; drop inaccurate "one place" wording. Per-project `.kilog/` storage, CLI scope = invocation dir (or `--root`), nothing centralized.

## 0.2.4

### Patch Changes

- [#29](https://github.com/Mr-akami/kilog/pull/29) [`0194aac`](https://github.com/Mr-akami/kilog/commit/0194aac8545f5d8ee13cb5b7f5303bcbaf2410df) Thanks [@Mr-akami](https://github.com/Mr-akami)! - doc: document vite-plugin `terminal`/`persist` options and node `KILOG_PERSIST`/`KILOG_DIR` env vars in README; move Release / Development sections to `docs/`; auto-sync root README to `@kilog/kilog` on publish via `prepack`

## 0.2.3

### Patch Changes

- [#27](https://github.com/Mr-akami/kilog/pull/27) [`3fc7950`](https://github.com/Mr-akami/kilog/commit/3fc79502fc0e43b9a5ba834ab1a483f422fd556f) Thanks [@Mr-akami](https://github.com/Mr-akami)! - doc: rename vite plugin import to `kilogPlugin` in README examples, wrap config in `defineConfig`

- Updated dependencies [[`3fc7950`](https://github.com/Mr-akami/kilog/commit/3fc79502fc0e43b9a5ba834ab1a483f422fd556f)]:
  - @kilog/vite-plugin@0.2.2

## 0.2.2

### Patch Changes

- Updated dependencies [[`5e5a868`](https://github.com/Mr-akami/kilog/commit/5e5a8680695dc061239137b1b3b9567973c7935f)]:
  - @kilog/core@0.2.1
  - @kilog/runtime-node@0.2.1
  - @kilog/vite-plugin@0.2.1
  - @kilog/cli@0.1.4
  - @kilog/register@0.1.2
  - @kilog/web-ui@0.1.3

## 0.2.1

### Patch Changes

- [#23](https://github.com/Mr-akami/kilog/pull/23) [`16a0a0d`](https://github.com/Mr-akami/kilog/commit/16a0a0d21634ec48881993f7f2e0b3f123594dee) Thanks [@Mr-akami](https://github.com/Mr-akami)! - readme

## 0.2.0

### Minor Changes

- [#20](https://github.com/Mr-akami/kilog/pull/20) [`e945f5f`](https://github.com/Mr-akami/kilog/commit/e945f5f3b0c3ce031ba7867954774b275fe0ce19) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Clear `.kilog/raw/*.jsonl` and `.kilog/index/` on start by default so logs reflect only the current run. Opt out with `KILOG_PERSIST=1` (runtime-node) or `kilog({ persist: true })` (vite-plugin). New `clearProjectLogs` / `clearOnce` helpers exported from `@kilog/core`; `clearOnce` dedups per-baseDir so register + vite-plugin in the same process wipe exactly once.

### Patch Changes

- Updated dependencies [[`e945f5f`](https://github.com/Mr-akami/kilog/commit/e945f5f3b0c3ce031ba7867954774b275fe0ce19)]:
  - @kilog/core@0.2.0
  - @kilog/runtime-node@0.2.0
  - @kilog/vite-plugin@0.2.0
  - @kilog/cli@0.1.3
  - @kilog/register@0.1.1
  - @kilog/web-ui@0.1.2

## 0.1.2

### Patch Changes

- [#18](https://github.com/Mr-akami/kilog/pull/18) [`e78e49c`](https://github.com/Mr-akami/kilog/commit/e78e49cd6f2df0677351ad78992f853da63521ad) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Change default UI server port from 3000 to 3210 to avoid collision with common dev servers.

- [#18](https://github.com/Mr-akami/kilog/pull/18) [`e78e49c`](https://github.com/Mr-akami/kilog/commit/e78e49cd6f2df0677351ad78992f853da63521ad) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Fix: republish `@kilog/web-ui` with the Vite-built client bundle (`dist/public/`), which was missing from 0.1.0 and caused `/main.js` to return 404 — the browser UI never initialized DuckDB, ingested sources, or populated the project filter. Added a `prepack` hook (`vp build && tsc`) to force a fresh client build before publish, preventing recurrence.

- Updated dependencies [[`e78e49c`](https://github.com/Mr-akami/kilog/commit/e78e49cd6f2df0677351ad78992f853da63521ad), [`e78e49c`](https://github.com/Mr-akami/kilog/commit/e78e49cd6f2df0677351ad78992f853da63521ad)]:
  - @kilog/cli@0.1.2
  - @kilog/web-ui@0.1.1

## 0.1.1

### Patch Changes

- Updated dependencies [[`8d4800c`](https://github.com/Mr-akami/kilog/commit/8d4800c993e33d5151549260e6153d0e16fabf06), [`9dc0420`](https://github.com/Mr-akami/kilog/commit/9dc04206eeb4a001b4b9fda5eaf62c8130020816)]:
  - @kilog/cli@0.1.1
