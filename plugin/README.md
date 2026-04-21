# logit — Claude Code plugin

Teaches Claude Code to drive the `logit` CLI when the user asks about dev logs.

## Install

```
/plugin marketplace add <this-repo>
/plugin install logit
```

Plugin root is this directory (`plugin/` within the repo), so pointing the marketplace at either the repo root or this subdirectory works.

## Contents

- `skills/logit/SKILL.md` — routes natural-language log requests to the right `logit` CLI invocation.
- `skills/logit/evals/evals.json` — benchmark prompts for the skill-creator eval loop.

## Requires

- `@logit/cli` available in the target workspace (either as a devDependency or globally installed).
- The target project instrumented via `@logit/register` (Node) or `@logit/vite-plugin` (browser).
