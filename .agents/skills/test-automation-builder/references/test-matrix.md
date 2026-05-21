# Test matrix

Default matrix:
- Backend unit tests: Go `testing`
- Backend integration tests: real database and service dependencies when practical
- Web unit/component tests: Vitest
- Mobile unit tests: Jest
- API automation: HTTP-level integration and contract tests
- End-to-end tests: Playwright

Pipeline order:
1. Lint and static checks
2. Fast unit tests
3. Integration and contract tests
4. Build artifacts
5. Playwright end-to-end tests

Rules:
- Keep Playwright focused on critical flows, not exhaustive UI details.
- Prefer deterministic test data and seeded environments.
- Fail fast on contract mismatches between backend and clients.
