# @kilog/web-ui

## 1.3.1

### Patch Changes

- Updated dependencies []:
  - @kilog/core@1.3.1

## 1.3.0

### Minor Changes

- [#56](https://github.com/Mr-akami/kilog/pull/56) [`b0e5469`](https://github.com/Mr-akami/kilog/commit/b0e546937fb149dfe7bfa02d453f01c1da0d47e4) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Add `@kilog/wrangler-plugin` for Cloudflare Workers (`wrangler dev`).
  Supports both plain `wrangler dev` (via `kilog-wrangler` launcher) and Vite
  - `@cloudflare/vite-plugin`. Worker `console`/`fetch`/error events stream
    into `.kilog/raw/<date>.workerd.jsonl` over a localhost receiver. Adds
    `"workerd"` to the `Runtime` schema and moves the dev-receiver server +
    middleware into `@kilog/core/dev-receiver` for reuse across plugins.

### Patch Changes

- Updated dependencies [[`b0e5469`](https://github.com/Mr-akami/kilog/commit/b0e546937fb149dfe7bfa02d453f01c1da0d47e4)]:
  - @kilog/core@1.3.0

## 1.2.0

### Patch Changes

- Updated dependencies [[`32ccaa2`](https://github.com/Mr-akami/kilog/commit/32ccaa2bc2651e496f5faf4f05cc2a87d3dd130f)]:
  - @kilog/core@1.2.0

## 1.1.2

### Patch Changes

- [#49](https://github.com/Mr-akami/kilog/pull/49) [`20d8f1a`](https://github.com/Mr-akami/kilog/commit/20d8f1abe3c3d3b26a57e7d02c79400dfe580fec) Thanks [@Mr-akami](https://github.com/Mr-akami)! - fix: also strip ANSI from `ConsoleEvent.args` and any nested strings via the redactor. 1.1.1 only cleaned `message`; raw JSONL still showed escapes inside `args` when Hono's `logger()` middleware (and similar chalk-using libraries) logged colored output. web-ui rebuilds the display message from `args`, so historical JSONL captured before the fix is also rendered cleanly now (`stripAnsi` applied in `packages/web-ui/client/duckdb.ts`). Shared `stripAnsi` helper is exported from `@kilog/core`.

- Updated dependencies [[`20d8f1a`](https://github.com/Mr-akami/kilog/commit/20d8f1abe3c3d3b26a57e7d02c79400dfe580fec)]:
  - @kilog/core@1.1.2

## 1.1.1

### Patch Changes

- Updated dependencies [[`1ff6899`](https://github.com/Mr-akami/kilog/commit/1ff689919ddc0f036ef9f3bf5fde2f38ff24e1f9)]:
  - @kilog/core@1.1.1

## 1.1.0

### Patch Changes

- Updated dependencies []:
  - @kilog/core@1.1.0

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

## 0.1.4

### Patch Changes

- Updated dependencies [[`4a97a7b`](https://github.com/Mr-akami/kilog/commit/4a97a7b137d66b72b3ab59ee66420ef17fef4fc2)]:
  - @kilog/core@0.3.0

## 0.1.3

### Patch Changes

- Updated dependencies [[`5e5a868`](https://github.com/Mr-akami/kilog/commit/5e5a8680695dc061239137b1b3b9567973c7935f)]:
  - @kilog/core@0.2.1

## 0.1.2

### Patch Changes

- Updated dependencies [[`e945f5f`](https://github.com/Mr-akami/kilog/commit/e945f5f3b0c3ce031ba7867954774b275fe0ce19)]:
  - @kilog/core@0.2.0

## 0.1.1

### Patch Changes

- [#18](https://github.com/Mr-akami/kilog/pull/18) [`e78e49c`](https://github.com/Mr-akami/kilog/commit/e78e49cd6f2df0677351ad78992f853da63521ad) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Fix: republish `@kilog/web-ui` with the Vite-built client bundle (`dist/public/`), which was missing from 0.1.0 and caused `/main.js` to return 404 — the browser UI never initialized DuckDB, ingested sources, or populated the project filter. Added a `prepack` hook (`vp build && tsc`) to force a fresh client build before publish, preventing recurrence.
