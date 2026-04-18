# Agent Index

This directory is the entry point for agent-related guidance in this repository.

## Documents

- [Docs Index](../docs/index.md): documentation index
- [Overview](../docs/overview.md): project overview and core direction
- [Docs Policy](../docs/docs-policy.md): documentation placement and update rules
- [Skills Policy](../docs/skills-policy.md): authoring rules for skill files

## Skills

- Files under `skills/` should delegate shared explanations to the root `docs/` directory
- Skill files should contain only skill-specific purpose, inputs, outputs, constraints, and execution steps

## Authoring Rule

- Write the source of truth in the root `docs/` directory first
- Keep `agent.md` as an index
- Do not duplicate non-skill-specific explanations in `skills/`
