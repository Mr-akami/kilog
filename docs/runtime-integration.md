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
NODE_OPTIONS="--import @logit/runtime-node/register" node server.js
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
bun --preload @logit/runtime-bun/register app.ts
```

Or:

```bash
BUN_INSPECT_PRELOAD=@logit/runtime-bun/register bun app.ts
```

The collected signal set should match Node.js by default.

## Deno

Deno is experimental in the initial version.

Integration approach:

- manual import
- wrapper
- task-based execution

Example:

```ts
import "@logit/runtime-deno/register";
import "./main.ts";
```

## Shared Policy

- Preserve existing commands as much as possible
- Prefer zero-change or minimal-change installation paths
- Allow runtime-specific installation methods while keeping a shared event schema
