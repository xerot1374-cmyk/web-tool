---
name: test-automation-builder
description: Design and implement test automation for this monorepo across backend, web, mobile, API, contract, CI, and Playwright end-to-end flows. Use when Codex needs to add or refine automated tests, test strategy, CI test stages, browser automation, API verification, or cross-stack acceptance coverage.
---

# Test Automation Builder

Use this skill for shared testing work and for any task that crosses application boundaries.

## Defaults
- Default to generating unit, functional, and end-to-end coverage unless the user explicitly narrows the scope.
- Use Playwright as the default browser and end-to-end tool unless the user explicitly asks for something else.
- Cover unit, integration, contract/API automation, and Playwright end-to-end layers.
- Keep fast feedback in unit tests and confidence-heavy checks in later pipeline stages.
- Prefer deterministic test data and explicit fixtures.
- Add contract testing when backend and clients share important API expectations.

## Intake behavior
- Start with a short intake when the desired coverage mix, runtime environment, or target workflow is unclear.
- Ask exactly one substantive question per turn unless the user explicitly asks for grouped questions.
- Confirm the smallest missing details needed to produce useful automation, including:
  - whether the task is new test generation, stronger regression coverage, or test refactoring
  - which layers are expected: unit, functional, API or contract, and end-to-end
  - whether tests must run in a dedicated container or environment
  - which user journeys or backend workflows are most important
- If the user explicitly wants broader discovery, requirement shaping, or prompt preparation before implementation, hand off to `intake-orchestrator`.

## Workflow
- Read `references/test-matrix.md` before defining or reorganizing test coverage.
- Coordinate with `go-backend-builder`, `vue3-frontend-builder`, and `expo-react-native-builder` for stack-specific test placement.
- Coordinate with `devops-infrastructure-builder` when CI/CD pipeline stages, test containers, or test environments are part of the change.
- Coordinate with `change-validator` when the user wants explicit proof that the implemented change satisfies the original prompt.
- Load `web-visual-tester` when the task is visual frontend inspection, screenshot-based UI review, or evidence gathering before frontend fixes.
- Load `internal-docs-builder` when testing changes affect engineering workflows, validation expectations, or agent-facing guidance.
- Keep Playwright focused on critical user journeys and integration seams.
- After finishing a coherent testing or automation change, create a descriptive git commit that groups the related test work together.

## Implementation rules
- Generate the requested mix of unit, functional, and end-to-end tests instead of defaulting to only one layer when the request is broad.
- Do not overuse end-to-end tests for behavior better proven at lower layers.
- Prefer API-level and contract tests for integration confidence between backend and clients.
- Treat Playwright as the default choice for browser automation and visual journey verification unless the user says otherwise.
- Keep browser automation stable by targeting resilient selectors and seeded environments.
- Prefer test setups that can run inside a dedicated test container and against a defined test environment when the stack supports containerized workflows.
- Make test stage ordering visible in CI.
- Align test naming and folder structure with the monorepo layout.
- Create or update internal documentation when meaningful testing changes affect how contributors validate the system or understand coverage boundaries, and create missing docs when needed.

## Reference
- Read `references/test-matrix.md` for the default stack-wide automation model.
