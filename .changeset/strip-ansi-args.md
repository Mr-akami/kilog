---
"@kilog/core": patch
"@kilog/web-ui": patch
---

fix: also strip ANSI from `ConsoleEvent.args` and any nested strings via the redactor. 1.1.1 only cleaned `message`; raw JSONL still showed escapes inside `args` when Hono's `logger()` middleware (and similar chalk-using libraries) logged colored output. web-ui rebuilds the display message from `args`, so historical JSONL captured before the fix is also rendered cleanly now (`stripAnsi` applied in `packages/web-ui/client/duckdb.ts`). Shared `stripAnsi` helper is exported from `@kilog/core`.
