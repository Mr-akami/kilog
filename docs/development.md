# Development (monorepo)

Requires Node >= 24 and pnpm.

## Setup

```bash
pnpm install
pnpm build        # build every package + bundle the browser client
```

Packages reference each other via `workspace:*` and their `main` points to `./dist/`, so **an initial build (and a rebuild after changes) is required**. `@kilog/web-ui` additionally bundles its browser client with Vite.

## Watch

```bash
pnpm tsc -b --watch    # server-side TS (core, cli, web-ui server, etc.)
# and in packages/web-ui, for the client side:
pnpm --filter @kilog/web-ui dev:client
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
