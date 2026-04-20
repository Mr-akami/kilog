# logit

Capture `console`, `fetch`, and uncaught errors from your app during development, then search and browse them via CLI or Web UI.

## Features

- Zero-code integration (`--import` flag or Vite plugin)
- Works in Node and the browser
- Stored locally under `.devlogs/` (JSONL + DuckDB index)
- CLI (`logit tail / query / ui ...`) and Web UI for browsing

## Quick start

### Node (Hono / Express / etc.)

```json
{
  "scripts": {
    "dev": "node --import @logit/runtime-node/register ./src/index.ts"
  }
}
```

→ [`packages/runtime-node`](./packages/runtime-node/README.md)

### Browser (Vite)

```ts
// vite.config.ts
import logit from "@logit/vite-plugin";
export default { plugins: [logit()] };
```

→ [`packages/vite-plugin`](./packages/vite-plugin/README.md)

### View logs

```bash
pnpm logit tail     # live stream
pnpm logit query    # search / filter
pnpm logit ui       # Web UI
```

(Not published yet, so `npx logit` **does not work**. Add `@logit/cli` as a devDependency and use `pnpm logit ...`.)

→ [`packages/cli`](./packages/cli/README.md) / [`apps/web-ui`](./apps/web-ui/README.md)

## Packages

| Package | Role |
|---|---|
| [`@logit/runtime-node`](./packages/runtime-node/README.md) | Node runtime instrumentation |
| [`@logit/vite-plugin`](./packages/vite-plugin/README.md) | Vite plugin (browser instrumentation + dev-server receiver) |
| [`@logit/cli`](./packages/cli/README.md) | `logit` CLI |
| [`@logit/web-ui`](./apps/web-ui/README.md) | Web UI server |
| [`@logit/core`](./packages/core/README.md) | Internal: storage / query |

## Examples

- [`examples/node-server`](./examples/node-server) — Hono + runtime-node
- [`examples/vite-client`](./examples/vite-client) — Vite + vite-plugin

## Log storage

Under the current working directory's `.devlogs/`:

```
.devlogs/
├── raw/     # JSONL: {date}.{runtime}.jsonl
└── index/   # DuckDB: logs.duckdb
```

CLI and UI read from the cwd's `.devlogs/`, so run them in the same directory as your app.

## Development (monorepo)

Requires Node >= 24 and pnpm. Not published to npm yet, so it only works inside the workspace.

### Setup

```bash
pnpm install
pnpm build        # build every package into its dist/
```

Packages reference each other via `workspace:*` and their `main` points to `./dist/index.js`, so **an initial build (and a rebuild after changes) is required**.

### Watch

To edit TypeScript while running:

```bash
pnpm tsc -b --watch    # watch every package from the root
```

Run examples / CLI in separate terminals.

### Test / typecheck / lint

```bash
pnpm test
pnpm typecheck
pnpm lint
```

### Try it out

- [`examples/node-server`](./examples/node-server/README.md) — Node runtime instrumentation
- [`examples/vite-client`](./examples/vite-client/README.md) — Browser instrumentation

### Per-package docs

- [`@logit/runtime-node`](./packages/runtime-node/README.md)
- [`@logit/vite-plugin`](./packages/vite-plugin/README.md)
- [`@logit/cli`](./packages/cli/README.md)
- [`@logit/web-ui`](./apps/web-ui/README.md) ← includes dev workflow
- [`@logit/core`](./packages/core/README.md)
