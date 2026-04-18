export { openIndex, closeIndex } from "./connection.js";
export { CREATE_LOGS_TABLE, DROP_LOGS_TABLE } from "./schema.sql.js";
export { reindex, indexFile } from "./indexer.js";
export type { ReindexOptions, ReindexResult } from "./indexer.js";
export { queryLogs, aggregateLogs } from "./query.js";
export type { QueryFilter, AggregateRow } from "./query.js";
