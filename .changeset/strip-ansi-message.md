---
"@kilog/core": patch
---

fix(core): strip ANSI escape sequences from `ConsoleEvent.message` so captured logs stay grep/SQL/UI-friendly. Raw args are still preserved in `ConsoleEvent.args` — no data lost. Fixes garbage like `[39m ...` appearing in `kilog logs` / web-ui when the source process (e.g. Vite's dev banner) emits colored output.
