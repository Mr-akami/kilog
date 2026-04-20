# @logit/core

Internal package. Provides log type definitions, storage writing, discovery, DuckDB indexing, querying, differential catch-up, and source-map resolution.

Rarely used directly. For runtime instrumentation see [`@logit/runtime-node`](../runtime-node/README.md) / [`@logit/vite-plugin`](../vite-plugin/README.md); for browsing use [`@logit/cli`](../cli/README.md) / [`@logit/web-ui`](../web-ui/README.md).

## Main exports

- **Types**: `LogEvent` / `Runtime` / `EventType` / `LogLevel` / `SourceFile` / `DiscoveredSource`
- **Storage**: `createWriter`, `readLogFile`, `listRawFiles`, `dbFilePath`, `dbFilePathFromDevlogs`
- **Discovery**: `findDevlogsDirs`, `discoverSources`, `discoverSourceFiles`, `listRawFilesIn` — walks down from a root and enumerates `.logit/` directories
- **Index**: `openIndex` / `closeIndex` (ensures schema on open), `queryLogs`, `aggregateLogs`, `listProjects`
- **Catch-up**: `catchUpFile`, `catchUpIndex` — differential indexing based on byte offset + mtime tracked in a `sources` table inside each DuckDB
- **Reindex**: `reindex` — drops and rebuilds one project's index from raw JSONL
- **Source maps**: `resolveStackFrames`
