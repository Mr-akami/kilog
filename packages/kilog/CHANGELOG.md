# @kilog/kilog

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
