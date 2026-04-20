import { getDB, runQuery } from "./duckdb.js";
import { Ingester, type SourceDescriptor } from "./ingest.js";
import {
  clearPresetState,
  refreshFilterQuery,
  refreshProjectList,
  renderGenericResult,
  restoreDefaultHeader,
  setExtraWhere,
  setHeaderStatus,
  setSqlStatus,
  setStatus,
  setTimeWindow,
} from "./ui.js";

const POLL_MS = 2_000;
const HEARTBEAT_MS = 5_000;

interface SsrData {
  root: string;
  sources: SourceDescriptor[];
}

async function main(): Promise<void> {
  setStatus("initializing DuckDB-wasm...");

  const ssr: SsrData = (window as unknown as { __LOGIT_SSR__?: SsrData }).__LOGIT_SSR__ ?? {
    root: "",
    sources: [],
  };

  const db = await getDB();
  setStatus("DuckDB ready");

  const rootInput = document.getElementById("root") as HTMLInputElement;
  if (!rootInput.value) rootInput.value = ssr.root;

  const ingester = new Ingester(ssr.root || rootInput.value);

  const boot = async () => {
    setHeaderStatus("loading sources...");
    try {
      const inserted = await ingester.catchUpAll(db);
      await refreshProjectList(db);
      await refreshFilterQuery(db);
      setHeaderStatus(`loaded ${inserted} new row(s)`);
    } catch (err) {
      setHeaderStatus(`error: ${String(err)}`);
    }
  };

  await boot();

  // 2s polling: catch up + refresh filter query
  const pollTimer = setInterval(async () => {
    try {
      const inserted = await ingester.catchUpAll(db);
      if (inserted > 0) {
        await refreshProjectList(db);
        await refreshFilterQuery(db);
        setHeaderStatus(`+${inserted} new row(s) @ ${new Date().toLocaleTimeString()}`);
      }
    } catch (err) {
      setHeaderStatus(`poll error: ${String(err)}`);
    }
  }, POLL_MS);

  // heartbeat to prevent server auto-shutdown. If it fails repeatedly we assume
  // the server has exited (idle timeout) and surface it instead of silently
  // spamming console errors forever.
  let heartbeatFailures = 0;
  const heartbeatTimer = setInterval(async () => {
    try {
      const res = await fetch("/api/heartbeat");
      if (!res.ok) throw new Error(String(res.status));
      heartbeatFailures = 0;
    } catch {
      heartbeatFailures++;
      if (heartbeatFailures >= 3) {
        clearInterval(heartbeatTimer);
        clearInterval(pollTimer);
        setHeaderStatus("server stopped — restart `logit ui` and reload");
      }
    }
  }, HEARTBEAT_MS);

  // filter controls
  document.getElementById("btn-search")?.addEventListener("click", () => {
    void refreshFilterQuery(db);
  });
  document.getElementById("filter-search")?.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") void refreshFilterQuery(db);
  });
  for (const id of ["filter-project", "filter-runtime", "filter-type", "filter-level"]) {
    document.getElementById(id)?.addEventListener("change", () => void refreshFilterQuery(db));
  }

  // raw SQL
  document.getElementById("sql-run")?.addEventListener("click", async () => {
    const sql = (document.getElementById("sql-input") as HTMLTextAreaElement).value.trim();
    if (!sql) return;
    setSqlStatus("running...");
    try {
      const rows = await runQuery(db, sql);
      renderGenericResult(rows);
      setSqlStatus(`${rows.length} rows`);
    } catch (err) {
      restoreDefaultHeader();
      setSqlStatus(`error: ${String(err)}`, true);
    }
  });

  // root editing
  document.getElementById("root-apply")?.addEventListener("click", async () => {
    const newRoot = rootInput.value.trim();
    if (!newRoot || newRoot === ingester.getRoot()) return;
    ingester.setRoot(newRoot);
    await truncateLogs(db);
    await boot();
  });
  rootInput.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter")
      (document.getElementById("root-apply") as HTMLButtonElement).click();
  });

  // Preset buttons
  const presetRow = document.querySelector(".presets");
  const setSelect = (id: string, value: string) => {
    const s = document.getElementById(id) as HTMLSelectElement | null;
    if (s) s.value = value;
  };
  const setSearch = (value: string) => {
    const s = document.getElementById("filter-search") as HTMLInputElement | null;
    if (s) s.value = value;
  };
  const markActive = (btn: HTMLElement | null) => {
    presetRow?.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn?.classList.add("active");
  };

  presetRow?.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const preset = target.getAttribute?.("data-preset");
    if (!preset) return;

    switch (preset) {
      case "5min":
        setTimeWindow(5);
        markActive(target);
        break;
      case "1h":
        setTimeWindow(60);
        markActive(target);
        break;
      case "24h":
        setTimeWindow(24 * 60);
        markActive(target);
        break;
      case "errors":
        setSelect("filter-level", "error");
        setExtraWhere(null);
        markActive(target);
        break;
      case "warns":
        setSelect("filter-level", "");
        setExtraWhere("level IN ('warn', 'error')");
        markActive(target);
        break;
      case "net-fail":
        setSelect("filter-type", "network");
        setExtraWhere("(failed = true OR status >= 400)");
        markActive(target);
        break;
      case "slow":
        setSelect("filter-type", "network");
        setExtraWhere("duration > 1000");
        markActive(target);
        break;
      case "reset":
        setSelect("filter-project", "");
        setSelect("filter-runtime", "");
        setSelect("filter-type", "");
        setSelect("filter-level", "");
        setSearch("");
        clearPresetState();
        presetRow.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        break;
      default:
        return;
    }
    await refreshFilterQuery(db);
  });

  // Clear DuckDB (browser-only)
  document.getElementById("clear-db")?.addEventListener("click", async () => {
    if (!confirm("Clear all rows from the in-browser DuckDB? (Raw log files on disk are untouched.)"))
      return;
    await truncateLogs(db);
    ingester.resetOffsets();
    await refreshProjectList(db);
    await refreshFilterQuery(db);
    setHeaderStatus("DuckDB cleared (re-ingesting from disk...)");
    // Re-ingest from disk so the table repopulates naturally
    await ingester.catchUpAll(db);
    await refreshProjectList(db);
    await refreshFilterQuery(db);
    setHeaderStatus("DuckDB repopulated");
  });

  // Clear logs on disk (destructive)
  document.getElementById("clear-logs")?.addEventListener("click", async () => {
    if (
      !confirm(
        "Delete ALL raw JSONL files and per-project DuckDB indexes under the current root? This cannot be undone.",
      )
    )
      return;
    setHeaderStatus("clearing on-disk logs...");
    try {
      const res = await fetch("/api/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ root: ingester.getRoot() }),
      });
      if (!res.ok) throw new Error(`clear failed: ${res.status}`);
      const { rawFilesDeleted, indexDbsDeleted } = (await res.json()) as {
        rawFilesDeleted: number;
        indexDbsDeleted: number;
      };
      await truncateLogs(db);
      ingester.resetOffsets();
      await refreshProjectList(db);
      await refreshFilterQuery(db);
      setHeaderStatus(
        `cleared ${rawFilesDeleted} raw file(s), ${indexDbsDeleted} index dir(s)`,
      );
    } catch (err) {
      setHeaderStatus(`clear error: ${String(err)}`);
    }
  });
}

async function truncateLogs(db: Awaited<ReturnType<typeof getDB>>): Promise<void> {
  const conn = await db.connect();
  try {
    await conn.query("DELETE FROM logs");
  } finally {
    await conn.close();
  }
}

void main();
