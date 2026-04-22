# kilog Vite Client Example

Vite app + [`@kilog/vite-plugin`](../../packages/vite-plugin/README.md) for automatic browser-side log capture.

## Prerequisites (inside the workspace)

Not published to npm yet, so build the workspace first:

```bash
# from the workspace root
pnpm install
pnpm build      # builds @kilog/vite-plugin, @kilog/cli, @kilog/web-ui, etc.
```

`@kilog/vite-plugin` and `@kilog/cli` are linked via `workspace:*` and resolved through each package's `dist/`. When editing TS, keep `pnpm tsc -b --watch` running at the root.

## Run

```bash
pnpm dev
```

Starts the Vite dev server. Open the page in a browser and click the buttons to produce `console.log` / `console.warn` / `console.error` / `fetch` / uncaught errors.

## View logs

Run these in this example's directory (the cwd where `.kilog/` is created):

```bash
pnpm kilog tail
pnpm kilog query
pnpm kilog ui --port 4000    # use a port that doesn't collide with Vite's dev server
```

`@kilog/cli` is wired up as a `workspace:*` devDependency, so `pnpm kilog ...` works via the `"kilog": "kilog"` script in `package.json`. `pnpm exec kilog ...` also works.

> `npx kilog` will not work: since it isn't published yet, npx tries to fetch it from the registry and fails. Use `pnpm` instead.

See [`@kilog/cli`](../../packages/cli/README.md) and [Web UI](../../packages/web-ui/README.md) for details.
