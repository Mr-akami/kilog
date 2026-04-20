export const STYLES = `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #333; }
header { background: #1a1a2e; color: #fff; padding: 12px 24px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
header h1 { font-size: 18px; font-weight: 600; flex: 0 0 auto; }
header .root-input { flex: 1; display: flex; gap: 6px; align-items: center; font-size: 12px; min-width: 320px; }
header .root-input input { flex: 1; padding: 4px 8px; border-radius: 4px; border: 0; font-family: ui-monospace, monospace; font-size: 12px; }
header button { padding: 4px 12px; font-size: 12px; background: #444461; color: #fff; border: 0; border-radius: 4px; cursor: pointer; }
header button.danger { background: #6e2a2a; }
header button:hover { filter: brightness(1.15); }
header .status { font-size: 12px; opacity: 0.7; margin-left: auto; }
.filters { display: flex; gap: 8px; padding: 12px 24px; background: #fff; border-bottom: 1px solid #ddd; flex-wrap: wrap; align-items: center; }
.filters select, .filters input { padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.filters input[type="text"] { min-width: 200px; }
.filters button { padding: 6px 16px; background: #1a1a2e; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
.presets { display: flex; gap: 6px; padding: 10px 24px; background: #fafafa; border-bottom: 1px solid #eee; flex-wrap: wrap; align-items: center; font-size: 12px; }
.presets .label { color: #888; margin-right: 4px; }
.presets button { padding: 4px 12px; font-size: 12px; background: #fff; color: #333; border: 1px solid #ccc; border-radius: 12px; cursor: pointer; }
.presets button:hover { background: #eee; }
.presets button.active { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }
.presets .sep { color: #ccc; margin: 0 4px; }
.sql-bar { padding: 12px 24px; background: #fff; border-bottom: 1px solid #ddd; }
.sql-bar textarea { width: 100%; font-family: ui-monospace, monospace; font-size: 12px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; min-height: 50px; resize: vertical; }
.sql-bar .actions { margin-top: 6px; display: flex; gap: 8px; font-size: 12px; color: #666; align-items: center; }
.sql-bar button { padding: 4px 10px; font-size: 12px; background: #1a1a2e; color: #fff; border: 0; border-radius: 4px; cursor: pointer; }
#log-table { width: 100%; border-collapse: collapse; background: #fff; font-size: 13px; table-layout: fixed; }
#log-table th { text-align: left; padding: 8px 12px; background: #eee; border-bottom: 2px solid #ddd; position: sticky; top: 0; }
#log-table td { padding: 6px 12px; border-bottom: 1px solid #eee; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.level-error { color: #d32f2f; font-weight: 600; }
.level-warn { color: #f57c00; font-weight: 600; }
.level-info { color: #1976d2; }
.level-debug { color: #888; }
.table-wrap { overflow-x: auto; padding: 0 24px 24px; }
#status { padding: 8px 24px; font-size: 12px; color: #666; }
.error { color: #d32f2f; }`;
