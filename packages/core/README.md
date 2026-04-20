# @logit/core

Internal package. Provides log type definitions, storage writing, DuckDB indexing, querying, and source-map resolution.

Rarely used directly. For runtime instrumentation see [`@logit/runtime-node`](../runtime-node/README.md) / [`@logit/vite-plugin`](../vite-plugin/README.md); for browsing use [`@logit/cli`](../cli/README.md) / [`@logit/web-ui`](../../apps/web-ui/README.md).

## Main exports

- `LogEvent` / `Runtime` / `EventType` / `LogLevel` — types
- `openIndex` / `closeIndex` / `queryLogs` / `aggregateLogs` — DuckDB queries
- `dbFilePath` — resolves to `.devlogs/index/logs.duckdb`
- `resolveStackFrames` — source-map resolution
