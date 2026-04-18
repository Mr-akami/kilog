# Runtime Integration

## Browser

Browser は Vite plugin 前提とする。

導入方針:

- `transformIndexHtml`で browser runtime を inject する
- `configureServer`で dev server 側の補助処理を追加できるようにする

収集対象:

- `console.log/info/warn/error/debug`
- `window.onerror`
- `unhandledrejection`
- `fetch`
- route, href, tab session id

## Node.js

Node.js は`--import`を使う路線を第一候補とする。

狙い:

- `node`の既存コマンドを大きく変えない
- `tsx`など Node ベースの実行にも乗せやすい

導入例:

```bash
NODE_OPTIONS="--import @logit/runtime-node/register" node server.js
```

収集対象:

- `console.*`
- `uncaughtException`
- `unhandledRejection`
- `fetch`

## Bun

Bun は`--preload`を第一候補とする。

導入例:

```bash
bun --preload @logit/runtime-bun/register app.ts
```

または:

```bash
BUN_INSPECT_PRELOAD=@logit/runtime-bun/register bun app.ts
```

収集対象は Node.js と同等を基本にする。

## Deno

Deno は初期版では experimental とする。

導入方針:

- manual import
- wrapper
- task 経由

導入例:

```ts
import "@logit/runtime-deno/register";
import "./main.ts";
```

## Shared Policy

- 既存コマンドをなるべく維持する
- zero or minimal change の導入を優先する
- runtime ごとの差し込み方式は分けるが、event schema は共通化する
