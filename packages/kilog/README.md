# @mr-akami/kilog

**Let your AI agent search your browser and Node.js logs in one command.**

kilog captures `console`, `fetch`, and uncaught errors during development into a
per-project `.kilog/` directory. Point the CLI (or web UI) at any directory and it
searches every `.kilog/` beneath it — you pick the scope, nothing is centralized.

```bash
npm i -D @mr-akami/kilog
```

One package: the `kilog` CLI, the web UI, and every framework integration.

## Instrument

Node — no code changes:

```json
{ "scripts": { "dev": "node --import @mr-akami/kilog/register ./src/index.ts" } }
```

Vite:

```ts
import kilogPlugin from "@mr-akami/kilog/vite-plugin";
export default defineConfig({ plugins: [kilogPlugin()] });
```

Next.js (App or Pages Router):

```ts
import { withKilog } from "@mr-akami/kilog/nextjs-plugin";
export default withKilog({
  /* your next config */
});
```

Cloudflare Workers (`wrangler dev`):

```ts
import kilogWranglerPlugin from "@mr-akami/kilog/wrangler-plugin";
export default defineConfig({ plugins: [cloudflare(), kilogWranglerPlugin()] });
```

## Read

```bash
kilog logs -f                    # follow, docker-logs-style flags
kilog logs --since 10m -n 100
kilog logs --level error | rg timeout
kilog sql "select level, count(*) from logs group by 1"
kilog stats
kilog ui                         # browser UI on :3210
kilog doctor                     # is anything actually being captured?
```

`logs` also takes `--until`, `--runtime`, `--project`, and `--json`.

## Entry points

| Import                            | What                                            |
| --------------------------------- | ----------------------------------------------- |
| `@mr-akami/kilog`                 | storage / discovery / index / query primitives  |
| `@mr-akami/kilog/register`        | auto-register hook (Node / Bun / Deno dispatch) |
| `@mr-akami/kilog/runtime-node`    | Node runtime instrumentation                    |
| `@mr-akami/kilog/vite-plugin`     | Vite plugin                                     |
| `@mr-akami/kilog/nextjs-plugin`   | Next.js plugin                                  |
| `@mr-akami/kilog/wrangler-plugin` | Cloudflare Wrangler dev integration             |
| `@mr-akami/kilog/web-ui`          | Hono server + DuckDB-wasm browser UI            |

Logs are JSONL under `.kilog/raw/`, indexed into DuckDB — nothing leaves your machine.

Previously published as the `@kilog/*` scoped packages; those are deprecated.

Full docs: <https://github.com/Mr-akami/kilog>

MIT
