---
"@kilog/vite-plugin": minor
---

feat(vite-plugin): capture dev-server runtime (Node/Bun/Deno) by default via `@kilog/register` — handles Vite SSR setups such as Hono+Vite, Vite-Next, etc. New `server?: boolean` option (default `true`); pass `server: false` to opt out.
