# kilog Hono + Vite Example

Hono bundled by Vite via [`@hono/vite-dev-server`](https://github.com/honojs/vite-plugins/tree/main/packages/dev-server) + [`@kilog/vite-plugin`](../../packages/vite-plugin/README.md). Demonstrates that `kilogPlugin()` captures **server-side** `console` / `fetch` / errors when Hono runs inside the Vite dev process — no `--import @kilog/register` needed.

## Prerequisites (inside the workspace)

```bash
# from the workspace root
pnpm install
pnpm build
```

## Run

```bash
pnpm dev
```

Starts the Vite dev server; Hono handles requests. Hit it from another terminal:

```bash
curl http://localhost:5173/        # console.log
curl http://localhost:5173/warn    # console.warn
curl http://localhost:5173/error   # console.error
curl http://localhost:5173/fetch   # outgoing fetch
curl http://localhost:5173/throw   # uncaught error
```

Events land in `.kilog/raw/{date}.node.jsonl` (server-side) — separated from browser events which would go to `.browser.jsonl`.

## View logs

```bash
pnpm kilog logs -f
pnpm kilog logs --since 10m
pnpm kilog ui --port 4000
```

## How it works

`kilogPlugin()` defaults to `server: true`, so on `configureServer` it dynamically imports `@kilog/register`, which installs `console` / `fetch` / uncaughtException / unhandledRejection hooks in the same Node process that `@hono/vite-dev-server` uses to run your Hono app. The same pattern covers any Vite-SSR setup (Vite-Next, etc.).

Opt out with `kilogPlugin({ server: false })` for pure-SPA projects.
