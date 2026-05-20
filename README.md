# kilog

**Let your AI agent search your browser and Node.js logs in one command.** That's the point of kilog.

Kilog captures `console`, `fetch`, and uncaught errors during development into a per-project `.kilog/` directory. Point the CLI (or Web UI) at any directory and it searches every `.kilog/` beneath it — you pick the scope, nothing is centralized.

## Features

- CLI for AI agents — `kilog logs` mirrors the `docker logs` interface (`-f`, `--since`, `--until`, `-n/--tail`) and pipes naturally into `rg` / `grep` for text search
- Web UI for humans — live stream, filters, and a browsable history
- DuckDB under the hood — run any SQL you want over your logs (`kilog sql`)
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

```bash
# Next.js app
npm i -D @kilog/cli @kilog/nextjs-plugin
# or
pnpm add -D @kilog/cli @kilog/nextjs-plugin
```

Available packages: `@kilog/cli`, `@kilog/core`, `@kilog/register`, `@kilog/runtime-node`, `@kilog/vite-plugin`, `@kilog/nextjs-plugin`, `@kilog/wrangler-plugin`, `@kilog/web-ui`. `@kilog/kilog` is a meta-package that depends on all of them — convenient for single-install; import paths are shorter via the individual packages.

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

| Var             | Default         | Description                                                                                                                   |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `KILOG_DIR`     | `process.cwd()` | Base directory that holds `.kilog/`.                                                                                          |
| `KILOG_PERSIST` | unset           | Set to `1` to keep previous logs across restarts. Default wipes `.kilog/raw/*.jsonl` + `.kilog/index/` on each process start. |

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
kilogPlugin({ terminal: true }); // mirror every captured event to stdout (colored)
kilogPlugin({ terminal: "warn" }); // only warn/error
kilogPlugin({ terminal: "error" }); // errors only
// default: no terminal output; events go to .kilog/ only

kilogPlugin({ persist: true }); // keep previous logs across dev restarts
// default: wipe .kilog/raw/*.jsonl and .kilog/index/ on server start

