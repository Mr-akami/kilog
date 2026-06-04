---
"@kilog/vite-plugin": patch
---

Apply the Vite plugin in `serve` mode only. Previously `transformIndexHtml` also ran during `vite build`, injecting the browser runtime into production HTML; now the plugin no-ops outside the dev server.
