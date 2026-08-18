# Requirements

## Functional Requirements

- Store browser logs in a local directory
- Support integration through a Vite dev server plugin
- Store Node.js logs in a local directory
- Support Bun and Deno when possible
- Preserve existing runtime commands as much as possible
- Optimize the system for querying logs
- Capture network logs for both browser and runtime environments

## Product Decisions

- The product name is `kilog`
- Start with a CLI-first product
- Include a sample web UI
- Use `pnpm` as the package manager
- Use `Vite` and `vite-plus` for build and development tooling
- Use ESM as the default module format
- Use `ESLint` as the custom linter
- Use `Vitest` for tests
- Use `Playwright` if E2E coverage is needed
- Use `Hono` as the first-choice server framework when a server is needed
- Use TypeScript in strict mode
- Partition saved logs by `date + runtime`
- Use JSONL for the raw format
- Use DuckDB as the query backend
- Resolve sourcemaps at query time in the MVP
- Enable a minimum PII masking policy by default and allow extension through configuration
- Publish a single npm package (`kilog`) with subpath exports per integration
- Organize the code as modules under `packages/kilog/src` instead of large domain folders
- Keep sample applications under `examples/`
- Keep repository-level end-to-end tests under `tests/e2e`

## Runtime Support

- Node.js: first-class support
- Bun: second priority
- Deno: experimental

## Platform Support

- Linux: first-class support
- macOS: second priority
- Windows: best effort
