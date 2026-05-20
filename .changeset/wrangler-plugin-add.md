---
"@kilog/wrangler-plugin": minor
"@kilog/core": minor
"@kilog/cli": minor
"@kilog/kilog": minor
"@kilog/nextjs-plugin": minor
"@kilog/register": minor
"@kilog/runtime-node": minor
"@kilog/vite-plugin": minor
"@kilog/web-ui": minor
---

Add `@kilog/wrangler-plugin` for Cloudflare Workers (`wrangler dev`).
Supports both plain `wrangler dev` (via `kilog-wrangler` launcher) and Vite

- `@cloudflare/vite-plugin`. Worker `console`/`fetch`/error events stream
  into `.kilog/raw/<date>.workerd.jsonl` over a localhost receiver. Adds
  `"workerd"` to the `Runtime` schema and moves the dev-receiver server +
  middleware into `@kilog/core/dev-receiver` for reuse across plugins.
