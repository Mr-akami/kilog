import { describe, it, expect } from "vite-plus/test";
import type { Plugin } from "vite";
import { kilogWranglerPlugin } from "./vite-plugin.js";

function callTransform(plugin: Plugin, code: string, id: string): { code: string } | null {
  const t = plugin.transform;
  const fn = typeof t === "function" ? t : (t as { handler?: unknown } | undefined)?.handler;
  if (typeof fn !== "function") return null;
  const ctx = {};
  const result = (fn as (this: unknown, code: string, id: string) => unknown).call(ctx, code, id);
  if (result == null) return null;
  if (typeof result === "string") return { code: result };
  if (typeof result === "object" && "code" in result) {
    return { code: String((result as { code: unknown }).code) };
  }
  return null;
}

function withServer(plugin: Plugin): Plugin {
  const c = plugin.configureServer;
  const fn = typeof c === "function" ? c : (c as { handler?: unknown } | undefined)?.handler;
  if (typeof fn === "function") {
    const stub = {
      middlewares: { use: () => {} },
      httpServer: null,
    };
    void (fn as (this: unknown, server: unknown) => unknown).call(plugin, stub);
  }
  return plugin;
}

describe("kilogWranglerPlugin transform", () => {
  it("injects instrument import into a module that looks like a worker entry", () => {
    const plugin = withServer(kilogWranglerPlugin());
    const code = `export default {\n  async fetch(req, env, ctx) { return new Response("ok"); }\n};\n`;
    const out = callTransform(plugin, code, "/proj/src/worker.ts");
    expect(out).not.toBeNull();
    expect(out!.code).toContain('import "@kilog/wrangler-plugin/instrument";');
    expect(out!.code).toContain("export default");
  });

  it("does not double-inject", () => {
    const plugin = withServer(kilogWranglerPlugin());
    const already = `import "@kilog/wrangler-plugin/instrument";\nexport default { fetch(){} };\n`;
    const out = callTransform(plugin, already, "/proj/src/worker.ts");
    expect(out).toBeNull();
  });

  it("skips node_modules", () => {
    const plugin = withServer(kilogWranglerPlugin());
    const code = `export default { fetch() {} };`;
    const out = callTransform(plugin, code, "/proj/node_modules/foo/dist/index.js");
    expect(out).toBeNull();
  });

  it("skips non-source files", () => {
    const plugin = withServer(kilogWranglerPlugin());
    const code = `export default { fetch() {} };`;
    const out = callTransform(plugin, code, "/proj/src/data.json");
    expect(out).toBeNull();
  });

  it("does nothing for modules that aren't worker entries", () => {
    const plugin = withServer(kilogWranglerPlugin());
    const code = `export const greet = (name) => "hi " + name;`;
    const out = callTransform(plugin, code, "/proj/src/lib.ts");
    expect(out).toBeNull();
  });

  it("honors explicit workerEntries", () => {
    const plugin = withServer(kilogWranglerPlugin({ workerEntries: ["src/my-entry.ts"] }));
    // A file that wouldn't pass the heuristic, but matches the explicit list.
    const code = `export const handler = () => {};`;
    const out = callTransform(plugin, code, "/proj/src/my-entry.ts");
    expect(out).not.toBeNull();
    expect(out!.code).toContain("@kilog/wrangler-plugin/instrument");
  });
});
