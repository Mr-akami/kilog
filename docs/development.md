# Development (monorepo)

Requires Node >= 24 and pnpm.

## Setup

```bash
pnpm install
pnpm build        # build every package + bundle the browser client
```

Everything ships from the single `packages/kilog` package. Its `main`/`exports` point to `./dist/`, and the examples depend on it via `workspace:*`, so **an initial build (and a rebuild after changes) is required**. The build also bundles the web UI's browser client with Vite.

## Watch

```bash
pnpm tsc -b --watch    # server-side TS (core, cli, web-ui server, etc.)
pnpm --filter kilog dev:client   # browser client for the web UI
```

## Test / typecheck / lint

```bash
pnpm test
pnpm typecheck
pnpm lint
```

## Try it out

- [`examples/node-server`](../examples/node-server/README.md) — Node runtime instrumentation
- [`examples/vite-client`](../examples/vite-client/README.md) — Browser instrumentation
