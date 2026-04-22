# kilog

Capture `console`, `fetch`, and uncaught errors from your app during development, then search and browse them via CLI or a browser UI powered by DuckDB-wasm.

## Features

- Zero-code integration (`--import` flag or Vite plugin)
- Works in Node and the browser
- Per-project storage under each project's `.kilog/` (JSONL + DuckDB index)
- CLI (`kilog tail / query / ui / ...`) with filters, aggregation, and raw SQL
- Web UI: Hono SSR shell + in-browser DuckDB-wasm, 2 s live updates, raw SQL input, editable root, "Clear DuckDB" and "Clear logs on disk" buttons, auto-shutdown when the tab closes

## Quick start

### Node (Hono / Express / etc.)

```json
{
  "scripts": {
    "dev": "node --import @kilog/register ./src/index.ts"
  }
}
```

`@kilog/register` auto-dispatches to the right runtime package based on
where it's running (Node / Bun / Deno).

→ [`packages/register`](./packages/register/README.md) · [`packages/runtime-node`](./packages/runtime-node/README.md)

### Browser (Vite)

```ts
// vite.config.ts
import kilog from "@kilog/vite-plugin";
export default { plugins: [kilog()] };
```

→ [`packages/vite-plugin`](./packages/vite-plugin/README.md)

### View logs

```bash
pnpm kilog tail     # live stream across every .kilog/ under cwd
pnpm kilog query    # search / filter
pnpm kilog ui       # browser UI (auto-shuts down when you close the tab)
```

Not published to npm yet. Inside the workspace, add `@kilog/cli` as a devDependency and invoke via `pnpm kilog`.

→ [`packages/cli`](./packages/cli/README.md) / [`packages/web-ui`](./packages/web-ui/README.md)

## Storage model

Each project keeps its own, self-contained `.kilog/`:

```
<project>/.kilog/
├── raw/     # JSONL: {date}.{runtime}.jsonl
└── index/   # DuckDB: logs.duckdb
```

The CLI and UI walk down from the **invocation directory** (or `--root <path>`) to find every `.kilog/` under it, then operate on each one independently. No unified database — each `.kilog/` is standalone and portable.

## Packages

| Package                                                    | Role                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| [`@kilog/runtime-node`](./packages/runtime-node/README.md) | Node runtime instrumentation                                |
| [`@kilog/vite-plugin`](./packages/vite-plugin/README.md)   | Vite plugin (browser instrumentation + dev-server receiver) |
| [`@kilog/cli`](./packages/cli/README.md)                   | `kilog` CLI                                                 |
| [`@kilog/web-ui`](./packages/web-ui/README.md)             | Hono server + DuckDB-wasm browser UI                        |
| [`@kilog/core`](./packages/core/README.md)                 | Internal: storage / discovery / index / query               |

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

Packages reference each other via `workspace:*` and their `main` points to `./dist/`, so **an initial build (and a rebuild after changes) is required**. `@kilog/web-ui` additionally bundles its browser client with Vite.

### Watch

```bash
pnpm tsc -b --watch    # server-side TS (core, cli, web-ui server, etc.)
# and in packages/web-ui, for the client side:
pnpm --filter @kilog/web-ui dev:client
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
