# kilog Node Server Example

Hono + [`@mr-akami/kilog/runtime-node`](../../docs/runtime-node.md) for automatic log capture.

## Prerequisites (inside the workspace)

Not published to npm yet, so build the workspace first:

```bash
# from the workspace root
pnpm install
pnpm build      # builds the kilog package + bundles the web UI client
```

`@mr-akami/kilog` is linked via `workspace:*` and resolved through its `dist/`. When editing TS, keep `pnpm tsc -b --watch` running at the root.

## Run

```bash
pnpm dev
```

Starts on `http://localhost:3000`. Hit it from another terminal:

```bash
curl http://localhost:3000/        # console.log
curl http://localhost:3000/warn    # console.warn
curl http://localhost:3000/error   # console.error
curl http://localhost:3000/fetch   # outgoing fetch
curl http://localhost:3000/throw   # uncaught error
```

## View logs

Run these in this example's directory (the cwd where `.kilog/` is created):

```bash
pnpm kilog logs -f
pnpm kilog logs --since 10m
pnpm kilog ui --port 4000    # dev server uses 3210, so use a different port
```

`@mr-akami/kilog` is wired up as a `workspace:*` devDependency, so `pnpm kilog ...` works via the `"kilog": "kilog"` script in `package.json`. `pnpm exec kilog ...` also works.

> `npx kilog` will not work: since it isn't published yet, npx tries to fetch it from the registry and fails. Use `pnpm` instead.

See [`kilog`](../../docs/cli.md) and [Web UI](../../docs/web-ui.md) for details.
