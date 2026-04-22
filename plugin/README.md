# kilog — Claude Code plugin

Teaches Claude Code to drive the `kilog` CLI when the user asks about dev logs.

## Install

```
/plugin marketplace add <this-repo>
/plugin install kilog
```

Plugin root is this directory (`plugin/` within the repo), so pointing the marketplace at either the repo root or this subdirectory works.

## Contents

- `skills/kilog/SKILL.md` — routes natural-language log requests to the right `kilog` CLI invocation.
- `skills/kilog/evals/evals.json` — benchmark prompts for the skill-creator eval loop.

## Requires

- `@kilog/cli` available in the target workspace (either as a devDependency or globally installed).
- The target project instrumented via `@kilog/register` (Node) or `@kilog/vite-plugin` (browser).
