interface Props {
  root: string;
  sourceCount: number;
}

export function Header({ root, sourceCount }: Props) {
  return (
    <header>
      <h1>kilog</h1>
      <label class="root-input">
        Root:
        <input id="root" type="text" value={root} placeholder="(absolute or relative path)" />
        <button id="root-apply" type="button">
          Apply
        </button>
      </label>
      <button id="clear-db" type="button" title="Clear the in-browser DuckDB">
        Clear DuckDB
      </button>
      <button
        id="clear-logs"
        type="button"
        class="danger"
        title="Delete raw JSONL files and per-project DuckDB indexes on disk"
      >
        Clear logs on disk
      </button>
      <span class="status" id="header-status">
        {sourceCount} source(s) discovered
      </span>
    </header>
  );
}
