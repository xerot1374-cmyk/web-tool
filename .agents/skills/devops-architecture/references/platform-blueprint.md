# DevOps architecture baseline

Platform layers:
- Local development platform
- CI validation platform
- Deployment platform
- Observability and operations platform

Rules:
- Keep environment differences explicit.
- Treat secrets, artifacts, and configuration flows as first-class architecture decisions.
- Prefer immutable deployments and repeatable rollback paths.
- Define what runs in app code, containers, CI, and cloud separately.
- Keep environment-specific values out of hardcoded architecture examples; document them in `.env.example` and load them from env files in each environment.
