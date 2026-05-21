# Docker-first baseline

Default local platform:
- One `docker-compose.yml` or Compose file set for app dependencies and local runtime
- Separate service definitions for backend, frontend-web, mobile support services, database, and test helpers when needed
- `.env.example` files kept explicit and minimal
- All service-level values that may change by environment should come from env files rather than inline literals in Compose or helper scripts

CI/CD expectations:
- Build backend and frontend images in CI
- Run automated tests before publish/deploy stages
- Promote immutable artifacts across environments where possible
- Load environment-specific values from env files or CI secret stores that mirror the variables documented in `.env.example`

Repository layout:

```text
infra/
  docker/
  scripts/
.github/workflows/
.env.example
```
