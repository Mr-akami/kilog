# @logit/web-ui

Browser UI for `.devlogs/` backed by DuckDB-wasm. The server is a thin Hono app that does SSR of the initial HTML and serves JSONL files on demand — all queries run in the browser.

## Usage

Start it via [`@logit/cli`](../cli/README.md):

```bash
pnpm logit ui                 # http://localhost:3000
pnpm logit ui --port 4000
```

Use `--port` if it collides with your app's dev server. The server scans from cwd (or `--root <path>`) to discover every `.devlogs/` under it.

## Runtime behavior

- **Hono SSR** renders the initial HTML with discovered sources pre-embedded — no flash of empty state.
- **DuckDB-wasm** is loaded in a Web Worker on page load. The schema matches the on-disk schema (`logs` table).
- **Initial ingest**: browser fetches each JSONL over `/api/read` and INSERTs into the wasm DB.
- **Live updates**: every 2 s, the client polls `/api/sources` and fetches only the new byte range since the last offset (per file).
- **Heartbeat / auto-shutdown**: the client pings `/api/heartbeat` every 5 s. If the server sees no activity for 5 min it `process.exit(0)`s — so closing the tab and forgetting about it eventually reaps the process, but transient page reloads / backgrounded tabs do not kill it.
- **Client-side failure handling**: if three consecutive heartbeats fail (server already gone), the client stops polling and shows "server stopped" in the header.

## UI

- **Root input** (editable): switch the discovery scope on the fly. Clears the wasm DB and re-ingests from the new path.
- **Filter bar**: project / runtime / type / level dropdowns + free-text search.
- **Raw SQL input**: run any SELECT against the wasm DB (`logs` table). Results render as a generic table.
- **Clear DuckDB**: drop rows from the in-browser DB, then re-ingest from disk (non-destructive).
- **Clear logs on disk**: delete every `.devlogs/raw/*.jsonl` and `.devlogs/index/` under the current root, then clear the wasm DB (destructive, requires confirmation).

## HTTP API

- `GET /` — SSR HTML + embedded initial state (`window.__LOGIT_SSR__`)
- `GET /api/sources?root=<path>` — discovered JSONL files: `{ root, sources: [{ path, displayPath, project, size, mtime }] }`
- `GET /api/read?path=<abs>&offset=<n>` — streams bytes from `offset`; `X-File-Size` header reports current size for offset bookkeeping
- `GET /api/heartbeat` — keeps the server alive (resets idle timer)
- `POST /api/clear` (body: `{ root }`) — deletes all `.jsonl` files and `index/` directories under the root; returns `{ rawFilesDeleted, indexDbsDeleted }`

Example:

```bash
curl "http://localhost:3000/api/sources" | jq
```

## Programmatic API

```ts
import { startServer } from "@logit/web-ui";

await startServer({
  port: 3000,
  root: process.cwd(),
  idleTimeoutMs: 5 * 60_000,   // default
  watchdogIntervalMs: 10_000,  // default
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
pnpm --filter @logit/web-ui build        # vite build + tsc
pnpm --filter @logit/web-ui build:client # vite only
pnpm --filter @logit/web-ui build:server # tsc only
pnpm --filter @logit/web-ui dev:client   # Vite dev server for the browser bundle
```

The client build emits to `dist/public/` (hashed assets + `.vite/manifest.json`). The server resolves the JS URL from the manifest at request time.

### Editing server-side TS

Rebuild with `pnpm tsc -b --watch` from the repo root.

### Editing browser client

Run `pnpm --filter @logit/web-ui dev:client` for Vite's HMR, or `pnpm --filter @logit/web-ui build:client` for one-off builds.

### Tests

```bash
pnpm --filter @logit/web-ui test
```

Covers SSR output, `/api/sources`, `/api/read` (including offset + security), `/api/clear`, and `/api/heartbeat`.
