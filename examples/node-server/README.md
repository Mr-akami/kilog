# kilog Node Server Example

Hono + [`@kilog/runtime-node`](../../packages/runtime-node/README.md) for automatic log capture.

## Prerequisites (inside the workspace)

Not published to npm yet, so build the workspace first:

```bash
# from the workspace root
pnpm install
pnpm build      # builds @kilog/runtime-node, @kilog/cli, @kilog/web-ui, etc.
```

`@kilog/runtime-node` and `@kilog/cli` are linked via `workspace:*` and resolved through each package's `dist/`. When editing TS, keep `pnpm tsc -b --watch` running at the root.

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
pnpm kilog tail
pnpm kilog query
pnpm kilog ui --port 4000    # dev server uses 3000, so use a different port
```

`@kilog/cli` is wired up as a `workspace:*` devDependency, so `pnpm kilog ...` works via the `"kilog": "kilog"` script in `package.json`. `pnpm exec kilog ...` also works.

> `npx kilog` will not work: since it isn't published yet, npx tries to fetch it from the registry and fails. Use `pnpm` instead.

See [`@kilog/cli`](../../packages/cli/README.md) and [Web UI](../../packages/web-ui/README.md) for details.
