export function SqlBar() {
  return (
    <div class="sql-bar">
      <textarea
        id="sql-input"
        placeholder="Enter raw SQL (e.g. SELECT project, COUNT(*) FROM logs GROUP BY project)"
      ></textarea>
      <div class="actions">
        <button id="sql-run" type="button">
          Run SQL
        </button>
        <span id="sql-status"></span>
      </div>
    </div>
  );
}
