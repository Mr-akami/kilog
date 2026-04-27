# @kilog/nextjs-plugin

Next.js plugin for [kilog](https://github.com/Mr-akami/kilog). Captures `console`, `fetch`, and uncaught errors from both the browser and the Node server runtime — with one `next.config.ts` edit and nothing else.

## Install

```bash
pnpm add -D @kilog/nextjs-plugin
```

Requires Next.js 15.3 or newer.

## Usage

```ts
// next.config.ts
import { withKilog } from "@kilog/nextjs-plugin";

export default withKilog({
  // your existing Next config
});
```

Run `next dev`. That's it. The plugin:

- Generates `instrumentation.ts` and `instrumentation-client.ts` at the project root (gitignored).
- Starts a localhost HTTP receiver on a random port.
- Adds a `/__kilog` rewrite so the browser script reaches the receiver.

`next build` and `next start` are no-ops — instrumentation is dev-only.

## Options

```ts
withKilog(nextConfig, { terminal: true }); // mirror events to stdout (colored)
withKilog(nextConfig, { terminal: "warn" }); // only warn/error
withKilog(nextConfig, { persist: true }); // keep logs across dev restarts
```

| Option     | Type                                                | Default | Description                                                                                                       |
| ---------- | --------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `terminal` | `boolean \| "debug" \| "info" \| "warn" \| "error"` | `false` | Also print captured events to stdout. `true` = all; a level threshold filters events that have a level.           |
| `persist`  | `boolean`                                           | `false` | Keep previously captured logs across dev server restarts. Default wipes `.kilog/raw/*.jsonl` and `.kilog/index/`. |

## How it works

Both bundlers (Webpack and Turbopack) discover Next 15.3+'s `instrumentation.ts` and `instrumentation-client.ts` from the filesystem. By materializing those files for you on `next dev`, the plugin captures both runtimes without asking you to edit `app/layout.tsx`, `_document.tsx`, or write your own instrumentation hook.

Generated files carry a marker comment so re-running `next dev` is idempotent. If you already authored `instrumentation.ts` (or its client counterpart), the plugin warns and bails on that file — add the one-line import yourself:

```ts
// instrumentation.ts
import { registerServer } from "@kilog/nextjs-plugin/register-server";

export async function register() {
  await registerServer();
}
```

```ts
// instrumentation-client.ts
import "@kilog/nextjs-plugin/register-client";
```

The receiver runs in-process with `next dev` and is bound to `127.0.0.1` only.

## View logs

```bash
npx kilog logs              # print logs across every .kilog/ under cwd
npx kilog logs -f           # follow live
npx kilog logs --since 10m | rg TypeError
npx kilog ui                # browser UI
```

## Environment variables

| Var             | Default         | Description                                                                                                                   |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `KILOG_DIR`     | `process.cwd()` | Base directory that holds `.kilog/`.                                                                                          |
| `KILOG_PERSIST` | unset           | Set to `1` to keep previous logs across restarts. Default wipes `.kilog/raw/*.jsonl` + `.kilog/index/` on each process start. |
