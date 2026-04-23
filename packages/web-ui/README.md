# @kilog/web-ui

Browser UI for `.kilog/` backed by DuckDB-wasm. The server is a thin Hono app that does SSR of the initial HTML and serves JSONL files on demand — all queries run in the browser.

## Usage

Start it via [`@kilog/cli`](../cli/README.md):

```bash
pnpm kilog ui                 # http://localhost:3210
pnpm kilog ui --port 4000
```

Use `--port` if it collides with your app's dev server. The server scans from cwd (or `--root <path>`) to discover every `.kilog/` under it.

## Runtime behavior

- **Hono SSR** renders the initial HTML with discovered sources pre-embedded — no flash of empty state.
- **DuckDB-wasm** is loaded in a Web Worker on page load. The schema matches the on-disk schema (`logs` table).
- **Initial ingest**: browser fetches each JSONL over `/api/read` and INSERTs into the wasm DB.
- **Live updates**: every 2 s, the client polls `/api/sources` and fetches only the new byte range since the last offset (per file).
- **Heartbeat / auto-shutdown**: the client pings `/api/heartbeat` every 5 s. If the server sees no activity for 15 s (default) it `process.exit(0)`s — so forgetting to Ctrl+C doesn't leave a zombie server running after you close the tab.
- **Auto port**: if the requested port is busy, the server picks the next free port (up to +20) instead of failing.
- **Client-side failure handling**: if three consecutive heartbeats fail (server already gone), the client stops polling and shows "server stopped" in the header.

## UI

- **Root input** (editable): switch the discovery scope on the fly. Clears the wasm DB and re-ingests from the new path.
- **Filter bar**: project / runtime / type / level dropdowns + free-text search.
- **Raw SQL input**: run any SELECT against the wasm DB (`logs` table). Results render as a generic table.
- **Clear DuckDB**: drop rows from the in-browser DB, then re-ingest from disk (non-destructive).
- **Clear logs on disk**: delete every `.kilog/raw/*.jsonl` and `.kilog/index/` under the current root, then clear the wasm DB (destructive, requires confirmation).

## HTTP API

The spec is generated from the route definitions via [`hono-openapi`](https://github.com/rhinobase/hono-openapi), so the API reference always matches the implementation:

- `GET /openapi.json` — OpenAPI 3.1 document
- `GET /docs` — Scalar API reference UI (interactive, try-it-out supported)

The browser UI depends on these routes:

| Route                                 | Purpose                                                        |
| ------------------------------------- | -------------------------------------------------------------- |
| `GET /`                               | SSR HTML with initial state embedded as `window.__KILOG_SSR__` |
| `GET /api/sources?root=<path>`        | Discovered JSONL files                                         |
| `GET /api/read?path=<abs>&offset=<n>` | Byte-range streaming; `X-File-Size` header                     |
| `GET /api/heartbeat`                  | Resets the idle-shutdown timer                                 |
| `POST /api/clear`                     | Destructive: removes raw JSONL + per-project index dirs        |

Example:

```bash
curl "http://localhost:3000/openapi.json" | jq '.paths | keys'
open http://localhost:3000/docs      # interactive reference
```

## Programmatic API

```ts
import { startServer } from "@kilog/web-ui";

await startServer({
  port: 3000, // auto-incremented if busy
  root: process.cwd(),
  idleTimeoutMs: 15_000, // default
  watchdogIntervalMs: 5_000,
  portRetry: 20,
});
```

## Development

### Layout

- `src/server.ts` — Hono app (routes + middleware)
- `src/page.ts` — SSR template (hono/html)
- `src/sources.ts` — discovery + descriptor types
- `src/manifest.ts` — reads Vite's build manifest for the bundled JS URL
- `src/clear.ts` — the `/api/clear` filesystem deletion logic
- `src/index.ts` — `startServer` + auto-shutdown watchdog
- `client/main.ts` — browser entry
- `client/duckdb.ts` — DuckDB-wasm init + insert helpers
- `client/ingest.ts` — per-file offset tracking + catch-up
- `client/ui.ts` — rendering + filter SQL builder
- `index.html` — Vite entry (referenced from SSR output)
- `vite.config.ts` — Vite config (outputs `dist/public/` + manifest)

### Build

```bash
pnpm --filter @kilog/web-ui build        # vite build + tsc
pnpm --filter @kilog/web-ui build:client # vite only
pnpm --filter @kilog/web-ui build:server # tsc only
pnpm --filter @kilog/web-ui dev:client   # Vite dev server for the browser bundle
```

The client build emits to `dist/public/` (hashed assets + `.vite/manifest.json`). The server resolves the JS URL from the manifest at request time.

### Editing server-side TS

Rebuild with `pnpm tsc -b --watch` from the repo root.

### Editing browser client

Run `pnpm --filter @kilog/web-ui dev:client` for Vite's HMR, or `pnpm --filter @kilog/web-ui build:client` for one-off builds.

### Tests

```bash
pnpm --filter @kilog/web-ui test
```

Covers SSR output, `/api/sources`, `/api/read` (including offset + security), `/api/clear`, `/api/heartbeat`, `/openapi.json`, and `/docs`.
