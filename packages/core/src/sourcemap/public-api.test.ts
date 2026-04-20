import { describe, it, expect } from "vite-plus/test";
import * as sourcemapExports from "./index.js";

describe("sourcemap package boundary", () => {
  it("exposes resolveStackFrames", () => {
    expect(sourcemapExports).toHaveProperty("resolveStackFrames");
    expect(typeof sourcemapExports.resolveStackFrames).toBe("function");
  });

  it("does not leak internal helpers (cache, resolver module internals)", () => {
    const leaky = Object.keys(sourcemapExports).filter(
      (k) => k !== "resolveStackFrames",
    );
    expect(leaky).toEqual([]);
  });
});
