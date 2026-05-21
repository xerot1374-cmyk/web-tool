# Validation matrix

## Goal
Turn implementation work into a concrete validation plan that proves whether the output matches the prompt.

## By stack area

### Go backend
- Inspect changed packages and entrypoints
- Run targeted `go test` for touched packages or broader suites when needed
- Confirm Echo routes, Cobra commands, GORM usage, and migration expectations when relevant
- Check logging, config validation, and startup wiring if the prompt touched them

### Vue 3 frontend
- Inspect changed modules, routes, stores, and service adapters
- Run typecheck, targeted unit tests, and browser-facing checks where relevant
- Validate the changed user flow rather than only component existence

### Expo React Native
- Inspect changed routes, screens, services, and hooks
- Run TypeScript or unit-level checks where available
- Validate mobile-specific assumptions and note anything that requires device or emulator confirmation

### Devops and infrastructure
- Inspect Compose, workflow, Docker, and Terraform changes
- Run syntax or config validation commands when available
- Confirm that the requested environment path and deployment assumptions are still coherent

### Testing and E2E
- Confirm whether requested tests were added or updated
- Check that tests actually target the requested behavior
- Prefer a narrow but meaningful Playwright or integration proof over broad but irrelevant test execution

## Minimum validation mindset
- prompt adherence first
- repo safety second
- extra confidence checks only when they add real signal
