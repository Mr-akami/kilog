# @kilog/vite-plugin

## 0.2.0

### Minor Changes

- [#20](https://github.com/Mr-akami/kilog/pull/20) [`e945f5f`](https://github.com/Mr-akami/kilog/commit/e945f5f3b0c3ce031ba7867954774b275fe0ce19) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Clear `.kilog/raw/*.jsonl` and `.kilog/index/` on start by default so logs reflect only the current run. Opt out with `KILOG_PERSIST=1` (runtime-node) or `kilog({ persist: true })` (vite-plugin). New `clearProjectLogs` / `clearOnce` helpers exported from `@kilog/core`; `clearOnce` dedups per-baseDir so register + vite-plugin in the same process wipe exactly once.

### Patch Changes

- Updated dependencies [[`e945f5f`](https://github.com/Mr-akami/kilog/commit/e945f5f3b0c3ce031ba7867954774b275fe0ce19)]:
  - @kilog/core@0.2.0
