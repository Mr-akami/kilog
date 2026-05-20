# @kilog/wrangler-plugin

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
