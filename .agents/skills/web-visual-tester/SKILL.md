---
name: web-visual-tester
description: Inspect the web frontend for visual issues by launching or attaching to the app, navigating relevant pages, capturing screenshots, and reporting evidence for frontend follow-up. Use when Codex should review changed frontend features or scan the whole web app for layout, responsiveness, overflow, spacing, and visible state issues.
---

# Web Visual Tester

Use this skill for browser-based visual QA of the web frontend.

## Default behavior
- Default to Playwright unless the project already uses another browser automation tool.
- Support two modes:
  - targeted review of the changed feature or affected pages
  - broader frontend scan when the user explicitly asks for whole-app coverage
- Use one desktop viewport and one mobile viewport by default unless the user asks to add or remove viewports.
- Save artifacts under `tests/artifacts/visual/` by default, while allowing temporary output paths for one-off runs.
- Prefix artifact filenames with a UTC timestamp in `YYYYMMDD-HHMMSS` format so artifacts sort chronologically, for example `20260312-154233-checkout-mobile.png`.
- Check for obvious element-level alignment issues even without a screenshot baseline or design reference.
- When a control or component looks suspicious, capture tighter element-focused evidence in addition to page-level screenshots.
- If the user asks for stricter inspection, perform focused checks for common interactive elements even when no issue is immediately obvious.
- Produce evidence-rich reports and frontend handoff prompts without guessing root cause.
- When issues are found, prepare a default handoff prompt for `test-automation-builder` so visual findings can become regression coverage.

## Intake behavior
- Start with a short intake when the review scope, target routes, or expected evidence format is unclear.
- Ask exactly one substantive question per turn unless the user explicitly asks for grouped questions.
- Confirm the smallest missing details needed to run a useful review, including:
  - whether the task is a targeted feature review or whole-app scan
  - the pages, states, or flows that matter most
  - whether the goal is issue discovery only or issue discovery plus test handoff
  - any required viewports, auth states, or environments
- If the user explicitly wants broader discovery, requirement shaping, or prompt preparation before execution, hand off to `intake-orchestrator`.

## Workflow
- Determine whether the task is targeted feature validation or whole-frontend scanning.
- Identify what changed so the review focuses on the relevant views, states, and flows when feature-specific context exists.
- Launch the web app when needed, or attach to an already running app when appropriate.
- Navigate the required pages and states before capturing screenshots.
- Capture screenshots and note visible issues with enough context for frontend follow-up.
- Inspect obvious control-level defects such as overlapping button content, off-center labels, icon and text misalignment, uneven padding, clipping, and visibly inconsistent sizing.
- When a suspicious area is found, capture tighter screenshots or element-focused evidence for the affected control or component.
- If prior approved app screenshots or design references such as Figma are available, use them as comparison inputs.
- If visual issues are found, prepare a frontend handoff that points to the affected page, viewport, state, and saved evidence.
- If visual issues are found, also prepare a default `test-automation-builder` handoff prompt that describes which findings are good candidates for Playwright regression coverage.

## Reporting rules
- Report what is visible and reproducible, not speculative root-cause analysis.
- Include the UTC timestamp, page or route, viewport, relevant state, reproduction context, and screenshot path for each issue.
- Flag issues such as layout breaks, overlap, clipping, overflow, spacing problems, button or control misalignment, off-center labels, icon and text misalignment, broken responsive behavior, missing assets, unreadable states, and obviously inconsistent rendering.
- When comparing against a baseline or design reference, describe the mismatch in concrete UI terms.
- Keep findings organized so the frontend skill can act on them directly.

## Output rules
- Default artifact location: `tests/artifacts/visual/`
- Allow temp output locations when the user wants one-off exploratory runs.
- Save screenshots with names that start with a UTC `YYYYMMDD-HHMMSS` timestamp followed by page, state, and viewport details.
- Save focused evidence with names that also start with the UTC timestamp and reflect the affected element or component when tighter inspection is used.
- Produce a concise issue list plus a frontend handoff prompt when problems are found.
- Include a `test-automation-builder` handoff prompt by default when problems are found, unless the user explicitly says they do not want follow-on test work.
- If no issues are found, report what pages, states, and viewports were checked, along with the timestamped evidence that was captured.

## Coordination rules
- Pair with `vue3-frontend-builder` when findings should be handed off for fixes.
- Pair with `test-automation-builder` by default when findings should be converted into reusable browser automation or regression coverage.
- Pair with `change-validator` when the user wants explicit proof that a frontend change was visually checked.

## References
- Read `references/visual-review-flow.md` for the execution sequence.
- Read `references/report-format.md` for the expected evidence format and handoff structure.
