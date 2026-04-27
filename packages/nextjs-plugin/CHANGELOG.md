# @kilog/nextjs-plugin

## 1.2.0

### Minor Changes

- [#54](https://github.com/Mr-akami/kilog/pull/54) [`32ccaa2`](https://github.com/Mr-akami/kilog/commit/32ccaa2bc2651e496f5faf4f05cc2a87d3dd130f) Thanks [@Mr-akami](https://github.com/Mr-akami)! - feat: Next.js support via `@kilog/nextjs-plugin`

  New package that wraps `next.config.ts` with `withKilog(...)`. On `next dev` it auto-generates `instrumentation.ts` and `instrumentation-client.ts` (gitignored), starts a localhost receiver, and rewrites `/__kilog` to it — no other user code changes. Supports App + Pages Router and Webpack + Turbopack. Requires Next.js >= 15.3.

  `@kilog/core` exposes browser-runtime helpers under the new `@kilog/core/browser` subpath; `@kilog/vite-plugin` now re-exports from there. The meta-package `@kilog/kilog` ships `@kilog/nextjs-plugin` and exposes it via `@kilog/kilog/nextjs-plugin`.

### Patch Changes

- Updated dependencies [[`32ccaa2`](https://github.com/Mr-akami/kilog/commit/32ccaa2bc2651e496f5faf4f05cc2a87d3dd130f)]:
  - @kilog/core@1.2.0
  - @kilog/register@1.2.0
