---
"@kilog/kilog": minor
"@kilog/core": minor
"@kilog/vite-plugin": minor
"@kilog/nextjs-plugin": minor
---

feat: Next.js support via `@kilog/nextjs-plugin`

New package that wraps `next.config.ts` with `withKilog(...)`. On `next dev` it auto-generates `instrumentation.ts` and `instrumentation-client.ts` (gitignored), starts a localhost receiver, and rewrites `/__kilog` to it — no other user code changes. Supports App + Pages Router and Webpack + Turbopack. Requires Next.js >= 15.3.

`@kilog/core` exposes browser-runtime helpers under the new `@kilog/core/browser` subpath; `@kilog/vite-plugin` now re-exports from there. The meta-package `@kilog/kilog` ships `@kilog/nextjs-plugin` and exposes it via `@kilog/kilog/nextjs-plugin`.
