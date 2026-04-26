# @kilog/next

Next.js plugin for [kilog](https://github.com/Mr-akami/kilog) — captures `console`, `fetch`, and uncaught errors from your Next.js app into `.kilog/` so the CLI and AI agents can query them.

## Install

```bash
npm i -D @kilog/next
# or
pnpm add -D @kilog/next
```

## Quick start

### 1. Wrap your Next.js config

```ts
// next.config.ts
import { withKilog } from "@kilog/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withKilog(nextConfig);
```

`withKilog` adds a rewrite so the browser-side script can POST events to
`/api/__kilog` via the `/__kilog` endpoint.

### 2. Add the API route

**App Router** — create `app/api/__kilog/route.ts`:

```ts
import { createKilogAppRoute } from "@kilog/next";

export const POST = createKilogAppRoute();
```

**Pages Router** — create `pages/api/__kilog.ts`:

```ts
import { createKilogPagesHandler } from "@kilog/next";

export default createKilogPagesHandler();
```

Options are the same for both:

```ts
createKilogAppRoute({ terminal: true });   // mirror events to stdout
createKilogAppRoute({ terminal: "warn" }); // only warn/error to stdout
```

| Option     | Type                                                | Default         | Description                                                               |
| ---------- | --------------------------------------------------- | --------------- | ------------------------------------------------------------------------- |
| `terminal` | `boolean \| "debug" \| "info" \| "warn" \| "error"` | `false`         | Also print captured events to stdout.                                     |
| `baseDir`  | `string`                                            | `process.cwd()` | Base directory that holds `.kilog/`. Overrides `KILOG_DIR` env var.      |

### 3. Inject the browser script

**App Router** — add `<KilogScript />` to your root `app/layout.tsx`:

```tsx
import { KilogScript } from "@kilog/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <KilogScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Pages Router** — add it to `pages/_document.tsx`:

```tsx
import Document, { Html, Head, Main, NextScript } from "next/document";
import { KilogScript } from "@kilog/next";

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <KilogScript />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
```

### 4. Enable server-side capture (optional)

Create `instrumentation.ts` at the root of your project to also capture
server-side `console` calls and errors:

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@kilog/register");
  }
}
```

Remember to enable the instrumentation hook in your Next.js config if you are
on Next.js < 15:

```ts
// next.config.ts
export default withKilog({ experimental: { instrumentationHook: true } });
```

## View logs

```bash
npx kilog logs              # print logs across every .kilog/ under cwd
npx kilog logs -f           # follow live
npx kilog logs --since 10m | rg TypeError
npx kilog sql "SELECT level, COUNT(*) FROM logs GROUP BY level"
npx kilog ui                # browser UI
```

## Environment variables

| Var             | Default         | Description                                                                                                                     |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `KILOG_DIR`     | `process.cwd()` | Base directory that holds `.kilog/`.                                                                                            |
| `KILOG_PERSIST` | unset           | Set to `1` to keep previous logs across restarts. Default wipes `.kilog/raw/*.jsonl` + `.kilog/index/` on each process start.  |
