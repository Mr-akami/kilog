# @kilog/vite-plugin

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
