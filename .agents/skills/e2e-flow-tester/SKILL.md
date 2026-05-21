---
name: e2e-flow-tester
description: Discover web app flows from the codebase, running app, and available backend or API docs; generate and run Playwright-first end-to-end tests using the repo's existing test environment or Playwright container setup; and report coverage plus automation gaps after a whole-app sweep.
---

# E2E Flow Tester

Use this skill when the user wants web end-to-end coverage generated from broad application discovery rather than only for a single pre-named path.

## Defaults
- Default to web apps only and Playwright first.
- Default to a whole-app sweep unless the user explicitly narrows the target area.
- Reuse the repository's existing Playwright project, test environment, seeded accounts, and containerized test workflow when present.
- Use codebase inspection, live browser exploration, and backend or API docs together when available.
- Produce three outputs by default:
  - Playwright test files
  - a discovered-flow inventory and coverage summary
  - a gap list for flows that could not be automated safely or deterministically
- Try all reasonable flows inside a safe test environment, using seeded or demo accounts when available.

## Intake behavior
- Start with a short intake only when one of these is unclear:
  - which web app or route group to target in a multi-app repo
  - how to launch or attach to the running app
  - whether a seeded auth account or test data source exists
  - whether the user wants full generation, refresh of existing tests, or gap analysis only
- Ask exactly one substantive question per turn unless the user explicitly asks for grouped questions.
- If the user needs broader requirement shaping before implementation, hand off to `intake-orchestrator`.

## Workflow
- Read `references/sweep-workflow.md` before doing a full-app sweep.
- Detect the existing Playwright setup first, including config files, test directories, helper utilities, auth fixtures, container setup, and environment commands.
- Detect the app runtime path next:
  - prefer attaching to an already running app when possible
  - otherwise use the repo's documented dev or test startup flow
  - prefer the existing Playwright container or test container path when the repo already has one
- Build the flow map from multiple sources:
  - routes, menus, navigation components, and guards in the codebase
  - existing tests, fixtures, and factories
  - backend or API docs that reveal states, entities, and workflow branches
  - browser exploration of visible pages, forms, transitions, and empty or error states
- Group discovered flows into:
  - core happy paths
  - auth-gated paths
  - alternate or branching paths
  - destructive or stateful paths
  - non-automatable or unsafe paths
- Generate Playwright coverage for the highest-value uncovered flows first.
- Prefer extending existing fixtures, page objects, helpers, and seeded-data utilities over inventing a parallel pattern.
- Run the generated tests with the repo's existing Playwright command or container path when the user asks to write and run tests.
- Report what was covered, what passed, and what remains a gap.

## Implementation rules
- Do not create a brand new Playwright stack if the repo already has one.
- Do not overwrite or delete existing user-written tests unless explicitly asked.
- Keep selectors resilient by preferring accessible roles, labels, stable test ids, and existing helper abstractions.
- Avoid generating brittle assertions about incidental styling or copy unless the flow depends on them.
- Treat login, onboarding, CRUD, filtering, navigation, detail views, empty states, and common failure states as discovery targets during a whole-app sweep.
- Mark flows as gaps when they depend on missing seed data, unsafe side effects, anti-automation controls, third-party redirects, or ambiguous expected behavior.
- When destructive flows are automatable in the safe environment, isolate them with dedicated setup and cleanup instead of skipping them by default.
- Keep generated files aligned with the repository's current test naming and folder conventions.

## Output rules
- Save generated or updated Playwright tests in the repo's existing end-to-end test location when one exists.
- If the repo has no established coverage report location, place the flow inventory and gap report under `tests/artifacts/e2e/`.
- Summarize outputs with these sections:
  - discovered flows
  - automated flows
  - skipped or gap flows
  - assumptions and environment dependencies
- For every gap, state why it was not automated and what would unblock it.

## Coordination rules
- Pair with `test-automation-builder` when the user also wants broader layered coverage or CI test-stage updates.
- Pair with `web-visual-tester` when the user wants screenshot evidence for suspicious states discovered during the sweep.
- Pair with `vue3-frontend-builder` when stable selectors, fixtures, or browser-facing hooks need to be added to support reliable automation.
- Pair with `devops-infrastructure-builder` when the missing piece is containerized execution, test environment bootstrapping, or CI wiring.
- Pair with `change-validator` only when the user explicitly asks for proof or a validation report.

## References
- Read `references/sweep-workflow.md` for the flow-discovery sequence and coverage heuristics.
