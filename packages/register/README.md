# @logit/register

Runtime-aware entry that auto-loads the right logit runtime package for Node / Bun / Deno.

## Usage

```json
{
  "scripts": {
    "dev": "node --import @logit/register ./src/index.ts"
  }
}
```

Bun and Deno work with their respective flags (`bun --preload @logit/register ./src/index.ts`, `deno run --import @logit/register ./src/index.ts` when their `node:` compat + `node_modules` resolution is enabled).

At startup this package inspects `globalThis.Deno` / `globalThis.Bun` and dynamically imports the matching runtime:

- `@logit/runtime-deno/register` (when Deno)
- `@logit/runtime-bun/register` (when Bun)
- `@logit/runtime-node/register` (default)

If you want to pin a runtime explicitly (e.g. to skip the detection), import the specific runtime package instead — see [`@logit/runtime-node`](../runtime-node/README.md).

## `detectRuntime()`

For tooling that needs to branch on the current runtime:

```ts
import { detectRuntime } from "@logit/register/detect";

const rt = detectRuntime(); // "node" | "bun" | "deno"
```

No side effects on this subpath — just the pure function.
