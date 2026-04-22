# Overview

`kilog` is a logging tool for local development environments.

This repository builds an OSS product that stores browser and runtime logs locally and makes them easy to query through a CLI-first workflow.

Core principles:

- Collect browser logs through a Vite plugin
- Prefer preload or import based runtime integration
- Store raw logs as JSONL
- Use DuckDB as the query backend
- Make the CLI the primary interface and keep the web UI as a sample

See the following documents for the detailed product specification:

- [Product](product.md)
- [Requirements](requirements.md)
- [Architecture](architecture.md)
- [Runtime Integration](runtime-integration.md)
- [Query Model](query-model.md)
