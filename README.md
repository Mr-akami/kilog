# kilog

kilog is vite based browser log.
Capture `console`, `fetch`, and uncaught errors from your app during development, then search and browse them via CLI or a browser UI powered by DuckDB-wasm.

## Features

- Zero-code integration (`--import` flag or Vite plugin)
- Works in Node and the browser
- Per-project storage under each project's `.kilog/` (JSONL + DuckDB index)
- CLI (`kilog tail / query / ui / ...`) with filters, aggregation, and raw SQL
- Web UI: Hono SSR shell + in-browser DuckDB-wasm, 2 s live updates, raw SQL input, editable root, "Clear DuckDB" and "Clear logs on disk" buttons, auto-shutdown when the tab closes

## Install

Install only what you need:

```bash
npm i -D @kilog/cli @kilog/register       # Node app
npm i -D @kilog/cli @kilog/vite-plugin    # Browser / Vite app
```

Or install everything in one go (CLI + all libraries, includes web UI):

```bash
npm i -D @kilog/kilog
```

Available packages: `@kilog/cli`, `@kilog/core`, `@kilog/register`, `@kilog/runtime-node`, `@kilog/vite-plugin`, `@kilog/web-ui`. `@kilog/kilog` is a meta-package that depends on all of them — convenient for single-install; import paths are shorter via the individual packages.

## Quick start

### Node (Hono / Express / etc.)

```json
{
  "scripts": {
    "dev": "node --import @kilog/register ./src/index.ts"
  }
}
```

`@kilog/register` auto-dispatches to the right runtime package based on
where it's running (Node / Bun / Deno).

→ [`packages/register`](./packages/register/README.md) · [`packages/runtime-node`](./packages/runtime-node/README.md)

### Browser (Vite)

```ts
// vite.config.ts
import kilog from "@kilog/vite-plugin";
export default { plugins: [kilog()] };
```

→ [`packages/vite-plugin`](./packages/vite-plugin/README.md)

### View logs

```bash
npx kilog tail     # live stream across every .kilog/ under cwd
npx kilog query    # search / filter
npx kilog ui       # browser UI (auto-shuts down when you close the tab)
```

→ [`packages/cli`](./packages/cli/README.md) / [`packages/web-ui`](./packages/web-ui/README.md)

## Storage model

Each project keeps its own, self-contained `.kilog/`:

```
<project>/.kilog/
├── raw/     # JSONL: {date}.{runtime}.jsonl
└── index/   # DuckDB: logs.duckdb
```

The CLI and UI walk down from the **invocation directory** (or `--root <path>`) to find every `.kilog/` under it, then operate on each one independently. No unified database — each `.kilog/` is standalone and portable.

## Packages

| Package                                                    | Role                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| [`@kilog/kilog`](./packages/kilog)                         | Meta-package: CLI + all libraries bundled                   |
| [`@kilog/runtime-node`](./packages/runtime-node/README.md) | Node runtime instrumentation                                |
| [`@kilog/vite-plugin`](./packages/vite-plugin/README.md)   | Vite plugin (browser instrumentation + dev-server receiver) |
| [`@kilog/cli`](./packages/cli/README.md)                   | `kilog` CLI                                                 |
| [`@kilog/web-ui`](./packages/web-ui/README.md)             | Hono server + DuckDB-wasm browser UI                        |
| [`@kilog/register`](./packages/register/README.md)         | Auto-register hook (runtime dispatch)                       |
| [`@kilog/core`](./packages/core/README.md)                 | Internal: storage / discovery / index / query               |

## Examples

- [`examples/node-server`](./examples/node-server) — Hono + runtime-node
- [`examples/vite-client`](./examples/vite-client) — Vite + vite-plugin

## Release

Releases are driven by [changesets](https://github.com/changesets/changesets) and published via GitHub Actions (`.github/workflows/release.yml`).

### Author workflow

```bash
pnpm changeset              # record a change (bump kind + summary)
# commit the generated .changeset/*.md with your PR
```

When the PR lands on `main`, the workflow opens (or updates) a "chore: version packages" PR. Merging that PR bumps versions, writes CHANGELOG, and publishes to npm with provenance via OIDC.

### Required GitHub setup

- Secret: `NPM_TOKEN` — npm **Automation** access token (supports provenance, bypasses 2FA on publish)
- Settings → Actions → General → Workflow permissions → "Read and write" + "Allow GitHub Actions to create and approve pull requests"
- npm org `@kilog` must exist and the token owner must be a member with publish rights

### First publish (manual)

The CI flow assumes packages already exist on npm. For the very first release, publish manually once:

```bash
# 1. Prerequisites
#    - Create npm org: https://www.npmjs.com/org/create (name: kilog)
#    - npm login (2FA enabled)
#    - Ensure local is clean: git status
pnpm install --frozen-lockfile
pnpm build
pnpm test

# 2. Temporarily disable provenance (no OIDC in local env)
#    Edit each packages/*/package.json and remove:
#      "publishConfig": { "access": "public", "provenance": true }
#    Replace with:
#      "publishConfig": { "access": "public" }
#    (6 packages under packages/, plus packages/kilog)

# 3. Publish in dependency order — workspace:* is auto-rewritten to the version
pnpm --filter @kilog/core publish --access public --no-git-checks
pnpm --filter @kilog/runtime-node publish --access public --no-git-checks
pnpm --filter @kilog/register publish --access public --no-git-checks
pnpm --filter @kilog/vite-plugin publish --access public --no-git-checks
pnpm --filter @kilog/web-ui publish --access public --no-git-checks
pnpm --filter @kilog/cli publish --access public --no-git-checks
pnpm --filter @kilog/kilog publish --access public --no-git-checks

# 4. Restore provenance: true and commit
#    From here on, CI handles publishing.

# 5. Verify
npm view @kilog/kilog version
npm view @kilog/cli version
```

Tip: use `pnpm --filter <name> publish --dry-run` first to inspect what would be sent.

## Development (monorepo)

Requires Node >= 24 and pnpm.

### Setup

```bash
pnpm install
pnpm build        # build every package + bundle the browser client
```

Packages reference each other via `workspace:*` and their `main` points to `./dist/`, so **an initial build (and a rebuild after changes) is required**. `@kilog/web-ui` additionally bundles its browser client with Vite.

### Watch

```bash
pnpm tsc -b --watch    # server-side TS (core, cli, web-ui server, etc.)
# and in packages/web-ui, for the client side:
pnpm --filter @kilog/web-ui dev:client
```

### Test / typecheck / lint

```bash
pnpm test
pnpm typecheck
pnpm lint
```

### Try it out

- [`examples/node-server`](./examples/node-server/README.md) — Node runtime instrumentation
- [`examples/vite-client`](./examples/vite-client/README.md) — Browser instrumentation
