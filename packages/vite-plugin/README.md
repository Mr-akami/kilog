# @logit/vite-plugin

Vite plugin. Injects the browser-side instrumentation script into `index.html` and registers a dev-server middleware that receives events and writes them to `.devlogs/`.

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import logit from "@logit/vite-plugin";

export default defineConfig({
  plugins: [logit()],
});
```

Running `vite` is enough to collect the browser's `console`, `fetch`, and uncaught errors.

## How it works

- `transformIndexHtml`: injects the browser instrumentation script into `<head>`
- `configureServer`: adds a POST-receiver middleware to the dev server (browser → dev server → `.devlogs/raw/`)

## Storage

Written to `.devlogs/raw/{date}.browser.jsonl` under the cwd. Override with the `LOGIT_DIR` environment variable.

## Requirements

- Vite 6 or newer (peerDependencies)
- Dev server only — the instrumentation script is not included in production builds

## Viewing logs

Use [`@logit/cli`](../cli/README.md) or the [Web UI](../web-ui/README.md).
