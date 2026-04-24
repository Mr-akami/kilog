# @kilog/vite-plugin

Vite plugin. Injects the browser-side instrumentation script into `index.html` and registers a dev-server middleware that receives events and writes them to `.kilog/`.

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import kilogPlugin from "@kilog/vite-plugin";

export default defineConfig({
  plugins: [kilogPlugin()],
});
```

Running `vite` is enough to collect the browser's `console`, `fetch`, and uncaught errors.

## Options

```ts
kilogPlugin({ terminal: true }); // mirror every captured event to stdout (colored)
kilogPlugin({ terminal: "warn" }); // only warn/error (filter by level)
kilogPlugin({ terminal: "error" }); // errors only
// default: no terminal output; events go to .kilog/ only

kilogPlugin({ persist: true }); // keep previous logs across dev restarts
// default: wipe .kilog/raw/*.jsonl and .kilog/index/ on server start

kilogPlugin({ server: false }); // disable server-side (Node/Bun/Deno) capture
// default: server capture is ON
```

The level threshold applies to events with a `level` (console, error, rejection). Network events print only when `terminal: true`.

## Server-side capture (Vite SSR / Hono+Vite / Vite-Next)

When Vite bundles and runs your server code in its own Node process (e.g. via `@hono/vite-dev-server`, or any Vite-SSR setup), the plugin also instruments that process so `console` / `fetch` / uncaught errors from your server code land in `.kilog/raw/{date}.{node|bun|deno}.jsonl` — separated from browser events which go to `.browser.jsonl`.

This is enabled by default. Pass `server: false` to skip it (useful for pure-SPA projects):

```ts
kilogPlugin({ server: false });
```

Runtime detection (`node` / `bun` / `deno`) is handled by [`@kilog/register`](../register/README.md), which the plugin loads on dev server start.

## How it works

- `transformIndexHtml`: injects the browser instrumentation script into `<head>`
- `configureServer`:
  - adds a POST-receiver middleware to the dev server (browser → dev server → `.kilog/raw/`)
  - when `server !== false`, dynamically imports `@kilog/register` so the dev-server runtime captures its own `console` / `fetch` / errors

## Storage

Written to `.kilog/raw/{date}.browser.jsonl` under the cwd. Override with the `KILOG_DIR` environment variable.

## Requirements

- Vite 6 or newer (peerDependencies)
- Dev server only — the instrumentation script is not included in production builds

## Viewing logs

Use [`@kilog/cli`](../cli/README.md) or the [Web UI](../web-ui/README.md).
