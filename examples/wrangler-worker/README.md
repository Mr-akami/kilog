# wrangler-worker example

Plain `wrangler dev` (no Vite), with kilog wired in via
`@kilog/wrangler-plugin`'s `kilog-wrangler` launcher.

```bash
pnpm dev          # launches: kilog-wrangler dev → wrangler dev with kilog vars
# in another shell
curl http://localhost:8787/
curl http://localhost:8787/warn
curl http://localhost:8787/fetch
pnpm kilog logs
```

`kilog-wrangler` starts a localhost receiver on a random port, passes
`KILOG_RECEIVER_URL` to wrangler via `--var` and `__KILOG_RECEIVER_URL__`
via `--define`, then exec's into `wrangler dev` with your args. The
worker's `import "@kilog/wrangler-plugin/instrument"` line wires up
`console`/`fetch`/error capture and ships events to the receiver, which
writes them to `.kilog/raw/<date>.workerd.jsonl`.

Local dev only — `wrangler deploy` is unaffected; instrument no-ops
without a receiver URL.
