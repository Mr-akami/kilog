# @kilog/vite-plugin

Vite plugin. Injects the browser-side instrumentation script into `index.html` and registers a dev-server middleware that receives events and writes them to `.kilog/`.

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import kilog from "@kilog/vite-plugin";

export default defineConfig({
  plugins: [kilog()],
});
```

Running `vite` is enough to collect the browser's `console`, `fetch`, and uncaught errors.

## Options

```ts
kilog({ terminal: true }); // mirror every captured event to stdout (colored)
kilog({ terminal: "warn" }); // only warn/error (filter by level)
kilog({ terminal: "error" }); // errors only
// default: no terminal output; events go to .kilog/ only

kilog({ persist: true }); // keep previous logs across dev restarts
// default: wipe .kilog/raw/*.jsonl and .kilog/index/ on server start
```

The level threshold applies to events with a `level` (console, error, rejection). Network events print only when `terminal: true`.

## How it works

- `transformIndexHtml`: injects the browser instrumentation script into `<head>`
- `configureServer`: adds a POST-receiver middleware to the dev server (browser → dev server → `.kilog/raw/`)

## Storage

Written to `.kilog/raw/{date}.browser.jsonl` under the cwd. Override with the `KILOG_DIR` environment variable.

## Requirements

- Vite 6 or newer (peerDependencies)
- Dev server only — the instrumentation script is not included in production builds

## Viewing logs

Use [`@kilog/cli`](../cli/README.md) or the [Web UI](../web-ui/README.md).
