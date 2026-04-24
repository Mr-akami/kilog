function cell(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value.toString();
  return JSON.stringify(value);
}

export function formatGenericTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const widths = headers.map((header) =>
    Math.max(header.length, ...rows.map((row) => cell(row[header]).length)),
  );

  const head = headers.map((header, i) => header.padEnd(widths[i])).join("  ");
  const sep = widths.map((width) => "-".repeat(width)).join("  ");
  const body = rows.map((row) =>
    headers.map((header, i) => cell(row[header]).padEnd(widths[i])).join("  "),
  );

  return [head, sep, ...body].join("\n");
}
