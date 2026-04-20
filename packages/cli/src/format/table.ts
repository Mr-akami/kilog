import type { AggregateRow } from "@logit/core";

const HEADERS: (keyof AggregateRow)[] = ["runtime", "type", "level", "count"];

export function formatTable(rows: AggregateRow[]): string {
  if (rows.length === 0) return "";

  const widths = HEADERS.map((h) =>
    Math.max(h.length, ...rows.map((r) => String(r[h]).length)),
  );

  const header = HEADERS.map((h, i) => h.padEnd(widths[i])).join("  ");
  const separator = widths.map((w) => "-".repeat(w)).join("  ");
  const body = rows.map((row) =>
    HEADERS.map((h, i) => String(row[h]).padEnd(widths[i])).join("  "),
  );

  return [header, separator, ...body].join("\n");
}
