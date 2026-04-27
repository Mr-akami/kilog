import { clearOnce } from "@kilog/core";
import type { LogLevel } from "@kilog/core";
import { ENDPOINT } from "@kilog/core/browser";
import { ensureInstrumentation } from "./ensure-instrumentation.js";
import { ensureGitignore } from "./gitignore.js";
import { startDevReceiver } from "./dev-receiver.js";

type Rewrite = { source: string; destination: string };
type RewriteArray = Rewrite[];
type RewriteObject = {
  beforeFiles?: Rewrite[];
  afterFiles?: Rewrite[];
  fallback?: Rewrite[];
};
type Rewrites = RewriteArray | RewriteObject;
type RewritesProvider = (() => Promise<Rewrites> | Rewrites) | Rewrites;

type WebpackExternalEntry =
  | string
  | RegExp
  | Record<string, string>
  | ((...args: unknown[]) => unknown);
interface WebpackConfigLike {
  externals?: WebpackExternalEntry | WebpackExternalEntry[];
  [key: string]: unknown;
}
type WebpackHook = (
  config: WebpackConfigLike,
  ctx: { isServer: boolean; [key: string]: unknown },
) => WebpackConfigLike;

interface NextConfigLike {
  rewrites?: RewritesProvider;
  serverExternalPackages?: string[];
  webpack?: WebpackHook;
  [key: string]: unknown;
}

// Kilog's server runtime depends on @duckdb/node-api, which ships native
// bindings (.node files). Webpack/Turbopack can't bundle those, so we mark
// kilog's server-side packages as external — Next requires them at runtime
// from node_modules instead of trying to bundle them.
//
// `serverExternalPackages` covers the App Router server bundle. The
// instrumentation hook is bundled separately and (in Next 15.5) doesn't
// honor that field, so we also push externals into the webpack config.
const EXTERNAL_PACKAGES = [
  "@kilog/core",
  "@kilog/register",
  "@kilog/runtime-node",
  "@kilog/nextjs-plugin",
  "@duckdb/node-api",
  "@duckdb/node-bindings",
];

const EXTERNAL_PATTERNS: RegExp[] = [
  /^@kilog\/(core|register|runtime-node|nextjs-plugin)(\/.*)?$/,
  /^@duckdb\/.*/,
];

function composeWebpack(userHook: WebpackHook | undefined): WebpackHook {
  return (config, ctx) => {
    const next = userHook ? userHook(config, ctx) : config;
    if (!ctx.isServer) return next;

    const existing = next.externals;
    const externalsArray: WebpackExternalEntry[] = Array.isArray(existing)
      ? [...existing]
      : existing != null
        ? [existing]
        : [];
    next.externals = [...externalsArray, ...EXTERNAL_PATTERNS];
    return next;
  };
}

export interface KilogPluginOptions {
  /**
   * Also print captured events to stdout. `true` prints every event;
   * a level threshold (`debug` < `info` < `warn` < `error`) filters events
   * that have a level. Default: no terminal output.
   */
  terminal?: boolean | LogLevel;
  /**
   * Keep previously captured logs across dev server restarts. Default
   * (`false`) wipes `.kilog/raw/*.jsonl` and `.kilog/index/` on dev start.
   */
  persist?: boolean;
}

const PORT_ENV = "__KILOG_NEXTJS_PORT__";

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

async function resolveExisting(rewrites: RewritesProvider | undefined): Promise<Rewrites> {
  if (rewrites == null) return [];
  return typeof rewrites === "function" ? await rewrites() : rewrites;
}

function appendRewrite(existing: Rewrites, rewrite: Rewrite): Rewrites {
  if (Array.isArray(existing)) return [...existing, rewrite];
  return {
    ...existing,
    afterFiles: [...(existing.afterFiles ?? []), rewrite],
  };
}

async function ensurePort(options: KilogPluginOptions, projectRoot: string): Promise<number> {
  const cached = process.env[PORT_ENV];
  if (cached != null) return Number(cached);

  if (!options.persist) await clearOnce(projectRoot);

  const { conflicts } = ensureInstrumentation(projectRoot);
  for (const msg of conflicts) console.warn(msg);
  ensureGitignore(projectRoot);

  const port = await startDevReceiver({ baseDir: projectRoot, terminal: options.terminal });
  process.env[PORT_ENV] = String(port);
  return port;
}

/**
 * Wraps a Next.js config so kilog captures `console`, `fetch`, and uncaught
 * errors from both the browser and the Node server runtime, with no other
 * code changes required.
 *
 * On `next dev` only:
 *   - generates `instrumentation.ts` and `instrumentation-client.ts` at the
 *     project root (gitignored) — warns and bails per file if the user
 *     already authored one
 *   - starts a localhost HTTP receiver on a random port
 *   - adds a `/__kilog` rewrite so the browser script reaches the receiver
 *
 * On `next build` / `next start`: returns the user's config untouched.
 */
export function withKilog<T extends NextConfigLike>(
  nextConfig: T = {} as T,
  options: KilogPluginOptions = {},
): T & {
  rewrites?: RewritesProvider;
  serverExternalPackages?: string[];
  webpack?: WebpackHook;
} {
  // serverExternalPackages must be set in every mode (build, dev, start) so
  // Next never tries to bundle the native @duckdb/node-api binding. Without
  // this `next build` fails on the auto-generated instrumentation.ts even
  // though that file is dev-gated at runtime.
  const merged = new Set([...(nextConfig.serverExternalPackages ?? []), ...EXTERNAL_PACKAGES]);
  const baseConfig = {
    ...nextConfig,
    serverExternalPackages: [...merged],
    webpack: composeWebpack(nextConfig.webpack),
  };

  if (!isDev()) return baseConfig;

  const projectRoot = process.cwd();
  const userRewrites = nextConfig.rewrites;

  return {
    ...baseConfig,
    async rewrites(): Promise<Rewrites> {
      const port = await ensurePort(options, projectRoot);
      const existing = await resolveExisting(userRewrites);
      return appendRewrite(existing, {
        source: ENDPOINT,
        destination: `http://127.0.0.1:${port}${ENDPOINT}`,
      });
    },
  };
}
