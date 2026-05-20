# Runtime Integration

## Browser

Browser integration is based on a Vite plugin.

Integration approach:

- Use `transformIndexHtml` to inject the browser runtime
- Use `configureServer` to add dev-server-side helper behavior when needed

Collected signals:

- `console.log/info/warn/error/debug`
- `window.onerror`
- `unhandledrejection`
- `fetch`
- route, href, tab session id

## Node.js

Node.js should use the `--import` path as the first choice.

Goals:

- Avoid major changes to existing `node` commands
- Keep the integration compatible with Node-based runners such as `tsx`

Example:

```bash
NODE_OPTIONS="--import @kilog/register" node server.js
```

Collected signals:

- `console.*`
- `uncaughtException`
- `unhandledRejection`
- `fetch`

## Bun

Bun should use `--preload` as the first choice.

Example:

```bash
bun --preload @kilog/runtime-bun/register app.ts
```

Or:

```bash
BUN_INSPECT_PRELOAD=@kilog/runtime-bun/register bun app.ts
```

The collected signal set should match Node.js by default.

## Cloudflare Workers (workerd, dev only)

Local `wrangler dev` only — production deploys are unaffected.

Integration approach:

- Workerd has no `fs`, so the worker can't write `.kilog/` directly.
  Instead, an instrumented shim (`@kilog/wrangler-plugin/instrument`)
  POSTs each event to a localhost HTTP receiver in the dev driver.
- The receiver URL is baked into the bundle via `define` (Vite path) or
  `wrangler --define` (plain-wrangler path).
- The receiver is the same `/__kilog` endpoint used by the browser and
  Next.js paths, served by `@kilog/core/dev-receiver`.

Two setups:

- **Setup A — Vite proxy**: `kilogWranglerPlugin()` in `vite.config.ts`
  alongside `@cloudflare/vite-plugin`. Vite's dev server hosts the
  receiver; the plugin auto-injects the instrument import into the
  worker entry.
- **Setup B — Plain `wrangler dev`**: `kilog-wrangler` launcher starts a
  receiver, then exec's `wrangler dev` with `--var` + `--define`.
  Worker entry adds `import "@kilog/wrangler-plugin/instrument"` and
  wraps its default export with `withKilog`.

Collected signals:

- `console.*`
- `fetch`
- global `error` and `unhandledrejection` events (where workerd exposes them)

## Deno

Deno is experimental in the initial version.

Integration approach:

- manual import
- wrapper
- task-based execution

Example:

```ts
import "@kilog/runtime-deno/register";
import "./main.ts";
```

## Shared Policy

- Preserve existing commands as much as possible
- Prefer zero-change or minimal-change installation paths
- Allow runtime-specific installation methods while keeping a shared event schema
