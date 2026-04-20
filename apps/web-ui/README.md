# @logit/web-ui

Web UI server for browsing `.devlogs/` in a browser.

## Usage

Start it via [`@logit/cli`](../../packages/cli/README.md):

```bash
pnpm logit ui                 # http://localhost:3000
pnpm logit ui --port 4000
```

Use `--port` if it collides with your app's dev server.

## Screen

- **Filter bar**: runtime / type / level dropdowns + full-text search
- **Log table**: Timestamp / Runtime / Type / Level / Message (color-coded by level)

## API endpoints

The UI calls these endpoints. External tools can use them too:

- `GET /api/logs?runtime=&type=&level=&search=&from=&to=&limit=&offset=` — log array
- `GET /api/stats?...` — count aggregation with the same filters

Example:

```bash
curl "http://localhost:3000/api/logs?level=error&limit=10" | jq
```

## Programmatic API

```ts
import { startServer } from "@logit/web-ui";

await startServer({ port: 3000, baseDir: process.cwd() });
```

## Development

### Layout

- `src/server.ts` — Hono server (API + static serving)
- `src/index.ts` — `startServer` entry point
- `public/index.html` / `public/app.js` — frontend (plain HTML/JS, no build step)

### Editing the server (TypeScript)

Edit TS → build → launch via CLI:

```bash
pnpm --filter @logit/web-ui build
pnpm logit ui --port 4000
```

Running `pnpm tsc -b --watch` from the root rebuilds automatically.

### Editing the frontend (`public/`)

No build required. Edit `index.html` / `app.js` and reload the browser. `public/` is served statically by the server (see `publicDir()` in `server.ts`).

### Preparing logs

The UI reads the cwd's `.devlogs/`, so there's nothing to show when empty. To try it out:

```bash
cd examples/node-server
pnpm dev                            # generate some logs
# in another terminal
cd examples/node-server
pnpm logit ui --port 4000            # start from the same cwd
```

### Tests

```bash
pnpm --filter @logit/web-ui test    # server tests (routes/logs, routes/stats)
```
