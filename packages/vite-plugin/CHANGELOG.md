# @kilog/vite-plugin

## 1.2.0

### Minor Changes

- [#54](https://github.com/Mr-akami/kilog/pull/54) [`32ccaa2`](https://github.com/Mr-akami/kilog/commit/32ccaa2bc2651e496f5faf4f05cc2a87d3dd130f) Thanks [@Mr-akami](https://github.com/Mr-akami)! - feat: Next.js support via `@kilog/nextjs-plugin`

  New package that wraps `next.config.ts` with `withKilog(...)`. On `next dev` it auto-generates `instrumentation.ts` and `instrumentation-client.ts` (gitignored), starts a localhost receiver, and rewrites `/__kilog` to it — no other user code changes. Supports App + Pages Router and Webpack + Turbopack. Requires Next.js >= 15.3.

  `@kilog/core` exposes browser-runtime helpers under the new `@kilog/core/browser` subpath; `@kilog/vite-plugin` now re-exports from there. The meta-package `@kilog/kilog` ships `@kilog/nextjs-plugin` and exposes it via `@kilog/kilog/nextjs-plugin`.

### Patch Changes

- Updated dependencies [[`32ccaa2`](https://github.com/Mr-akami/kilog/commit/32ccaa2bc2651e496f5faf4f05cc2a87d3dd130f)]:
  - @kilog/core@1.2.0
  - @kilog/register@1.2.0

## 1.1.2

### Patch Changes

- Updated dependencies [[`20d8f1a`](https://github.com/Mr-akami/kilog/commit/20d8f1abe3c3d3b26a57e7d02c79400dfe580fec)]:
  - @kilog/core@1.1.2
  - @kilog/register@1.1.2

## 1.1.1

### Patch Changes

- Updated dependencies [[`1ff6899`](https://github.com/Mr-akami/kilog/commit/1ff689919ddc0f036ef9f3bf5fde2f38ff24e1f9)]:
  - @kilog/core@1.1.1
  - @kilog/register@1.1.1

## 1.1.0

### Minor Changes

- [#43](https://github.com/Mr-akami/kilog/pull/43) [`322823e`](https://github.com/Mr-akami/kilog/commit/322823e5035dc8559ae1faf77266dc02abb7c719) Thanks [@Mr-akami](https://github.com/Mr-akami)! - feat(vite-plugin): capture dev-server runtime (Node/Bun/Deno) by default via `@kilog/register` — handles Vite SSR setups such as Hono+Vite, Vite-Next, etc. New `server?: boolean` option (default `true`); pass `server: false` to opt out.

### Patch Changes

- Updated dependencies []:
  - @kilog/core@1.1.0
  - @kilog/register@1.1.0

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

## 0.2.3

### Patch Changes

- Updated dependencies [[`4a97a7b`](https://github.com/Mr-akami/kilog/commit/4a97a7b137d66b72b3ab59ee66420ef17fef4fc2)]:
  - @kilog/core@0.3.0

## 0.2.2

### Patch Changes

- [#27](https://github.com/Mr-akami/kilog/pull/27) [`3fc7950`](https://github.com/Mr-akami/kilog/commit/3fc79502fc0e43b9a5ba834ab1a483f422fd556f) Thanks [@Mr-akami](https://github.com/Mr-akami)! - doc: rename vite plugin import to `kilogPlugin` in README examples, wrap config in `defineConfig`

## 0.2.1

### Patch Changes

- [#25](https://github.com/Mr-akami/kilog/pull/25) [`5e5a868`](https://github.com/Mr-akami/kilog/commit/5e5a8680695dc061239137b1b3b9567973c7935f) Thanks [@Mr-akami](https://github.com/Mr-akami)! - fix: drop misleading "Error" header from captured stacks and collapse stack to top frame for info/debug console logs

- Updated dependencies [[`5e5a868`](https://github.com/Mr-akami/kilog/commit/5e5a8680695dc061239137b1b3b9567973c7935f)]:
  - @kilog/core@0.2.1

## 0.2.0

### Minor Changes

- [#20](https://github.com/Mr-akami/kilog/pull/20) [`e945f5f`](https://github.com/Mr-akami/kilog/commit/e945f5f3b0c3ce031ba7867954774b275fe0ce19) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Clear `.kilog/raw/*.jsonl` and `.kilog/index/` on start by default so logs reflect only the current run. Opt out with `KILOG_PERSIST=1` (runtime-node) or `kilog({ persist: true })` (vite-plugin). New `clearProjectLogs` / `clearOnce` helpers exported from `@kilog/core`; `clearOnce` dedups per-baseDir so register + vite-plugin in the same process wipe exactly once.

### Patch Changes

- Updated dependencies [[`e945f5f`](https://github.com/Mr-akami/kilog/commit/e945f5f3b0c3ce031ba7867954774b275fe0ce19)]:
  - @kilog/core@0.2.0
