# Query Model

## Storage Strategy

保存は 2 層に分ける。

- raw: append-only JSONL
- index: DuckDB

この構成により、raw を正本として保持しつつ、query しやすい index を持てる。

## Why DuckDB

- CLI から SQL で扱いやすい
- JSON を扱いやすい
- 集計、絞り込み、時系列検索に向いている
- raw JSONL から再構築しやすい

## Query UX

CLI を主導線にする。

初期コマンド:

- `logit tail`
- `logit query`
- `logit reindex`
- `logit prune`
- `logit doctor`
- `logit ui`

## Source Map Policy

MVP では source map は検索時解決とする。

保存時に持つもの:

- stack
- generated frames

検索時に行うこと:

- source map を使った解決
- 解決結果の cache 利用

## PII Policy

最低限の PII redaction を標準有効にする。

対象:

- email
- Authorization header
- bearer token
- Cookie
- Set-Cookie
- password
- `apiKey`, `token`, `secret`系の key

追加ルールは設定で拡張可能にする。

## Network Log Policy

network log は初版から含めるが、要約中心にする。

保存するもの:

- method
- url
- normalized path
- status
- duration
- size
- failed flag
- error message

保存しないもの:

- body 全文
- binary
- 大きな header 全文
