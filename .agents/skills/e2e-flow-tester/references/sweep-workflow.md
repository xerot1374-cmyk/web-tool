# Sweep workflow

## Goal

Produce useful Playwright coverage from a whole-app sweep without pretending the app is simpler or safer than it is.

## Discovery order

1. Detect the current E2E harness.
2. Detect how the app is started or attached.
3. Map navigable routes and entry points from the codebase.
4. Identify auth models, fixture accounts, and seeded data.
5. Explore the running app to confirm real user-visible flows.
6. Generate or update tests for the highest-value uncovered flows.
7. Run the generated tests when requested.
8. Record coverage and unresolved gaps.

## What to inspect first

- `playwright.config.*`
- existing `tests/e2e`, `e2e`, or Playwright-spec directories
- package scripts for Playwright, app startup, and seeded environments
- Docker or Compose files that already support browser automation
- auth helpers, storage-state files, seeded accounts, and fixtures
- router definitions, nav menus, route guards, and major page modules
- backend or API docs that reveal workflow branches and entity states

## Flow categories

- Happy path flows: the core journeys users must complete successfully
- Auth flows: sign in, sign out, session restore, role-gated access
- Stateful flows: create, edit, archive, delete, retry, confirm
- Branching flows: alternate outcomes based on validation, permissions, or data state
- Browse flows: search, filter, sort, pagination, detail navigation
- Empty and failure flows: no results, expired session, backend errors, invalid input

## Coverage heuristics

- Cover one representative happy path per major feature area before expanding edge cases.
- Prefer flows that cross page, API, and state boundaries.
- Reuse shared setup for auth and seeded entities rather than duplicating long setup steps.
- Add edge cases only after the primary path is stable.
- Keep one flow per test when that improves failure isolation.

## Gap rules

Mark a flow as a gap when any of these are true:

- required seed data or credentials are missing
- the behavior is destructive and no safe isolation path exists
- the app depends on third-party redirects or anti-bot controls
- the expected result is too ambiguous to assert safely
- the flow exists in code or docs but could not be reached in the running app

For each gap, record:

- flow name
- why it matters
- why automation was blocked
- what would unblock it

## Output shape

Use a concise report with:

- `Discovered flows`
- `Automated flows`
- `Gaps`
- `Assumptions`
- `Artifacts`
