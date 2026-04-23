# @kilog/web-ui

## 0.1.1

### Patch Changes

- [#18](https://github.com/Mr-akami/kilog/pull/18) [`e78e49c`](https://github.com/Mr-akami/kilog/commit/e78e49cd6f2df0677351ad78992f853da63521ad) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Fix: republish `@kilog/web-ui` with the Vite-built client bundle (`dist/public/`), which was missing from 0.1.0 and caused `/main.js` to return 404 — the browser UI never initialized DuckDB, ingested sources, or populated the project filter. Added a `prepack` hook (`vp build && tsc`) to force a fresh client build before publish, preventing recurrence.
