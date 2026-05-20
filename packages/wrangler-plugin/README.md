# @kilog/wrangler-plugin

Capture `console`, `fetch`, and uncaught errors from Cloudflare Workers
running under `wrangler dev` (workerd), and ship them into the local
`.kilog/raw/<date>.workerd.jsonl` store. **Local development only** —
`wrangler deploy` produces an unmodified bundle (the worker no-ops without
a receiver URL).

## How it works

The worker can't write files directly (workerd has no `fs`). Instead, an
instrumented wrapper around `console` / `fetch` / global error events POSTs
each event to a localhost HTTP receiver running in the dev driver process,
which writes them to `.kilog/raw/`.

The receiver URL is baked into the worker bundle (via `--define` or a Vite
plugin), so the worker has no runtime dependency on a specific port or env
binding once it's built.

## Setup A: With Vite (`@cloudflare/vite-plugin` as the dev proxy)

Use this when Vite drives your dev server and `@cloudflare/vite-plugin`
runs the worker inside it. Vite's dev server hosts the `/__kilog` receiver
in the same process — no extra launcher needed.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import kilogWranglerPlugin from "@kilog/wrangler-plugin";

export default defineConfig({
  plugins: [cloudflare(), kilogWranglerPlugin()],
});
```

`kilogWranglerPlugin()`:

- registers a `POST /__kilog` middleware on the Vite dev server (writes
  events to `.kilog/raw/`)
- auto-injects `import "@kilog/wrangler-plugin/instrument"` and the
  resolved receiver URL into the worker entry — **no code changes in
  your worker**

Worker entry detection is heuristic (looks for `export default { fetch... }`
near the top of source files outside `node_modules`). If your entry doesn't
match the heuristic, pass `workerEntries: ["src/your-entry.ts"]` to the
plugin.

## Setup B: Without Vite (plain `wrangler dev`)

Use this when you run `wrangler dev` directly — no Vite, no
`@cloudflare/vite-plugin`. A small CLI `kilog-wrangler` wraps wrangler:
it starts a localhost receiver, then exec's `wrangler dev` with two
flags so the worker knows where to ship events.

Worker side — explicit (`import` + wrapper, no auto-inject):

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

Dev script — use the `kilog-wrangler` launcher:

```json
{ "scripts": { "dev": "kilog-wrangler dev" } }
```

What `kilog-wrangler` does:

1. starts a localhost receiver on a random port
2. exec's `wrangler dev` with
   `--var KILOG_RECEIVER_URL:http://127.0.0.1:<port>/__kilog` and
   `--define __KILOG_RECEIVER_URL__:"http://127.0.0.1:<port>/__kilog"`
3. forwards stdin/stdout/stderr, signals, and the exit code

`withKilog` lifts `env.KILOG_RECEIVER_URL` into
`globalThis.__KILOG_RECEIVER_URL__` per request, so the top-level
`instrument` import always has a receiver target.

## Which setup?

| You're using…                                       | Setup    |
| --------------------------------------------------- | -------- |
| Vite + `@cloudflare/vite-plugin` (Vite serves your worker via its dev proxy) | **A**    |
| `wrangler dev` directly (no Vite)                   | **B**    |

You can't easily mix the two — Setup A relies on Vite's middleware, Setup
B relies on the `kilog-wrangler` launcher. Pick whichever matches how you
already run the worker.

## Plugin options (Setup A)

```ts
kilogWranglerPlugin({
  terminal: "warn", // mirror warn+/error events to stdout
  persist: true, // keep previous logs across dev restarts
  workerEntries: ["src/index.ts"], // override entry detection
});
```

| Option          | Type                  | Default | Description                                                                                      |
| --------------- | --------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `terminal`      | `boolean \| LogLevel` | `false` | Print captured events to stdout. `true` = all; a level filters by `level` field.                 |
| `persist`       | `boolean`             | `false` | Keep previous logs across dev server restarts.                                                   |
| `workerEntries` | `string[]`            | —       | Explicit entry paths to inject into. Defaults to a heuristic `export default { fetch... }` scan. |

## CLI flags (Setup B — `kilog-wrangler`)

`kilog-wrangler` forwards everything to `wrangler` verbatim except a few
flags it consumes itself:

| Flag                             | Description                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| `--kilog-persist`                | Keep previous logs across runs (same as `KILOG_PERSIST=1`). |
| `--kilog-terminal[=true\|level]` | Mirror events to stdout (optionally filtered by level).     |

Everything else (`dev`, `--port`, `--local`, custom entry path, etc.) is
passed to `wrangler` unchanged.

## Examples

- [`examples/wrangler-vite`](../../examples/wrangler-vite) — Setup A
- [`examples/wrangler-worker`](../../examples/wrangler-worker) — Setup B
