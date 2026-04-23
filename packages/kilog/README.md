# @kilog/kilog

Meta-package: the `kilog` CLI plus every library bundled in one install.

One place for logs from your Vite-based browser app, your Node app, and the AI agent working on them — seamlessly viewed together.

## Install

```bash
npm i -D @kilog/kilog
# or
pnpm add -D @kilog/kilog
```

This single install gives you:

- `kilog` CLI (for AI agents — tail / query / aggregate from the terminal)
- Web UI (for humans — live stream, filters, browsable history)
- Node runtime instrumentation (`--import @kilog/register`)
- Vite plugin (`import kilogPlugin from "@kilog/vite-plugin"`)

DuckDB under the hood, so you can run any SQL over your logs.

## Quick start

### Node app

```json
{
  "scripts": {
    "dev": "node --import @kilog/register ./src/index.ts"
  }
}
```

### Vite browser app

```ts
// vite.config.ts
import { defineConfig } from "vite";
import kilogPlugin from "@kilog/vite-plugin";

export default defineConfig({
  plugins: [kilogPlugin()],
});
```

### View logs

```bash
npx kilog tail     # live stream
npx kilog query    # search / filter
npx kilog ui       # browser UI
```

## Bundled packages

Installing `@kilog/kilog` pulls in each of these — import them by their own name:

| Package               | What it is                                   |
| --------------------- | -------------------------------------------- |
| `@kilog/cli`          | `kilog` CLI                                  |
| `@kilog/core`         | Storage / discovery / query                  |
| `@kilog/register`     | Node `--import` hook (auto-dispatch runtime) |
| `@kilog/runtime-node` | Node runtime instrumentation                 |
| `@kilog/vite-plugin`  | Vite plugin (browser + dev-server receiver)  |
| `@kilog/web-ui`       | Web UI server                                |

If you only need a subset, install those packages directly instead of this meta-package.

See the [project README](https://github.com/Mr-akami/kilog#readme) for the full story.
