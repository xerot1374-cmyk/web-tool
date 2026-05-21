# Visual review flow

Default sequence:
- Decide whether the run is targeted to a changed feature or a broader frontend scan.
- Discover the relevant routes, states, and entry points from the task context and current code.
- Start the app if needed, otherwise attach to the running frontend.
- Review one desktop and one mobile viewport by default.
- Capture screenshots for the important states you inspect.
- Inspect obvious control-level presentation for buttons, inputs, cards, tabs, nav items, modals, and similar visible interactive elements when they appear relevant.
- When a control or component looks suspicious, capture tighter element-focused evidence in addition to page-level screenshots.
- If the user explicitly asks for stricter inspection, perform element-focused checks even without an initial suspicion trigger.
- Save artifacts to `tests/artifacts/visual/` unless a temporary path was requested.
- Compare against approved app screenshots or design references when available.
- Report only observable visual issues with concrete evidence.
- Prepare a frontend handoff prompt when issues are found.

Default issue categories:
- layout break
- overlap or clipping
- overflow
- spacing inconsistency
- control misalignment
- off-center labels
- icon and text misalignment
- responsive failure
- broken empty, loading, or error state
- missing or distorted visual asset
