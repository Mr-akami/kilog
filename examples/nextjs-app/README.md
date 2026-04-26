# nextjs-app

Minimal Next.js (App Router) demo wired to kilog via `withKilog` only.

```bash
pnpm install
pnpm dev          # next dev — instrumentation files materialize, receiver starts
pnpm kilog logs   # in another shell
```

The user's only kilog-related code is the `next.config.ts` wrap.
