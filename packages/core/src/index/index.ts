export { openIndex, closeIndex } from "./connection.js";
export {
  CREATE_LOGS_TABLE,
  DROP_LOGS_TABLE,
  CREATE_SOURCES_TABLE,
  DROP_SOURCES_TABLE,
  ADD_LOGS_PROJECT_COLUMN,
  ADD_SOURCES_PROJECT_COLUMN,
} from "./schema.sql.js";
export { reindex, indexFile } from "./indexer.js";
export type { ReindexOptions, ReindexResult } from "./indexer.js";
export { queryLogs, aggregateLogs, listProjects } from "./query.js";
export type { QueryFilter, AggregateRow } from "./query.js";
export { parseSearch, escapeIlikePattern, SearchParseError } from "./search-parser.js";
export type { SearchTerm, SearchExpr } from "./search-parser.js";
export { catchUpIndex, catchUpFile } from "./catchup.js";
export type { CatchUpResult } from "./catchup.js";
export { insertEvents } from "./insert.js";
