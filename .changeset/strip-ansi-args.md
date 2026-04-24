---
"@kilog/core": patch
---

fix(core): also strip ANSI from `ConsoleEvent.args` and any nested strings via the redactor. 1.1.1 only cleaned `message`; raw JSONL still showed escapes inside `args` when Hono's `logger()` middleware (and similar chalk-using libraries) logged colored output. Shared `stripAnsi` helper is now exported from `@kilog/core`.
