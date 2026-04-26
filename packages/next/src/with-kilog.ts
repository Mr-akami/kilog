type Rewrite = { source: string; destination: string };
type NextRewriteArray = Rewrite[];
type NextRewriteObject = {
  beforeFiles?: Rewrite[];
  afterFiles?: Rewrite[];
  fallback?: Rewrite[];
};
type NextRewrites = NextRewriteArray | NextRewriteObject;

interface NextConfigLike {
  rewrites?: (() => Promise<NextRewrites> | NextRewrites) | NextRewrites;
  [key: string]: unknown;
}

/**
 * The rewrite that routes `/__kilog` (the browser-side endpoint) to
 * `/api/__kilog` (the Next.js API route).
 *
 * This is only needed for the Pages Router.  App Router route handlers
 * placed at `app/api/__kilog/route.ts` are reached via the rewrite as well,
 * because Next.js resolves file-system routes before `afterFiles` rewrites
 * — both setups therefore work with a single `withKilog` call.
 */
const PAGES_REWRITE: Rewrite = {
  source: "/__kilog",
  destination: "/api/__kilog",
};

/**
 * Wraps your `next.config.ts` / `next.config.js` to add the `/__kilog →
 * /api/__kilog` rewrite required for the browser-capture script to reach the
 * kilog API route.
 *
 * ```ts
 * // next.config.ts
 * import { withKilog } from "@kilog/next";
 * import type { NextConfig } from "next";
 *
 * const nextConfig: NextConfig = { reactStrictMode: true };
 * export default withKilog(nextConfig);
 * ```
 */
export function withKilog<T extends NextConfigLike>(nextConfig: T = {} as T): T & { rewrites: () => Promise<NextRewrites> } {
  const existingRewrites = nextConfig.rewrites;

  return {
    ...nextConfig,
    async rewrites(): Promise<NextRewrites> {
      let existing: NextRewrites = [];
      if (typeof existingRewrites === "function") {
        existing = await existingRewrites();
      } else if (existingRewrites) {
        existing = existingRewrites;
      }

      if (!Array.isArray(existing)) {
        return {
          ...existing,
          afterFiles: [...(existing.afterFiles ?? []), PAGES_REWRITE],
        };
      }
      return [...existing, PAGES_REWRITE];
    },
  };
}
