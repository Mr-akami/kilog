# Product

## Summary

`logit` is an OSS logging tool for local development.

Goals:

- Store browser logs locally
- Store runtime logs such as Node.js logs locally
- Make saved logs easy to query later
- Integrate with minimal changes to existing development commands

## Scope

Initial target scope:

- Browser: Vite dev server
- Runtime: Node.js first, Bun second, Deno experimental
- Query UX: CLI first
- UI: include a sample web UI
- Repository: use a pnpm workspace monorepo
- Initial implementation: start with `core`, `cli`, `vite-plugin`, and `runtime-node`

## Positioning

`logit` is not a centralized production logging platform. It is a tool for local development observability and query workflows.

Priorities:

- Lightweight adoption
- Preserving raw data
- Query-friendly storage formats
- An architecture that allows sourcemap and redaction improvements later
- Package-oriented separation of responsibilities
