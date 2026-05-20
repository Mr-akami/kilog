# @kilog/nextjs-plugin

## 1.3.0

### Minor Changes

- [#56](https://github.com/Mr-akami/kilog/pull/56) [`b0e5469`](https://github.com/Mr-akami/kilog/commit/b0e546937fb149dfe7bfa02d453f01c1da0d47e4) Thanks [@Mr-akami](https://github.com/Mr-akami)! - Add `@kilog/wrangler-plugin` for Cloudflare Workers (`wrangler dev`).
  Supports both plain `wrangler dev` (via `kilog-wrangler` launcher) and Vite
  - `@cloudflare/vite-plugin`. Worker `console`/`fetch`/error events stream
    into `.kilog/raw/<date>.workerd.jsonl` over a localhost receiver. Adds
    `"workerd"` to the `Runtime` schema and moves the dev-receiver server +
    middleware into `@kilog/core/dev-receiver` for reuse across plugins.

### Patch Changes

- Updated dependencies [[`b0e5469`](https://github.com/Mr-akami/kilog/commit/b0e546937fb149dfe7bfa02d453f01c1da0d47e4)]:
  - @kilog/core@1.3.0
  - @kilog/register@1.3.0

## 1.2.0

### Minor Changes

- [#54](https://github.com/Mr-akami/kilog/pull/54) [`32ccaa2`](https://github.com/Mr-akami/kilog/commit/32ccaa2bc2651e496f5faf4f05cc2a87d3dd130f) Thanks [@Mr-akami](https://github.com/Mr-akami)! - feat: Next.js support via `@kilog/nextjs-plugin`

  New package that wraps `next.config.ts` with `withKilog(...)`. On `next dev` it auto-generates `instrumentation.ts` and `instrumentation-client.ts` (gitignored), starts a localhost receiver, and rewrites `/__kilog` to it — no other user code changes. Supports App + Pages Router and Webpack + Turbopack. Requires Next.js >= 15.3.

  `@kilog/core` exposes browser-runtime helpers under the new `@kilog/core/browser` subpath; `@kilog/vite-plugin` now re-exports from there. The meta-package `@kilog/kilog` ships `@kilog/nextjs-plugin` and exposes it via `@kilog/kilog/nextjs-plugin`.

### Patch Changes

- Updated dependencies [[`32ccaa2`](https://github.com/Mr-akami/kilog/commit/32ccaa2bc2651e496f5faf4f05cc2a87d3dd130f)]:
  - @kilog/core@1.2.0
  - @kilog/register@1.2.0
