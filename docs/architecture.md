# Architecture

## High Level

`logit`は、runtime ごとの agent と、共通の保存・検索基盤で構成する。

実装は pnpm workspace を使った monorepo を前提にし、Domain 名の大きいフォルダを作るより、責務ごとに package 単位で分ける。

構成:

- `core`: event schema, serializer, redaction, file layout
- `vite-plugin`: browser agent
- `runtime-node`: Node.js register
- `runtime-bun`: Bun register
- `runtime-deno`: Deno register
- `cli`: tail, query, reindex, prune, doctor, ui
- `ui-sample`: sample Web UI

## Repository Policy

- package manager は`pnpm`
- workspace で packages を分割する
- ESM 前提で実装する
- TypeScript は strict 前提にする
- linter は`ESLint`
- unit/integration test は`Vitest`
- E2E が必要な場合は`Playwright`
- HTTP server が必要な場合は`Hono`

## Package-Oriented Structure

大きい domain フォルダを切るのではなく、workspace package を最小の配布・責務単位として扱う。

狙い:

- runtime ごとの差分を package 境界で分離する
- CLI, core, plugin, sample UI を独立して育てる
- 配布、テスト、依存関係を package 単位で制御しやすくする
- 将来の OSS 公開時に publish 戦略を取りやすくする

## Data Flow

Browser:

- Vite plugin が browser runtime を inject する
- browser runtime が console, error, unhandledrejection, fetch を収集する
- agent が raw JSONL に append する

Runtime:

- preload/import で runtime agent を差し込む
- runtime agent が console, uncaughtException, unhandledRejection, fetch を収集する
- agent が raw JSONL に append する

Search:

- CLI が raw JSONL から DuckDB index を構築する
- CLI と sample UI が DuckDB を query する

## Storage Layout

```text
.devlogs/
  raw/
    2026-04-18.browser.jsonl
    2026-04-18.node.jsonl
    2026-04-18.bun.jsonl
    2026-04-18.deno.jsonl
  index/
    logs.duckdb
  cache/
    sourcemaps/
  meta/
    sessions.json
```

## Design Choice

collector 常駐プロセスは初期必須にしない。

理由:

- 導入が軽い
- 起動忘れがない
- raw JSONL を正本として扱える
- DuckDB index を後から再構築できる
