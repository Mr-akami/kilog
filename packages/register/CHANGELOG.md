# @kilog/register

## 1.1.1

### Patch Changes

- Updated dependencies [[`1ff6899`](https://github.com/Mr-akami/kilog/commit/1ff689919ddc0f036ef9f3bf5fde2f38ff24e1f9)]:
  - @kilog/core@1.1.1
  - @kilog/runtime-node@1.1.1

## 1.1.0

### Patch Changes

- Updated dependencies []:
  - @kilog/core@1.1.0
  - @kilog/runtime-node@1.1.0

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
  - @kilog/runtime-node@1.0.0

## 0.1.3

### Patch Changes

- Updated dependencies [[`4a97a7b`](https://github.com/Mr-akami/kilog/commit/4a97a7b137d66b72b3ab59ee66420ef17fef4fc2)]:
  - @kilog/core@0.3.0
  - @kilog/runtime-node@0.2.2

## 0.1.2

### Patch Changes

- Updated dependencies [[`5e5a868`](https://github.com/Mr-akami/kilog/commit/5e5a8680695dc061239137b1b3b9567973c7935f)]:
  - @kilog/core@0.2.1
  - @kilog/runtime-node@0.2.1

## 0.1.1

### Patch Changes

- Updated dependencies [[`e945f5f`](https://github.com/Mr-akami/kilog/commit/e945f5f3b0c3ce031ba7867954774b275fe0ce19)]:
  - @kilog/core@0.2.0
  - @kilog/runtime-node@0.2.0
