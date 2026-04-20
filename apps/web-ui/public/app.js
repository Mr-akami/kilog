"use strict";

const logBody = document.getElementById("log-body");
const statusEl = document.getElementById("status");
const btnSearch = document.getElementById("btn-search");
const filterRuntime = document.getElementById("filter-runtime");
const filterType = document.getElementById("filter-type");
const filterLevel = document.getElementById("filter-level");
const filterSearch = document.getElementById("filter-search");

function buildQueryString() {
  const params = new URLSearchParams();
  const runtime = filterRuntime.value;
  const type = filterType.value;
  const level = filterLevel.value;
  const search = filterSearch.value.trim();

  if (runtime) params.set("runtime", runtime);
  if (type) params.set("type", type);
  if (level) params.set("level", level);
  if (search) params.set("search", search);
  params.set("limit", "200");

  return params.toString();
}

function levelClass(level) {
  if (!level) return "";
  return "level-" + level;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderLogs(events) {
  if (events.length === 0) {
    logBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#888">No logs found</td></tr>';
    return;
  }

  const rows = events.map(function (e) {
    return (
      "<tr>" +
      "<td>" + escapeHtml(e.timestamp) + "</td>" +
      "<td>" + escapeHtml(e.runtime) + "</td>" +
      "<td>" + escapeHtml(e.type) + "</td>" +
      '<td class="' + levelClass(e.level) + '">' + escapeHtml(e.level || "") + "</td>" +
      "<td>" + escapeHtml(e.message || "") + "</td>" +
      "</tr>"
    );
  });

  logBody.innerHTML = rows.join("");
}

async function fetchLogs() {
  statusEl.textContent = "Loading...";
  try {
    const qs = buildQueryString();
    const res = await fetch("/api/logs?" + qs);
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    const events = await res.json();
    renderLogs(events);
    statusEl.textContent = events.length + " events";
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
    logBody.innerHTML = "";
  }
}

btnSearch.addEventListener("click", fetchLogs);
filterSearch.addEventListener("keydown", function (e) {
  if (e.key === "Enter") fetchLogs();
});

fetchLogs();
