import { describe, it, expect } from "vite-plus/test";
import { formatArg, formatArgs } from "./format-args.js";

describe("formatArg", () => {
  it("passes strings through", () => {
    expect(formatArg("hello")).toBe("hello");
  });

  it("stringifies primitives", () => {
    expect(formatArg(42)).toBe("42");
    expect(formatArg(true)).toBe("true");
    expect(formatArg(null)).toBe("null");
    expect(formatArg(undefined)).toBe("undefined");
  });

  it("JSON-stringifies plain objects (no more [object Object])", () => {
    expect(formatArg({ a: 1, b: "x" })).toBe('{"a":1,"b":"x"}');
  });

  it("JSON-stringifies arrays", () => {
    expect(formatArg([1, 2, "x"])).toBe('[1,2,"x"]');
  });

  it("uses stack/message for Errors", () => {
    const e = new Error("boom");
    const out = formatArg(e);
    expect(out.includes("boom")).toBe(true);
  });

  it("falls back to String() on circular refs", () => {
    const circ: Record<string, unknown> = {};
    circ.self = circ;
    const out = formatArg(circ);
    expect(typeof out).toBe("string");
  });
});

describe("formatArgs", () => {
  it("joins with spaces", () => {
    expect(formatArgs(["fetched:", { origin: "1.2.3.4" }])).toBe('fetched: {"origin":"1.2.3.4"}');
  });
});

describe("ANSI stripping", () => {
  it("strips CSI color codes from strings", () => {
    expect(formatArg("\x1b[36mhello\x1b[39m")).toBe("hello");
    expect(formatArg("\x1b[1;31mbold red\x1b[0m")).toBe("bold red");
  });

  it("strips OSC sequences (e.g. window-title set)", () => {
    expect(formatArg("\x1b]0;title\x07after")).toBe("after");
  });

  it("leaves non-ANSI strings untouched", () => {
    expect(formatArg("plain [39m without escape")).toBe("plain [39m without escape");
  });

  it("strips ANSI from Error stacks too", () => {
    const e = new Error("\x1b[31mboom\x1b[0m");
    expect(formatArg(e)).not.toContain("\x1b");
    expect(formatArg(e)).toContain("boom");
  });

  it("does not alter JSON-stringified objects containing ANSI-looking strings", () => {
    // Inside JSON.stringify we don't strip — the content becomes an escaped
    // literal, so no visible ANSI leaks anyway.
    const out = formatArg({ msg: "\x1b[36mcolored\x1b[39m" });
    expect(out).toBe('{"msg":"\\u001b[36mcolored\\u001b[39m"}');
  });
});
