# logit Node Server Example

Hono + [`@logit/runtime-node`](../../packages/runtime-node/README.md) for automatic log capture.

## Prerequisites (inside the workspace)

Not published to npm yet, so build the workspace first:

```bash
# from the workspace root
pnpm install
pnpm build      # builds @logit/runtime-node, @logit/cli, @logit/web-ui, etc.
```

`@logit/runtime-node` and `@logit/cli` are linked via `workspace:*` and resolved through each package's `dist/`. When editing TS, keep `pnpm tsc -b --watch` running at the root.

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

Run these in this example's directory (the cwd where `.devlogs/` is created):

```bash
pnpm logit tail
pnpm logit query
pnpm logit ui --port 4000    # dev server uses 3000, so use a different port
```

`@logit/cli` is wired up as a `workspace:*` devDependency, so `pnpm logit ...` works via the `"logit": "logit"` script in `package.json`. `pnpm exec logit ...` also works.

> `npx logit` will not work: since it isn't published yet, npx tries to fetch it from the registry and fails. Use `pnpm` instead.

See [`@logit/cli`](../../packages/cli/README.md) and [Web UI](../../apps/web-ui/README.md) for details.
