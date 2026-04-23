# @kilog/runtime-node

Automatically capture `console`, `fetch`, and uncaught errors in Node.js.

## Usage

Most apps should load the **[`@kilog/register`](../register/README.md)** meta entry instead — it auto-dispatches to the right runtime for Node / Bun / Deno:

```json
{
  "scripts": {
    "dev": "node --import @kilog/register ./src/index.ts"
  }
}
```

If you want to pin Node explicitly, load this package's register entry directly:

```json
{
  "scripts": {
    "dev": "node --import @kilog/runtime-node/register ./src/index.ts"
  }
}
```

No code changes required. Instrumentation is enabled on startup, and events are written to `.kilog/`.

## What is captured

- `console.log` / `info` / `warn` / `error` / `debug`
- `fetch()` calls (URL, method, status, duration)
- `uncaughtException` / `unhandledRejection`

## Storage

Written to `.kilog/raw/{date}.node.jsonl` under the cwd. Override with the `KILOG_DIR` environment variable.

## Clear on start (default)

Each process start wipes `.kilog/raw/*.jsonl` and `.kilog/index/` so logs reflect only the current run. Set `KILOG_PERSIST=1` to keep previous logs.

```bash
KILOG_PERSIST=1 node --import @kilog/register ./src/index.ts
```

## Programmatic API

Use `/register` in most cases; for manual setup:

```ts
import {
  createRuntimeContext,
  captureConsole,
  captureFetch,
  captureErrors,
} from "@kilog/runtime-node";

const ctx = createRuntimeContext();
captureConsole(ctx);
captureFetch(ctx);
captureErrors(ctx);
```

## Viewing logs

Use [`@kilog/cli`](../cli/README.md) or the [Web UI](../web-ui/README.md).
