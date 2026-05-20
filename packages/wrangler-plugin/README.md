# @kilog/wrangler-plugin

Capture `console`, `fetch`, and uncaught errors from Cloudflare Workers
running under `wrangler dev` (workerd), and ship them into the local
`.kilog/raw/<date>.workerd.jsonl` store. **Local development only** —
production deploys see an unmodified bundle.

Two ways to wire it up:

## Plain `wrangler dev`

```ts
// src/index.ts
import "@kilog/wrangler-plugin/instrument";
import { withKilog } from "@kilog/wrangler-plugin/with-kilog";

export default withKilog({
  async fetch(req, env, ctx) {
    console.log("hello from workerd");
    return new Response("ok");
  },
});
```

```json
{ "scripts": { "dev": "kilog-wrangler dev" } }
```

`kilog-wrangler`:

1. starts a localhost receiver on a random port
2. exec's `wrangler dev` with `--var KILOG_RECEIVER_URL:…` and
   `--define __KILOG_RECEIVER_URL__:"…"` so the worker knows where to
   ship events
3. forwards stdin/stdout/stderr and exit codes

`withKilog` is a thin wrapper that lifts `env.KILOG_RECEIVER_URL` into
`globalThis.__KILOG_RECEIVER_URL__` per request — needed so the
top-level `instrument` import has a target.

## Vite + `@cloudflare/vite-plugin`

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import kilogWranglerPlugin from "@kilog/wrangler-plugin";

export default defineConfig({
  plugins: [cloudflare(), kilogWranglerPlugin()],
});
```

The plugin:

- registers a Vite dev-server middleware on `POST /__kilog` that writes
  events to `.kilog/raw/`
- auto-injects `import "@kilog/wrangler-plugin/instrument"` plus the
  resolved receiver URL into the worker entry — no code changes in your
  worker

## Options

```ts
kilogWranglerPlugin({
  terminal: "warn",       // mirror warn+/error events to stdout
  persist: true,          // keep previous logs across dev restarts
  workerEntries: ["src/index.ts"], // override entry detection
});
```

| Option          | Type                                  | Default | Description                                                                                |
| --------------- | ------------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `terminal`      | `boolean \| LogLevel`                 | `false` | Print captured events to stdout. `true` = all; a level filters by `level` field.           |
| `persist`       | `boolean`                             | `false` | Keep previous logs across dev server restarts.                                             |
| `workerEntries` | `string[]`                            | —       | Explicit entry paths to inject into. Defaults to a heuristic `export default { fetch... }` scan. |

## CLI flags (`kilog-wrangler`)

`kilog-wrangler` forwards everything to `wrangler` verbatim except a few
flags it consumes itself:

| Flag                              | Description                                            |
| --------------------------------- | ------------------------------------------------------ |
| `--kilog-persist`                 | Keep previous logs across runs (same as `KILOG_PERSIST=1`). |
| `--kilog-terminal[=true\|level]`  | Mirror events to stdout (optionally filtered by level). |
