---
"@kilog/cli": patch
---

Swap the CLI argument parser from `yargs` to `cac`. Same commands, same flags; `@kilog/cli` now ships with a single 0-dep dependency (~40 KB) in place of yargs + @types/yargs. Only user-visible difference: `kilog --version` no longer prints the package version (can be reintroduced if needed).
