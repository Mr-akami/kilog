import { describe, it, expect } from "vite-plus/test";
import kilogPlugin from "./index.js";
import { ENDPOINT } from "./constants.js";

interface HtmlTag {
  tag: string;
  children?: string;
  injectTo?: string;
}

interface PluginWithHooks {
  name: string;
  transformIndexHtml?: unknown;
  configureServer?: unknown;
}

describe("kilogPlugin()", () => {
  it("uses a stable identifier as the plugin name", () => {
    const plugin = kilogPlugin() as PluginWithHooks;
    expect(plugin.name).toBe("kilog");
  });

  it("accepts options and still returns a plugin", () => {
    const plugin = kilogPlugin({ terminal: "warn" }) as PluginWithHooks;
    expect(plugin.name).toBe("kilog");
  });

  it("exposes transformIndexHtml and configureServer hooks as functions", () => {
    const plugin = kilogPlugin() as PluginWithHooks;
    expect(typeof plugin.transformIndexHtml).toBe("function");
    expect(typeof plugin.configureServer).toBe("function");
  });

  it("injects exactly one script tag into <head> that contains the browser runtime", () => {
    const plugin = kilogPlugin() as PluginWithHooks;
    const hook = plugin.transformIndexHtml as (html: string, ctx: never) => HtmlTag[];
    const result = hook("<html></html>", {} as never);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    const [tag] = result;
    expect(tag.tag).toBe("script");
    expect(tag.injectTo).toBe("head");
    // The injected script must know where to POST events.
    expect(tag.children).toContain(ENDPOINT);
    // It must wrap the console and fetch so events are captured.
    expect(tag.children).toContain("wrapConsole");
    expect(tag.children).toContain("fetch");
  });
});
