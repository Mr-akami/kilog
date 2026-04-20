import type * as duckdb from "@duckdb/duckdb-wasm";
import { runQuery } from "./duckdb.js";

export interface Filter {
  project: string;
  runtime: string;
  type: string;
  level: string;
  search: string;
  sinceIso?: string;
  extraWhere?: string;
}

function escapeSqlLiteral(v: string): string {
  return v.replace(/'/g, "''");
}

export function buildFilterSQL(filter: Filter): string {
  const conditions: string[] = [];
  if (filter.project) conditions.push(`project = '${escapeSqlLiteral(filter.project)}'`);
  if (filter.runtime) conditions.push(`runtime = '${escapeSqlLiteral(filter.runtime)}'`);
  if (filter.type) conditions.push(`type = '${escapeSqlLiteral(filter.type)}'`);
  if (filter.level) conditions.push(`level = '${escapeSqlLiteral(filter.level)}'`);
  if (filter.search) conditions.push(`message ILIKE '%${escapeSqlLiteral(filter.search)}%'`);
  if (filter.sinceIso) conditions.push(`timestamp >= '${escapeSqlLiteral(filter.sinceIso)}'`);
  if (filter.extraWhere) conditions.push(`(${filter.extraWhere})`);
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  // For network events, synthesize a readable summary since `message` is null.
  const displayMessage = `CASE
    WHEN type = 'network' THEN
      COALESCE(method, '') || ' ' || COALESCE(url, '') ||
      CASE WHEN status IS NULL THEN '' ELSE ' -> ' || CAST(status AS VARCHAR) END ||
      CASE WHEN duration IS NULL THEN '' ELSE ' (' || CAST(ROUND(duration) AS VARCHAR) || 'ms)' END ||
      CASE WHEN failed = true THEN ' [failed' || CASE WHEN error_message IS NULL THEN ']' ELSE ': ' || error_message || ']' END ELSE '' END
    ELSE COALESCE(message, '')
  END AS message`;
  return `SELECT timestamp, project, runtime, type, level, ${displayMessage} FROM logs${where} ORDER BY timestamp DESC LIMIT 500`;
}

// Module state for preset-driven constraints that aren't represented in DOM.
let currentSinceIso: string | undefined;
let currentExtraWhere: string | undefined;

export function setTimeWindow(minutes: number | null): void {
  currentSinceIso = minutes == null ? undefined : new Date(Date.now() - minutes * 60_000).toISOString();
}

export function setExtraWhere(where: string | null): void {
  currentExtraWhere = where ?? undefined;
}

export function clearPresetState(): void {
  currentSinceIso = undefined;
  currentExtraWhere = undefined;
}

function readFilter(): Filter {
  return {
    project: (document.getElementById("filter-project") as HTMLSelectElement).value,
    runtime: (document.getElementById("filter-runtime") as HTMLSelectElement).value,
    type: (document.getElementById("filter-type") as HTMLSelectElement).value,
    level: (document.getElementById("filter-level") as HTMLSelectElement).value,
    search: (document.getElementById("filter-search") as HTMLInputElement).value,
    sinceIso: currentSinceIso,
    extraWhere: currentExtraWhere,
  };
}


function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const n = document.getElementById(id);
  if (!n) throw new Error(`missing #${id}`);
  return n as T;
}

export function renderRows(rows: Record<string, unknown>[]): void {
  const tbody = el("log-tbody");
  tbody.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    const level = String(row.level ?? "");
    const cols = ["timestamp", "project", "runtime", "type", "level", "message"];
    for (const c of cols) {
      const td = document.createElement("td");
      const v = row[c];
      td.textContent = v == null ? "" : String(v);
      if (c === "level" && level) td.className = `level-${level}`;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

export function renderGenericResult(rows: Record<string, unknown>[]): void {
  const tbody = el("log-tbody");
  const thead = document.querySelector("#log-table thead tr") as HTMLElement;
  if (!thead) return;
  tbody.innerHTML = "";
  if (rows.length === 0) {
    thead.innerHTML = "<th>(no rows)</th>";
    return;
  }
  const cols = Object.keys(rows[0]);
  thead.innerHTML = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const c of cols) {
      const td = document.createElement("td");
      td.textContent = row[c] == null ? "" : String(row[c]);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

export function restoreDefaultHeader(): void {
  const thead = document.querySelector("#log-table thead tr") as HTMLElement;
  if (!thead) return;
  thead.innerHTML = `
    <th style="width: 180px">Timestamp</th>
    <th style="width: 140px">Project</th>
    <th style="width: 80px">Runtime</th>
    <th style="width: 80px">Type</th>
    <th style="width: 60px">Level</th>
    <th>Message</th>
  `;
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function refreshFilterQuery(db: duckdb.AsyncDuckDB): Promise<void> {
  const filter = readFilter();
  const sql = buildFilterSQL(filter);
  try {
    const rows = await runQuery(db, sql);
    restoreDefaultHeader();
    renderRows(rows);
    setStatus(`${rows.length} rows`);
  } catch (err) {
    setStatus(`query error: ${String(err)}`);
  }
}

export async function refreshProjectList(db: duckdb.AsyncDuckDB): Promise<void> {
  try {
    const rows = await runQuery(
      db,
      "SELECT DISTINCT project FROM logs WHERE project IS NOT NULL ORDER BY project",
    );
    const select = el<HTMLSelectElement>("filter-project");
    const current = select.value;
    const projects = rows.map((r) => String(r.project));
    const options = ['<option value="">All projects</option>']
      .concat(projects.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`))
      .join("");
    select.innerHTML = options;
    if (projects.includes(current)) select.value = current;
  } catch {
    // ignore
  }
}

export function setStatus(msg: string): void {
  el("status").textContent = msg;
}

export function setHeaderStatus(msg: string): void {
  el("header-status").textContent = msg;
}

export function setSqlStatus(msg: string, isError = false): void {
  const n = el("sql-status");
  n.textContent = msg;
  n.className = isError ? "error" : "";
}
