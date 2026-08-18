import { describe, it, expect } from "vite-plus/test";
import { buildFilterSQL } from "./ui.js";

describe("buildFilterSQL", () => {
  it("returns unfiltered query when no filter set", () => {
    const sql = buildFilterSQL({ project: "", runtime: "", type: "", level: "", search: "" });
    expect(sql).toContain("FROM logs");
    expect(sql).not.toContain("WHERE");
    expect(sql).toContain("ORDER BY timestamp DESC");
  });

  it("applies individual filters", () => {
    const sql = buildFilterSQL({
      project: "api",
      runtime: "node",
      type: "console",
      level: "error",
      search: "boom",
    });
    expect(sql).toContain("project = 'api'");
    expect(sql).toContain("runtime = 'node'");
    expect(sql).toContain("type = 'console'");
    expect(sql).toContain("level = 'error'");
    expect(sql).toContain("message ILIKE '%boom%'");
  });

  it("escapes single quotes in user input", () => {
    const sql = buildFilterSQL({
      project: "",
      runtime: "",
      type: "",
      level: "",
      search: "it's",
    });
    expect(sql).toContain("message ILIKE '%it''s%'");
  });

  it("applies sinceIso time window", () => {
    const sql = buildFilterSQL({
      project: "",
      runtime: "",
      type: "",
      level: "",
      search: "",
      sinceIso: "2026-04-20T10:00:00.000Z",
    });
    expect(sql).toContain("timestamp >= '2026-04-20T10:00:00.000Z'");
  });

  it("applies extraWhere preset clauses", () => {
    const sql = buildFilterSQL({
      project: "",
      runtime: "",
      type: "",
      level: "",
      search: "",
      extraWhere: "failed = true OR status >= 400",
    });
    expect(sql).toContain("(failed = true OR status >= 400)");
  });
});
