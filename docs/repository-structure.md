# Repository Structure

## Root Layout

The repository uses a pnpm workspace monorepo with shared configuration files at the root.

```text
logit/
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
  eslint.config.js
  .gitignore
  README.md

  packages/
    core/
    cli/
    vite-plugin/
    runtime-node/

  apps/
    web-ui/

  examples/
    vite-client/
    node-server/

  tests/
    e2e/
```

## Package Roles

### `packages/core`

Shared primitives and storage logic.

Responsibilities:

- event schema
- JSONL persistence
- PII redaction
- DuckDB indexing
- shared serialization helpers

Suggested internal layout:

```text
packages/core/
  package.json
  src/
    schema/
    serialize/
    redact/
    storage/
    index/
```

### `packages/cli`

The main user-facing CLI package.

Responsibilities:

- `logit tail`
- `logit query`
- `logit reindex`
- `logit prune`
- `logit doctor`
- `logit ui`

Suggested internal layout:

```text
packages/cli/
  package.json
  src/
    commands/
      tail.ts
      query.ts
      reindex.ts
      prune.ts
      doctor.ts
      ui.ts
```

### `packages/vite-plugin`

Browser log capture for Vite-based local development.

Responsibilities:

- inject the browser client runtime
- capture browser console and error events
- capture browser fetch events
- transport captured events into local storage

Suggested internal layout:

```text
packages/vite-plugin/
  package.json
  src/
    index.ts
    client.ts
    capture/
    transport/
```

### `packages/runtime-node`

Runtime instrumentation for Node.js.

Responsibilities:

- preload-style registration
- console capture
- process error capture
- fetch capture

Suggested internal layout:

```text
packages/runtime-node/
  package.json
  src/
    register.ts
    console.ts
    process.ts
    fetch.ts
```

## Application Role

### `apps/web-ui`

This app is a sample web UI, not the primary product surface.

Responsibilities:

- provide a local visual reference for log browsing
- exercise the shared query model
- stay secondary to the CLI workflow

## Example Apps

### `examples/vite-client`

Browser-side example used to validate Vite plugin behavior.

### `examples/node-server`

Node-side example used to validate runtime-node behavior.

## Test Layout

### `tests/e2e`

End-to-end coverage for the CLI and example apps.

Responsibilities:

- verify CLI behavior against real example projects
- verify ingest, persistence, indexing, and query flows
- cover integration boundaries across packages

## Structure Policy

- Keep cross-runtime shared logic inside `packages/core`
- Keep runtime-specific instrumentation isolated in separate packages
- Keep the CLI as the main entry point for product usage
- Keep `apps/` for runnable product-facing applications
- Keep `examples/` for validation and documentation aids
- Keep repository-level integration tests under `tests/e2e`
