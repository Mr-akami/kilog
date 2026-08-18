# Repository Structure

## Root Layout

The repository is a pnpm workspace that publishes exactly **one** npm package, `kilog`.
Everything the user installs lives in `packages/kilog`; the other workspace entries are
examples and tests that are never published.

```text
kilog/
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
  vite.config.ts
  .tagpr
  README.md
  CHANGELOG.md

  packages/
    kilog/
      package.json        # name: "kilog"
      index.html          # web UI shell
      vite.config.ts      # web UI client bundle
      client/             # browser-side web UI (DuckDB-wasm)
      src/
        core/
        cli/
        register/
        runtime-node/
        vite-plugin/
        nextjs-plugin/
        wrangler-plugin/
        web-ui/

  examples/
    vite-client/
    node-server/
    hono-vite/
    nextjs-app/
    nextjs-pages/
    wrangler-vite/
    wrangler-worker/

  tests/
    e2e/
```

## Published Entry Points

Each module maps to a subpath export of the single package. See the table in the
root [README](../README.md#install).

| Module                | Export                                                                        |
| --------------------- | ----------------------------------------------------------------------------- |
| `src/core`            | `kilog`, `kilog/ansi`, `kilog/browser`, `kilog/dev-receiver`                  |
| `src/cli`             | `kilog` bin                                                                   |
| `src/register`        | `kilog/register`, `kilog/register/detect`                                     |
| `src/runtime-node`    | `kilog/runtime-node`, `kilog/runtime-node/register`                           |
| `src/vite-plugin`     | `kilog/vite-plugin`                                                           |
| `src/nextjs-plugin`   | `kilog/nextjs-plugin` (+ `register-client` / `register-server`)               |
| `src/wrangler-plugin` | `kilog/wrangler-plugin` (+ `instrument` / `with-kilog`), `kilog-wrangler` bin |
| `src/web-ui`          | `kilog/web-ui`                                                                |

## Module Roles

### `src/core`

Shared primitives and storage logic: event schema, JSONL persistence, PII redaction,
DuckDB indexing, shared serialization helpers, the browser runtime generator, and the
dev-receiver middleware.

### `src/cli`

The main user-facing surface: `kilog logs` / `sql` / `stats` / `reindex` / `prune` /
`doctor` / `ui`.

### `src/register`

Runtime detection plus dispatch to the matching runtime module.

### `src/runtime-node`

Node.js instrumentation: preload-style registration, console capture, process error
capture, fetch capture.

### `src/vite-plugin`, `src/nextjs-plugin`, `src/wrangler-plugin`

Framework integrations. Each injects the browser runtime and wires a dev-time receiver
that writes into `.kilog/`.

### `src/web-ui`

Hono server plus SSR shell for the browser UI. The client under `client/` runs
DuckDB-wasm and is bundled into `dist/public` by Vite. Secondary to the CLI workflow.

## Example Apps

`examples/*` are private workspace packages (`kilog-example-*`) that depend on
`kilog` via `workspace:*`. They exist to validate integrations and to document usage.

## Test Layout

`tests/e2e` holds repository-level end-to-end coverage for the CLI and the example apps.
Unit tests live next to their sources under `packages/kilog/src`.

## Structure Policy

- Keep cross-runtime shared logic inside `src/core`
- Keep runtime-specific instrumentation isolated in its own module
- Keep the CLI as the main entry point for product usage
- Keep `examples/` for validation and documentation aids
- Add a new integration as a new module plus a new subpath export — never as a new package
