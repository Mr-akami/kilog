# logit

Capture `console`, `fetch`, and uncaught errors from your app during development, then search and browse them via CLI or a browser UI powered by DuckDB-wasm.

## Features

- Zero-code integration (`--import` flag or Vite plugin)
- Works in Node and the browser
- Per-project storage under each project's `.devlogs/` (JSONL + DuckDB index)
- CLI (`logit tail / query / ui / ...`) with filters, aggregation, and raw SQL
- Web UI: Hono SSR shell + in-browser DuckDB-wasm, 2 s live updates, raw SQL input, editable root, "Clear DuckDB" and "Clear logs on disk" buttons, auto-shutdown when the tab closes

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
pnpm logit tail     # live stream across every .devlogs/ under cwd
pnpm logit query    # search / filter
pnpm logit ui       # browser UI (auto-shuts down when you close the tab)
```

Not published to npm yet. Inside the workspace, add `@logit/cli` as a devDependency and invoke via `pnpm logit`.

→ [`packages/cli`](./packages/cli/README.md) / [`packages/web-ui`](./packages/web-ui/README.md)

## Storage model

Each project keeps its own, self-contained `.devlogs/`:

```
<project>/.devlogs/
├── raw/     # JSONL: {date}.{runtime}.jsonl
└── index/   # DuckDB: logs.duckdb
```

The CLI and UI walk down from the **invocation directory** (or `--root <path>`) to find every `.devlogs/` under it, then operate on each one independently. No unified database — each `.devlogs/` is standalone and portable.

## Packages

| Package | Role |
|---|---|
| [`@logit/runtime-node`](./packages/runtime-node/README.md) | Node runtime instrumentation |
| [`@logit/vite-plugin`](./packages/vite-plugin/README.md) | Vite plugin (browser instrumentation + dev-server receiver) |
| [`@logit/cli`](./packages/cli/README.md) | `logit` CLI |
| [`@logit/web-ui`](./packages/web-ui/README.md) | Hono server + DuckDB-wasm browser UI |
| [`@logit/core`](./packages/core/README.md) | Internal: storage / discovery / index / query |

## Examples

- [`examples/node-server`](./examples/node-server) — Hono + runtime-node
- [`examples/vite-client`](./examples/vite-client) — Vite + vite-plugin

## Development (monorepo)

Requires Node >= 24 and pnpm. Not published to npm yet, so it only works inside the workspace.

### Setup

```bash
pnpm install
pnpm build        # build every package + bundle the browser client
```

Packages reference each other via `workspace:*` and their `main` points to `./dist/`, so **an initial build (and a rebuild after changes) is required**. `@logit/web-ui` additionally bundles its browser client with Vite.

### Watch

```bash
pnpm tsc -b --watch    # server-side TS (core, cli, web-ui server, etc.)
# and in packages/web-ui, for the client side:
pnpm --filter @logit/web-ui dev:client
```

### Test / typecheck / lint

```bash
pnpm test
pnpm typecheck
pnpm lint
```

### Try it out

- [`examples/node-server`](./examples/node-server/README.md) — Node runtime instrumentation
- [`examples/vite-client`](./examples/vite-client/README.md) — Browser instrumentation
