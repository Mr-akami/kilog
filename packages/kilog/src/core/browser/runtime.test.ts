import { describe, it, expect } from "vite-plus/test";
import { generateBrowserRuntime } from "./runtime.js";

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

  it("should exclude __kilog URL from fetch capture", () => {
    const script = generateBrowserRuntime();
    expect(script).toContain("__kilog");
  });

  it("should send events via POST to /__kilog endpoint", () => {
    const script = generateBrowserRuntime();
    expect(script).toContain("/__kilog");
    expect(script).toContain("POST");
  });

  it("should log errors in sendEvents catch block via origError", () => {
    const script = generateBrowserRuntime();
    // sendEvents catch block must not be empty; it should log via origError
    expect(script).toMatch(/\.catch\(function\(.*?\)\s*\{[^}]*origError/);
  });

  it("should not have empty catch in sendEvents", () => {
    const script = generateBrowserRuntime();
    // fetch catch inside sendEvents must not be empty
    // disallow empty catches like `.catch(function() {})`
    const sendEventsMatch = script.match(
      /function sendEvents[\s\S]*?\.catch\(function\([^)]*\)\s*\{([^}]*)\}/,
    );
    expect(sendEventsMatch).not.toBeNull();
    const catchBody = sendEventsMatch![1].trim();
    expect(catchBody.length).toBeGreaterThan(0);
  });

  it("should not have any empty catch blocks", () => {
    const script = generateBrowserRuntime();
    // detect any empty catch like catch(e) {} or catch(e) { }
    const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/g;
    const matches = script.match(emptyCatchPattern);
    expect(matches).toBeNull();
  });

  it("should JSON-stringify non-string args instead of producing [object Object]", () => {
    const script = generateBrowserRuntime();
    // The generated script must use formatArgs (JSON-stringify), not the old
    // args.map(String).join(" ") which produced "[object Object]".
    expect(script).toContain("formatArgs");
    expect(script).toContain("JSON.stringify");
    expect(script).not.toMatch(/args\.map\(String\)/);
    // The formatArg helper must handle object-typed args with JSON.stringify
    // (we cannot easily invoke the IIFE, so we verify the source).
    expect(script).toMatch(/function formatArg\([\s\S]*?JSON\.stringify/);
  });

  it("captures a stack on every event type (console + fetch)", () => {
    const script = generateBrowserRuntime();
    // Common helper is defined and used in V8 via Error.captureStackTrace.
    expect(script).toContain("function captureStack");
    expect(script).toContain("Error.captureStackTrace");
    // Console wrapper must pass itself as the "below" function so wrapper
    // frames are hidden.
    expect(script).toMatch(/captureStack\(wrapped\)/);
    // Fetch wrapper must capture a stack at call time.
    expect(script).toMatch(/captureStack\(wrappedFetch\)/);
  });
});
