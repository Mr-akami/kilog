# Overview

`logit`は、local development 環境向けのログ収集・保存・検索ツールです。

このリポジトリでは、ブラウザと runtime のログをローカルに保存し、CLI を中心に簡単に検索できる OSS を構築します。

基本方針は以下です。

- Browser は Vite plugin で収集する
- Runtime は preload/import で差し込める形を優先する
- raw log は JSONL に保存する
- query backend は DuckDB を使う
- CLI を主導線にし、Web UI は sample として付属させる

関連仕様は以下を参照する。

- [Product](product.md)
- [Requirements](requirements.md)
- [Architecture](architecture.md)
- [Runtime Integration](runtime-integration.md)
- [Query Model](query-model.md)
