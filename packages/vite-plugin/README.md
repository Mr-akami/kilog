# @logit/vite-plugin

Vite plugin. Injects the browser-side instrumentation script into `index.html` and registers a dev-server middleware that receives events and writes them to `.logit/`.

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

## Options

```ts
logit({ terminal: true }); // mirror every captured event to stdout (colored)
logit({ terminal: "warn" }); // only warn/error (filter by level)
logit({ terminal: "error" }); // errors only
// default: no terminal output; events go to .logit/ only
```

The level threshold applies to events with a `level` (console, error, rejection). Network events print only when `terminal: true`.

## How it works

- `transformIndexHtml`: injects the browser instrumentation script into `<head>`
- `configureServer`: adds a POST-receiver middleware to the dev server (browser → dev server → `.logit/raw/`)

## Storage

Written to `.logit/raw/{date}.browser.jsonl` under the cwd. Override with the `LOGIT_DIR` environment variable.

## Requirements

- Vite 6 or newer (peerDependencies)
- Dev server only — the instrumentation script is not included in production builds

## Viewing logs

Use [`@logit/cli`](../cli/README.md) or the [Web UI](../web-ui/README.md).
