export function LogTable() {
  return (
    <div class="table-wrap">
      <table id="log-table">
        <thead>
          <tr>
            <th style="width: 180px">Timestamp</th>
            <th style="width: 140px">Project</th>
            <th style="width: 80px">Runtime</th>
            <th style="width: 80px">Type</th>
            <th style="width: 60px">Level</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody id="log-tbody"></tbody>
      </table>
    </div>
  );
}
