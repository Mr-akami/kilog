---
"@kilog/cli": patch
---

Swap the CLI argument parser from `yargs` to `cac`. Same commands, same flags, `kilog --version` / `-v` still print the package version. `@kilog/cli` now ships with a single 0-dep dependency (~40 KB) in place of yargs + @types/yargs.
