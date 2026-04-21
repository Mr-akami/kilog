# @logit/runtime-node

Automatically capture `console`, `fetch`, and uncaught errors in Node.js.

## Usage

Most apps should load the **[`@logit/register`](../register/README.md)** meta entry instead — it auto-dispatches to the right runtime for Node / Bun / Deno:

```json
{
  "scripts": {
    "dev": "node --import @logit/register ./src/index.ts"
  }
}
```

If you want to pin Node explicitly, load this package's register entry directly:

```json
{
  "scripts": {
    "dev": "node --import @logit/runtime-node/register ./src/index.ts"
  }
}
```

No code changes required. Instrumentation is enabled on startup, and events are written to `.logit/`.

## What is captured

- `console.log` / `info` / `warn` / `error` / `debug`
- `fetch()` calls (URL, method, status, duration)
- `uncaughtException` / `unhandledRejection`

## Storage

Written to `.logit/raw/{date}.node.jsonl` under the cwd. Override with the `LOGIT_DIR` environment variable.

## Programmatic API

Use `/register` in most cases; for manual setup:

```ts
import {
  createRuntimeContext,
  captureConsole,
  captureFetch,
  captureErrors,
} from "@logit/runtime-node";

const ctx = createRuntimeContext();
captureConsole(ctx);
captureFetch(ctx);
captureErrors(ctx);
```

## Viewing logs

Use [`@logit/cli`](../cli/README.md) or the [Web UI](../web-ui/README.md).
