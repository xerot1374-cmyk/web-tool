# Monorepo blueprint

Preferred structure:

```text
backend/
  cmd/
  internal/
  migrations/
frontend-web/
  src/
mobile/
  app/
infra/
  docker/
  terraform/
tests/
  contract/
  e2e/
.github/workflows/
```

Bootstrapping order:
1. Define architecture boundaries and repo layout.
2. Scaffold backend contracts and persistence.
3. Scaffold web and mobile clients against stable API contracts.
4. Add Docker and environment automation.
5. Add unit, integration, contract, and Playwright tests.

Cross-stack rules:
- Keep API contracts versioned and explicit.
- Reuse env var names across local, CI, and deployment targets.
- Keep test fixtures and seeded data deterministic.
- Prefer one source of truth for auth claims, IDs, and shared enums.
