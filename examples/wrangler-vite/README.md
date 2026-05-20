# wrangler-vite example

Cloudflare Workers (workerd) driven by Vite + `@cloudflare/vite-plugin`, with
kilog wired in via `@kilog/wrangler-plugin`.

```bash
pnpm dev
# in another shell
curl http://localhost:5173/
curl http://localhost:5173/warn
curl http://localhost:5173/fetch
pnpm kilog logs
```

`kilogWranglerPlugin()` auto-injects `import "@kilog/wrangler-plugin/instrument"`
into `src/index.ts` and bakes the dev server's `/__kilog` URL into the worker
bundle. Worker `console`, `fetch`, and global error events land in
`.kilog/raw/<date>.workerd.jsonl`.

Local dev only — `wrangler deploy` produces an unmodified bundle.
