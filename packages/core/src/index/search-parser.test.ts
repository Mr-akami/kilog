import { describe, it, expect } from "vite-plus/test";
import { parseSearch, escapeIlikePattern, SearchParseError } from "./search-parser.js";

describe("parseSearch", () => {
  it("should parse single term", () => {
    expect(parseSearch("foo")).toEqual([[{ text: "foo", negate: false }]]);
  });

  it("should parse phrase with spaces as single term", () => {
    expect(parseSearch("connection refused")).toEqual([
      [{ text: "connection refused", negate: false }],
    ]);
  });

  it("should parse AND", () => {
    expect(parseSearch("a AND b")).toEqual([
      [
        { text: "a", negate: false },
        { text: "b", negate: false },
      ],
    ]);
  });

  it("should parse OR", () => {
    expect(parseSearch("a OR b")).toEqual([
      [{ text: "a", negate: false }],
      [{ text: "b", negate: false }],
    ]);
  });

  it("should parse AND with higher precedence than OR", () => {
    expect(parseSearch("a AND b OR c")).toEqual([
      [
        { text: "a", negate: false },
        { text: "b", negate: false },
      ],
      [{ text: "c", negate: false }],
    ]);
  });

  it("should parse NOT at start", () => {
    expect(parseSearch("NOT foo")).toEqual([[{ text: "foo", negate: true }]]);
  });

  it("should parse NOT after AND", () => {
    expect(parseSearch("a AND NOT b")).toEqual([
      [
        { text: "a", negate: false },
        { text: "b", negate: true },
      ],
    ]);
  });

  it("should parse NOT after OR", () => {
    expect(parseSearch("a OR NOT b")).toEqual([
      [{ text: "a", negate: false }],
      [{ text: "b", negate: true }],
    ]);
  });

  it("should treat phrases with spaces as one term under AND/OR", () => {
    expect(parseSearch("connection refused AND timeout")).toEqual([
      [
        { text: "connection refused", negate: false },
        { text: "timeout", negate: false },
      ],
    ]);
  });

  it("should escape \\AND as literal AND", () => {
    expect(parseSearch("foo \\AND bar")).toEqual([[{ text: "foo AND bar", negate: false }]]);
  });

  it("should escape \\OR as literal OR", () => {
    expect(parseSearch("foo \\OR bar")).toEqual([[{ text: "foo OR bar", negate: false }]]);
  });

  it("should escape \\NOT at term start as literal NOT", () => {
    expect(parseSearch("\\NOT foo")).toEqual([[{ text: "NOT foo", negate: false }]]);
  });

  it("should escape \\\\ as literal backslash", () => {
    expect(parseSearch("C:\\\\Users")).toEqual([[{ text: "C:\\Users", negate: false }]]);
  });

  it("should treat unknown backslash as literal", () => {
    expect(parseSearch("foo\\bar")).toEqual([[{ text: "foo\\bar", negate: false }]]);
  });

  it("should combine escapes with operators", () => {
    expect(parseSearch("foo \\AND bar AND baz")).toEqual([
      [
        { text: "foo AND bar", negate: false },
        { text: "baz", negate: false },
      ],
    ]);
  });

  it("should handle NOT with escape", () => {
    expect(parseSearch("NOT \\AND")).toEqual([[{ text: "AND", negate: true }]]);
  });

  it("should return empty array for empty string", () => {
    expect(parseSearch("")).toEqual([]);
  });

  it("should return empty array for whitespace only", () => {
    expect(parseSearch("   ")).toEqual([]);
  });

  it("should throw on leading operator", () => {
    expect(() => parseSearch("AND foo")).toThrow(SearchParseError);
  });

  it("should throw on trailing operator", () => {
    expect(() => parseSearch("foo AND")).toThrow(SearchParseError);
  });

  it("should throw on double AND", () => {
    expect(() => parseSearch("a AND AND b")).toThrow(SearchParseError);
  });

  it("should throw on NOT with no term", () => {
    expect(() => parseSearch("a AND NOT")).toThrow(SearchParseError);
  });

  it("should preserve case in term text", () => {
    expect(parseSearch("Foo OR Bar")).toEqual([
      [{ text: "Foo", negate: false }],
      [{ text: "Bar", negate: false }],
    ]);
  });

  it("should not treat lowercase and/or/not as operators", () => {
    expect(parseSearch("foo and bar")).toEqual([[{ text: "foo and bar", negate: false }]]);
    expect(parseSearch("foo or bar")).toEqual([[{ text: "foo or bar", negate: false }]]);
    expect(parseSearch("not foo")).toEqual([[{ text: "not foo", negate: false }]]);
  });
});

describe("escapeIlikePattern", () => {
  it("should escape percent", () => {
    expect(escapeIlikePattern("50%")).toBe("50\\%");
  });

  it("should escape underscore", () => {
    expect(escapeIlikePattern("foo_bar")).toBe("foo\\_bar");
  });

  it("should escape backslash", () => {
    expect(escapeIlikePattern("C:\\Users")).toBe("C:\\\\Users");
  });

  it("should leave regular text unchanged", () => {
    expect(escapeIlikePattern("hello world")).toBe("hello world");
  });

  it("should escape multiple special chars", () => {
    expect(escapeIlikePattern("a%b_c\\d")).toBe("a\\%b\\_c\\\\d");
  });
});