kilogPlugin({ server: false }); // disable server-side capture (Vite SSR)
// default: server capture ON — Hono+Vite / Vite-Next / etc. just work
```

| Option     | Type                                                | Default | Description                                                                                                                        |
| ---------- | --------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `terminal` | `boolean \| "debug" \| "info" \| "warn" \| "error"` | `false` | Also print captured events to stdout. `true` = all; a level threshold filters console/error/rejection events.                      |
| `persist`  | `boolean`                                           | `false` | Keep previously captured logs across dev server restarts. Default wipes `.kilog/raw/*.jsonl` and `.kilog/index/` on startup.       |
| `server`   | `boolean`                                           | `true`  | Also capture the dev server's runtime (Node/Bun/Deno) — handles Vite SSR setups (Hono+Vite, Vite-Next, etc.). Set `false` to skip. |

→ [`packages/vite-plugin`](./packages/vite-plugin/README.md)

### Next.js (App Router or Pages Router)

```ts
// next.config.ts
import { withKilog } from "@kilog/nextjs-plugin";

export default withKilog({
  // your existing Next config
});
```

`next dev` is enough — the plugin auto-generates `instrumentation.ts` and `instrumentation-client.ts` (gitignored), starts a localhost receiver, and rewrites `/__kilog` to it. `next build` / `next start` are no-ops.

Same `terminal` / `persist` options as the Vite plugin. Requires Next 15.3+.

→ [`packages/nextjs-plugin`](./packages/nextjs-plugin/README.md)

### Cloudflare Workers (`wrangler dev`)

Local-only — production deploys are unaffected.

**Plain `wrangler dev`:**

```ts
// src/index.ts
import "@kilog/wrangler-plugin/instrument";
import { withKilog } from "@kilog/wrangler-plugin/with-kilog";

export default withKilog({
  async fetch(req, env, ctx) {
    return new Response("hi");
  },
});
```

```json
// package.json
{ "scripts": { "dev": "kilog-wrangler dev" } }
```

`kilog-wrangler` starts a localhost receiver, then exec's `wrangler dev` with `--var KILOG_RECEIVER_URL:…` and `--define __KILOG_RECEIVER_URL__:"…"` so the worker can ship `console`/`fetch`/error events back. Events land in `.kilog/raw/<date>.workerd.jsonl`.

**Vite + `@cloudflare/vite-plugin`:**

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import kilogWranglerPlugin from "@kilog/wrangler-plugin";

export default defineConfig({
  plugins: [cloudflare(), kilogWranglerPlugin()],
});
```

The plugin registers the `/__kilog` middleware on the Vite dev server and auto-injects `import "@kilog/wrangler-plugin/instrument"` into the worker entry — no code changes required in your worker.

→ [`packages/wrangler-plugin`](./packages/wrangler-plugin/README.md)

### View logs

`kilog logs` takes the same flags as `docker logs` (`-f`, `--since`, `--until`, `-n/--tail`). Pipe to `rg` / `grep` for text search.

```bash
npx kilog logs              # print logs across every .kilog/ under cwd
npx kilog logs -f           # print backfill, then follow new logs
npx kilog logs --since 10m | rg TypeError
npx kilog sql "SELECT level, COUNT(*) FROM logs GROUP BY level"
npx kilog ui                # browser UI (auto-shuts down when you close the tab)
```

**When to use which:**

- **Running in Docker** — set `kilogPlugin({ terminal: true })` so captured events go to stdout, then let the agent read `docker logs <container>`. No extra CLI needed.
- **Native / nix shells, or you want structured queries** — use the `kilog` CLI. It adds `--since`/`--tail`/`--level`/`--runtime` filters and a SQL escape hatch that `docker logs` doesn't have.

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

| Package                                                          | Role                                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------- |
| [`@kilog/kilog`](./packages/kilog)                               | Meta-package: CLI + all libraries bundled                   |
| [`@kilog/runtime-node`](./packages/runtime-node/README.md)       | Node runtime instrumentation                                |
| [`@kilog/vite-plugin`](./packages/vite-plugin/README.md)         | Vite plugin (browser instrumentation + dev-server receiver) |
| [`@kilog/nextjs-plugin`](./packages/nextjs-plugin/README.md)     | Next.js plugin (App + Pages Router; Webpack + Turbopack)    |
| [`@kilog/wrangler-plugin`](./packages/wrangler-plugin/README.md) | Cloudflare Wrangler dev integration (workerd capture)       |
| [`@kilog/cli`](./packages/cli/README.md)                         | `kilog` CLI                                                 |
| [`@kilog/web-ui`](./packages/web-ui/README.md)                   | Hono server + DuckDB-wasm browser UI                        |
| [`@kilog/register`](./packages/register/README.md)               | Auto-register hook (runtime dispatch)                       |
| [`@kilog/core`](./packages/core/README.md)                       | Internal: storage / discovery / index / query               |

## Examples

- [`examples/node-server`](./examples/node-server) — Hono + runtime-node
- [`examples/vite-client`](./examples/vite-client) — Vite + vite-plugin
- [`examples/hono-vite`](./examples/hono-vite) — Hono bundled by Vite (`@hono/vite-dev-server`) with server-side capture
- [`examples/nextjs-app`](./examples/nextjs-app) — Next.js App Router + nextjs-plugin
- [`examples/nextjs-pages`](./examples/nextjs-pages) — Next.js Pages Router + nextjs-plugin
- [`examples/wrangler-vite`](./examples/wrangler-vite) — Cloudflare Worker via Vite + @cloudflare/vite-plugin + wrangler-plugin
- [`examples/wrangler-worker`](./examples/wrangler-worker) — plain `wrangler dev` + wrangler-plugin's `kilog-wrangler` launcher

## Claude Code plugin

kilog ships a Claude Code skill that routes natural-language log requests ("logs from the last 10 min", "errors in project foo") to the right `kilog` CLI invocation.

```
/plugin marketplace add Mr-akami/kilog
/plugin install kilog
```

Or fetch the skill file directly with `curl`:

```bash
mkdir -p ~/.claude/skills/kilog
curl -fsSL https://raw.githubusercontent.com/Mr-akami/kilog/main/plugin/skills/kilog/SKILL.md \
  -o ~/.claude/skills/kilog/SKILL.md
```

See [`plugin/README.md`](./plugin/README.md) for details.

## Docs

- [Development (monorepo)](./docs/development.md) — setup, build, watch, test
- [Release](./docs/release.md) — changesets, Trusted Publishing, bootstrap
- [Docs index](./docs/index.md) — product / architecture / runtime / query model
