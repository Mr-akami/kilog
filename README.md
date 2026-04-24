# kilog

One place for logs from your Vite-based browser app, your Node app, and the AI agent working on them — seamlessly viewed together.
Capture `console`, `fetch`, and uncaught errors during development, then search and browse them from the CLI or a browser UI.

## Features

- CLI for AI agents — tail / query / aggregate logs from the terminal
- Web UI for humans — live stream, filters, and a browsable history
- DuckDB under the hood — run any SQL you want over your logs
- Zero-code setup: `--import` flag for Node, one-line plugin for Vite
- Per-project `.kilog/` storage, portable and standalone

## Install

Install everything in one go (Reccomended):

```bash
npm i -D @kilog/kilog
# or
pnpm add -D @kilog/kilog
```

Or install only what you need:

```bash
# Node app
npm i -D @kilog/cli @kilog/register
# or
pnpm add -D @kilog/cli @kilog/register
```

```bash
# Browser / Vite app
npm i -D @kilog/cli @kilog/vite-plugin
# or
pnpm add -D @kilog/cli @kilog/vite-plugin
```

Available packages: `@kilog/cli`, `@kilog/core`, `@kilog/register`, `@kilog/runtime-node`, `@kilog/vite-plugin`, `@kilog/web-ui`. `@kilog/kilog` is a meta-package that depends on all of them — convenient for single-install; import paths are shorter via the individual packages.

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

Environment variables:

| Var             | Default       | Description                                                                                           |
| --------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| `KILOG_DIR`     | `process.cwd()` | Base directory that holds `.kilog/`.                                                                  |
| `KILOG_PERSIST` | unset         | Set to `1` to keep previous logs across restarts. Default wipes `.kilog/raw/*.jsonl` + `.kilog/index/` on each process start. |

```bash
KILOG_PERSIST=1 node --import @kilog/register ./src/index.ts
```

(Node already logs to the terminal, so there is no `terminal` option on this side.)

→ [`packages/register`](./packages/register/README.md) · [`packages/runtime-node`](./packages/runtime-node/README.md)

### Browser (Vite)

```ts
// vite.config.ts
import { defineConfig } from "vite";
import kilogPlugin from "@kilog/vite-plugin";

export default defineConfig({
  plugins: [kilogPlugin()],
});
```

Plugin options:

```ts
kilogPlugin({ terminal: true });    // mirror every captured event to stdout (colored)
kilogPlugin({ terminal: "warn" });  // only warn/error
kilogPlugin({ terminal: "error" }); // errors only
// default: no terminal output; events go to .kilog/ only

kilogPlugin({ persist: true });     // keep previous logs across dev restarts
// default: wipe .kilog/raw/*.jsonl and .kilog/index/ on server start
```

| Option     | Type                                              | Default | Description                                                                                        |
| ---------- | ------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `terminal` | `boolean \| "debug" \| "info" \| "warn" \| "error"` | `false` | Also print captured events to stdout. `true` = all; a level threshold filters console/error/rejection events. |
| `persist`  | `boolean`                                         | `false` | Keep previously captured logs across dev server restarts. Default wipes `.kilog/raw/*.jsonl` and `.kilog/index/` on startup. |

→ [`packages/vite-plugin`](./packages/vite-plugin/README.md)

### View logs

```bash
npx kilog tail     # live stream across every .kilog/ under cwd
npx kilog query    # search / filter
npx kilog ui       # browser UI (auto-shuts down when you close the tab)
```

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
| [`@kilog/kilog`](./packages/kilog)                         | Meta-package: CLI + all libraries bundled                   |
| [`@kilog/runtime-node`](./packages/runtime-node/README.md) | Node runtime instrumentation                                |
| [`@kilog/vite-plugin`](./packages/vite-plugin/README.md)   | Vite plugin (browser instrumentation + dev-server receiver) |
| [`@kilog/cli`](./packages/cli/README.md)                   | `kilog` CLI                                                 |
| [`@kilog/web-ui`](./packages/web-ui/README.md)             | Hono server + DuckDB-wasm browser UI                        |
| [`@kilog/register`](./packages/register/README.md)         | Auto-register hook (runtime dispatch)                       |
| [`@kilog/core`](./packages/core/README.md)                 | Internal: storage / discovery / index / query               |

## Examples

- [`examples/node-server`](./examples/node-server) — Hono + runtime-node
- [`examples/vite-client`](./examples/vite-client) — Vite + vite-plugin

## Docs

- [Development (monorepo)](./docs/development.md) — setup, build, watch, test
- [Release](./docs/release.md) — changesets, Trusted Publishing, bootstrap
- [Docs index](./docs/index.md) — product / architecture / runtime / query model
