# @mr-akami/kilog/register

Runtime-aware entry that auto-loads the right kilog runtime package for Node / Bun / Deno.

## Usage

```json
{
  "scripts": {
    "dev": "node --import @mr-akami/kilog/register ./src/index.ts"
  }
}
```

Bun and Deno work with their respective flags (`bun --preload @mr-akami/kilog/register ./src/index.ts`, `deno run --import @mr-akami/kilog/register ./src/index.ts` when their `node:` compat + `node_modules` resolution is enabled).

At startup this package inspects `globalThis.Deno` / `globalThis.Bun` and dynamically imports the matching runtime:

- `@kilog/runtime-deno/register` (when Deno)
- `@kilog/runtime-bun/register` (when Bun)
- `@mr-akami/kilog/runtime-node/register` (default)

If you want to pin a runtime explicitly (e.g. to skip the detection), import the specific runtime package instead — see [`@mr-akami/kilog/runtime-node`](./runtime-node.md).

## `detectRuntime()`

For tooling that needs to branch on the current runtime:

```ts
import { detectRuntime } from "@mr-akami/kilog/register/detect";

const rt = detectRuntime(); // "node" | "bun" | "deno"
```

No side effects on this subpath — just the pure function.
