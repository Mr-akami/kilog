import { describe, it, expect } from "vite-plus/test";
import logitPlugin from "./index.js";

describe("logitPlugin", () => {
  it("should return plugin with name", () => {
    const plugin = logitPlugin();
    expect(plugin.name).toBeTruthy();
    expect(typeof plugin.name).toBe("string");
  });

  it("should have transformIndexHtml hook", () => {
    const plugin = logitPlugin();
    expect(plugin.transformIndexHtml).toBeDefined();
  });

  it("should have configureServer hook", () => {
    const plugin = logitPlugin();
    expect(plugin.configureServer).toBeDefined();
  });

  it("should return script tags from transformIndexHtml", () => {
    const plugin = logitPlugin();
    const hook = plugin.transformIndexHtml;

    if (typeof hook === "function") {
      const result = (hook as (html: string, ctx: never) => unknown)("<html></html>", {} as never);
      expect(result).toBeDefined();

      if (Array.isArray(result)) {
        expect(result).toEqual(
          expect.arrayContaining([expect.objectContaining({ tag: "script" })]),
        );
      }
    }
  });
});
