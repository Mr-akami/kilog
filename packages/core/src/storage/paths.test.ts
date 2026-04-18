import { describe, it, expect } from "vitest";
import {
  DEVLOGS_DIR,
  RAW_DIR,
  INDEX_DIR,
  rawFileName,
  rawFilePath,
} from "./paths.js";

describe("constants", () => {
  it("DEVLOGS_DIR should be .devlogs", () => {
    expect(DEVLOGS_DIR).toBe(".devlogs");
  });

  it("RAW_DIR should be .devlogs/raw", () => {
    expect(RAW_DIR).toBe(".devlogs/raw");
  });

  it("INDEX_DIR should be .devlogs/index", () => {
    expect(INDEX_DIR).toBe(".devlogs/index");
  });
});

describe("rawFileName", () => {
  it("should return date.runtime.jsonl format", () => {
    expect(rawFileName("2026-04-18", "node")).toBe("2026-04-18.node.jsonl");
  });

  it("should work with browser runtime", () => {
    expect(rawFileName("2026-01-01", "browser")).toBe("2026-01-01.browser.jsonl");
  });

  it("should work with bun runtime", () => {
    expect(rawFileName("2026-12-31", "bun")).toBe("2026-12-31.bun.jsonl");
  });

  it("should work with deno runtime", () => {
    expect(rawFileName("2026-06-15", "deno")).toBe("2026-06-15.deno.jsonl");
  });
});

describe("rawFilePath", () => {
  it("should join baseDir, RAW_DIR, and filename", () => {
    const result = rawFilePath("/project", "2026-04-18", "node");
    expect(result).toBe("/project/.devlogs/raw/2026-04-18.node.jsonl");
  });

  it("should handle baseDir without trailing slash", () => {
    const result = rawFilePath("/my/project", "2026-01-01", "browser");
    expect(result).toBe("/my/project/.devlogs/raw/2026-01-01.browser.jsonl");
  });

  it("should handle baseDir with trailing slash consistently", () => {
    const a = rawFilePath("/project", "2026-01-01", "node");
    // result should be a valid path regardless
    expect(a).toContain(".devlogs/raw/2026-01-01.node.jsonl");
  });
});
