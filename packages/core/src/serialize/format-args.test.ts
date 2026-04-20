import { describe, it, expect } from "vitest";
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
    expect(formatArgs(["fetched:", { origin: "1.2.3.4" }])).toBe(
      'fetched: {"origin":"1.2.3.4"}',
    );
  });
});
