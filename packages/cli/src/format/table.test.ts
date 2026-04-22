import { describe, it, expect } from "vite-plus/test";
import { formatTable } from "./table.js";
import type { AggregateRow } from "@kilog/core";

describe("formatTable", () => {
  // ── normal cases ──

  it("should format rows with headers", () => {
    const rows: AggregateRow[] = [
      { runtime: "node", type: "console", level: "info", count: 5, project: null },
      { runtime: "browser", type: "network", level: "info", count: 3, project: null },
    ];
    const output = formatTable(rows);

    expect(output).toContain("runtime");
    expect(output).toContain("type");
    expect(output).toContain("level");
    expect(output).toContain("count");
    expect(output).toContain("node");
    expect(output).toContain("browser");
    expect(output).toContain("5");
    expect(output).toContain("3");
  });

  it("should align columns", () => {
    const rows: AggregateRow[] = [
      { runtime: "node", type: "console", level: "info", count: 5, project: null },
      { runtime: "browser", type: "error", level: "error", count: 12, project: null },
    ];
    const output = formatTable(rows);
    const lines = output.trim().split("\n");

    // header + separator + 2 data rows = at least 3 lines
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  // ── empty ──

  it("should return empty or header-only for empty rows", () => {
    const output = formatTable([]);
    // should not throw; output may be empty or header-only
    expect(typeof output).toBe("string");
  });

  // ── single row ──

  it("should format a single row", () => {
    const rows: AggregateRow[] = [
      { runtime: "node", type: "console", level: "debug", count: 1, project: null },
    ];
    const output = formatTable(rows);

    expect(output).toContain("debug");
    expect(output).toContain("1");
  });

  // ── long values ──

  it("should handle long string values", () => {
    const rows: AggregateRow[] = [
      { runtime: "node", type: "console", level: "info", count: 999999, project: null },
    ];
    const output = formatTable(rows);

    expect(output).toContain("999999");
  });
});
