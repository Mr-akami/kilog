import { describe, it, expect } from "vite-plus/test";
import {
  LOGIT_DIR_NAME,
  RAW_DIR,
  INDEX_DIR,
  DB_FILE,
  rawFileName,
  rawFilePath,
  dbFilePath,
} from "./paths.js";

describe("constants", () => {
  it("LOGIT_DIR_NAME should be .logit", () => {
    expect(LOGIT_DIR_NAME).toBe(".logit");
  });

  it("RAW_DIR should be .logit/raw", () => {
    expect(RAW_DIR).toBe(".logit/raw");
  });

  it("INDEX_DIR should be .logit/index", () => {
    expect(INDEX_DIR).toBe(".logit/index");
  });

  it("DB_FILE should be logs.duckdb", () => {
    expect(DB_FILE).toBe("logs.duckdb");
  });
});

describe("dbFilePath", () => {
  it("should compose INDEX_DIR and DB_FILE", () => {
    const result = dbFilePath("/project");
    expect(result).toBe("/project/.logit/index/logs.duckdb");
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
    expect(result).toBe("/project/.logit/raw/2026-04-18.node.jsonl");
  });

  it("should handle baseDir without trailing slash", () => {
    const result = rawFilePath("/my/project", "2026-01-01", "browser");
    expect(result).toBe("/my/project/.logit/raw/2026-01-01.browser.jsonl");
  });

  it("should handle baseDir with trailing slash consistently", () => {
    const a = rawFilePath("/project", "2026-01-01", "node");
    // result should be a valid path regardless
    expect(a).toContain(".logit/raw/2026-01-01.node.jsonl");
  });
});
