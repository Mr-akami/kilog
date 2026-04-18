import { describe, it, expect } from "vitest";
import { generateBrowserRuntime } from "./browser-runtime.js";

describe("generateBrowserRuntime", () => {
  it("should return non-empty string", () => {
    const script = generateBrowserRuntime();
    expect(script.length).toBeGreaterThan(0);
  });

  it("should contain capture for all console methods", () => {
    const script = generateBrowserRuntime();
    for (const method of ["log", "info", "warn", "error", "debug"]) {
      expect(script).toContain(`console.${method}`);
    }
  });

  it("should contain fetch capture", () => {
    const script = generateBrowserRuntime();
    expect(script).toContain("fetch");
  });

  it("should contain window.onerror capture", () => {
    const script = generateBrowserRuntime();
    expect(script).toContain("onerror");
  });

  it("should contain window.onunhandledrejection capture", () => {
    const script = generateBrowserRuntime();
    expect(script).toContain("onunhandledrejection");
  });

  it("should use sessionStorage for session management", () => {
    const script = generateBrowserRuntime();
    expect(script).toContain("sessionStorage");
  });

  it("should set runtime to browser", () => {
    const script = generateBrowserRuntime();
    expect(script).toContain('"browser"');
  });

  it("should exclude __logit URL from fetch capture", () => {
    const script = generateBrowserRuntime();
    expect(script).toContain("__logit");
  });

  it("should send events via POST to /__logit endpoint", () => {
    const script = generateBrowserRuntime();
    expect(script).toContain("/__logit");
    expect(script).toContain("POST");
  });
});
