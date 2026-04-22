# Architecture

## High Level

`kilog` consists of runtime-specific agents plus shared storage and query infrastructure.

The implementation uses a pnpm workspace monorepo. Instead of creating large domain folders, split the repository by package-level responsibility.

Target package families:

- `core`: event schema, serializer, redaction, file layout
- `vite-plugin`: browser agent
- `runtime-node`: Node.js register
- `runtime-bun`: Bun register
- `runtime-deno`: Deno register
- `cli`: tail, query, reindex, prune, doctor, ui
- `web-ui`: sample web UI

Initial repository packages and apps:

- `packages/core`
- `packages/cli`
- `packages/vite-plugin`
- `packages/runtime-node`
- `packages/web-ui`
- `examples/vite-client`
- `examples/node-server`
- `tests/e2e`

## Repository Policy

- Use `pnpm` as the package manager
- Split the workspace into packages
- Implement everything as ESM
- Use TypeScript in strict mode
- Use `ESLint` as the linter
- Use `Vitest` for unit and integration tests
- Use `Playwright` when E2E coverage is needed
- Use `Hono` when an HTTP server is required

## Package-Oriented Structure

Treat each workspace package as the smallest unit of responsibility and distribution instead of building around large domain folders.

Goals:

- Isolate runtime-specific differences at package boundaries
- Evolve the CLI, core, plugin, and sample UI independently
- Control publishing, testing, and dependencies per package
- Keep the repository ready for future OSS publishing strategies

See [Repository Structure](repository-structure.md) for the concrete top-level layout and package responsibilities.

## Data Flow

Browser:

- The Vite plugin injects a browser runtime
- The browser runtime captures `console`, `error`, `unhandledrejection`, and `fetch`
- The agent appends events to raw JSONL

Runtime:

- A runtime agent is installed through preload or import
- The runtime agent captures `console`, `uncaughtException`, `unhandledRejection`, and `fetch`
- The agent appends events to raw JSONL

Search:

- The CLI builds the DuckDB index from raw JSONL
- The CLI and the sample UI query DuckDB

## Storage Layout

```text
.kilog/
  raw/
    2026-04-18.browser.jsonl
    2026-04-18.node.jsonl
    2026-04-18.bun.jsonl
    2026-04-18.deno.jsonl
  index/
    logs.duckdb
  cache/
    sourcemaps/
  meta/
    sessions.json
```

## Design Choice

Do not require a dedicated collector process in the initial design.

Reasons:

- Adoption stays lightweight
- There is no separate collector process to forget
- Raw JSONL remains the source of truth
- The DuckDB index can be rebuilt later
