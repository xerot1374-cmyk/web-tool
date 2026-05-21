---
name: internal-docs-builder
description: Create and maintain internal engineering documentation and agent-facing documentation for this monorepo, including engineering overviews, runbooks, ADRs, and agent instructions. Use when Codex should add, update, organize, or bootstrap internal docs after meaningful technical changes or when internal documentation is explicitly requested.
---

# Internal Docs Builder

Use this skill for internal engineering and agent-facing documentation work.

## Default scope
- Engineering overviews
- Runbooks
- ADRs
- Agent instructions

The skill may create other internal doc types when the user explicitly asks.

## Workflow
- Check whether the needed internal documentation already exists before creating new files.
- If no suitable internal docs exist, create the minimum structure needed to document the change clearly.
- Update internal docs after meaningful technical changes even when the user did not explicitly ask for documentation.
- Pair with builder and architecture skills so the documentation reflects what was actually changed.
- Keep documentation updates in the same related change set as the implementation they describe.

## Structure rules
- Keep internal human-facing engineering docs under `docs/internal/`.
- Put engineering overviews under `docs/internal/engineering-overview/`.
- Put runbooks under `docs/internal/runbooks/`.
- Put ADRs under `docs/internal/adr/`.
- Keep repo-wide agent operating guidance in `AGENTS.md`.
- Keep skill-specific agent guidance inside `.agents/skills/<skill-name>/`.
- Do not create user-facing product docs or API/reference docs with this skill unless the user explicitly asks despite the default scope.

## Documentation rules
- Prefer updating an existing relevant document over creating a duplicate.
- Create missing docs when a meaningful change affects engineer understanding, operations, decisions, or contributor workflow.
- Treat these as meaningful by default:
  - new features or workflows
  - architecture or boundary changes
  - setup, deployment, or operational changes
  - new services, modules, integrations, or dependencies
  - repo-rule, agent-behavior, or contributor-workflow changes
- Skip doc churn for purely cosmetic edits, formatting-only changes, or refactors with no workflow or understanding impact unless the user asks.
- Keep docs concise, concrete, and aligned with the current repo structure.
- Prefer explicit commands, paths, assumptions, and ownership over vague prose.

## References
- Read `references/doc-structure.md` for placement and ownership rules.
- Read `references/doc-update-triggers.md` for the meaningful-change threshold and update behavior.
