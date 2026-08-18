import { describe, it, expect } from "vite-plus/test";
import { ENDPOINT } from "./constants.js";
import { generateBrowserRuntime } from "./browser-runtime.js";

describe("ENDPOINT contract", () => {
  it("should be used in browser runtime script", () => {
    const script = generateBrowserRuntime();
    expect(script).toContain(ENDPOINT);
  });

  it("should start with /", () => {
    expect(ENDPOINT).toMatch(/^\//);
  });
});
