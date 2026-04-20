# @logit/runtime-node

Automatically capture `console`, `fetch`, and uncaught errors in Node.js.

## Usage

Just load the register entry with `--import`:

```json
{
  "scripts": {
    "dev": "node --import @logit/runtime-node/register ./src/index.ts"
  }
}
```

No code changes required. Instrumentation is enabled on startup, and events are written to `.devlogs/`.

## What is captured

- `console.log` / `info` / `warn` / `error` / `debug`
- `fetch()` calls (URL, method, status, duration)
- `uncaughtException` / `unhandledRejection`

## Storage

Written to `.devlogs/raw/{date}.node.jsonl` under the cwd. Override with the `LOGIT_DIR` environment variable.

## Programmatic API

Use `/register` in most cases; for manual setup:

```ts
import { createRuntimeContext, captureConsole, captureFetch, captureErrors } from "@logit/runtime-node";

const ctx = createRuntimeContext();
captureConsole(ctx);
captureFetch(ctx);
captureErrors(ctx);
```

## Viewing logs

Use [`@logit/cli`](../cli/README.md) or the [Web UI](../web-ui/README.md).
