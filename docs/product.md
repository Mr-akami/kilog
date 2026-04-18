# Product

## Summary

`logit`は、local development 用の logging OSS である。

目的:

- ブラウザログをローカル保存する
- Node.js などの runtime ログをローカル保存する
- 保存したログを後から簡単に検索する
- 既存の開発コマンドをなるべく壊さず導入できるようにする

## Scope

初期ターゲットは以下。

- Browser: Vite dev server 前提
- Runtime: Node.js first, Bun second, Deno experimental
- Query UX: CLI first
- UI: sample Web UI を付属
- Repository: pnpm workspace を使う monorepo

## Positioning

`logit`は本番向けの集中管理基盤ではなく、local dev に特化した観測と検索のためのツールとする。

次の価値を優先する。

- 導入の軽さ
- raw data を失わないこと
- query しやすい保存形式
- source map や redaction を後から改善できる構成
- package 単位で責務を分離できる構成
