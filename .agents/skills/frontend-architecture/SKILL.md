---
name: frontend-architecture
description: Define and refine frontend architecture for the Vue 3 web app and Expo mobile app in this monorepo, including module boundaries, routing or navigation shape, state ownership, API adapter design, design-system layering, and shared client patterns. Use when Codex needs to reason about frontend structure before or during implementation.
---

# Frontend Architecture

Use this skill when the challenge is how the client applications should be organized, not only what screen or component to build.

## Core concerns
- Feature module boundaries
- Route and screen composition
- Shared UI versus app-specific UI
- State ownership and session management
- API adapter and error-handling patterns
- Web/mobile consistency without forcing identical implementations

## Guidance
- Organize around business features rather than giant shared folders.
- Keep route and screen files thin.
- Separate server state, session state, and ephemeral UI state.
- Make shared abstractions earn their existence across web and mobile.
- Centralize auth, API clients, and retry/error handling.

## Reference
- Read `references/module-shape.md` when designing feature modules or shared client layers.
