# Requirements

## Functional Requirements

- ブラウザで発生したログをローカルのフォルダに保存する
- Vite dev server 前提で、plugin を差し込む形で導入できる
- Node.js のログをローカルのフォルダに保存する
- 可能なら Bun と Deno にも対応する
- 既存の起動コマンドをなるべく維持する
- log は query することを主目的にする
- browser / runtime の両方で network log を扱う

## Product Decisions

- プロダクト名は`logit`
- CLI first で始める
- Web UI は sample として付属させる
- package manager は`pnpm`を使う
- build/dev tooling は`Vite`と`vite-plus`を前提にする
- module format は ESM 前提にする
- custom linter は`ESLint`を使う
- test は`Vitest`を使う
- E2E が必要な場合は`Playwright`を使う
- server が必要な場合は`Hono`を第一候補にする
- TypeScript は strict 前提で運用する
- log の保存単位は`日付 + runtime`
- raw format は JSONL
- query backend は DuckDB
- source map は MVP では検索時解決
- PII mask は最低限を標準搭載し、設定で拡張可能にする

## Runtime Support

- Node.js: first-class support
- Bun: second priority
- Deno: experimental

## Platform Support

- Linux: first-class support
- macOS: second priority
- Windows: best effort
