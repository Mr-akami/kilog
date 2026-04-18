# Query Model

## Storage Strategy

Use a two-layer storage model.

- raw: append-only JSONL
- index: DuckDB

This keeps raw logs as the source of truth while providing a query-friendly index.

## Why DuckDB

- It is easy to query from the CLI with SQL
- It handles JSON well
- It is well-suited for aggregation, filtering, and time-based queries
- It is easy to rebuild from raw JSONL

## Query UX

Make the CLI the primary query interface.

Initial commands:

- `logit tail`
- `logit query`
- `logit reindex`
- `logit prune`
- `logit doctor`
- `logit ui`

## Source Map Policy

Resolve sourcemaps at query time in the MVP.

Persist the following at ingest time:

- stack
- generated frames

Resolve the following at query time:

- Sourcemap-based frame resolution
- Cached resolution results

## PII Policy

Enable a minimum PII redaction policy by default.

Covered values:

- email
- Authorization header
- bearer token
- Cookie
- Set-Cookie
- password
- `apiKey`, `token`, and `secret` style keys

Allow additional rules through configuration.

## Network Log Policy

Include network logs from the initial version, but keep them summary-oriented.

Persist:

- method
- url
- normalized path
- status
- duration
- size
- failed flag
- error message

Do not persist:

- Full bodies
- binary
- Large full header sets
