---
name: stack-orchestrator
description: Coordinate greenfield and ongoing full-stack work across a monorepo containing a Go backend, Vue 3 web frontend, Expo React Native mobile app, Docker-first infrastructure, CI/CD automation, and shared testing. Use when Codex needs to plan repo structure, decide build order, coordinate multiple stack areas, or route work to the backend, frontend, mobile, infrastructure, testing, or architecture skills.
---

# Stack Orchestrator

Use this skill first when the task affects more than one application or layer.

## Core workflow
- Confirm whether the task is repo-wide, cross-stack, or single-skill.
- Default to the monorepo layout in `references/repo-layout.md`.
- Route implementation work to the smallest relevant skill set:
  - `internal-docs-builder`
  - `go-backend-builder`
  - `vue3-frontend-builder`
  - `expo-react-native-builder`
  - `devops-infrastructure-builder`
  - `test-automation-builder`
  - `backend-architecture`
  - `frontend-architecture`
  - `devops-architecture`
- Keep contracts, environment names, auth flows, and test data consistent across apps.

## Default stack decisions
- Repo style: single monorepo
- Primary mode: greenfield scaffolding plus support for later iteration
- Backend default: REST JSON API with clean architecture, PostgreSQL, JWT auth, and migrations
- Web default: Vue 3, TypeScript, Vite, Vue Router, Pinia
- Mobile default: Expo, React Native, TypeScript, Expo Router
- Infrastructure default: Docker-first local and CI workflows, with optional AWS Terraform and cloud-agnostic Terraform tracks
- Testing default: unit, integration, contract/API automation, and Playwright end-to-end tests

## Coordination rules
- Resolve architecture decisions before generating large amounts of code.
- Prefer shared contract definitions and stable API boundaries over ad hoc coupling.
- Keep `infra/` and `.github/workflows/` aligned with how applications actually run locally.
- Ask for confirmation only when a choice would materially affect multiple apps or deployment targets.
- When a task is architecture-heavy, load the matching architecture skill before implementation.
- When meaningful implementation changes are complete, route through `internal-docs-builder` to update or create the internal docs needed to explain and operate the new state.
- When implementation work is complete, group related changes into a descriptive git commit rather than leaving them uncommitted.

## Reference
- Read `references/repo-layout.md` when the user asks for repo structure, shared standards, or bootstrapping order.
