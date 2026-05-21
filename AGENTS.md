# Agent Workspace Guide

## Purpose
This repository is a single Next.js application for content creation and account management workflows.

Current repo responsibilities include:
- Next.js 16 App Router UI and server routes
- React 19 and TypeScript application code
- Prisma-backed PostgreSQL persistence
- Cookie-based authentication and account/admin flows
- PDF, image, and video generation helpers
- Docker-based local and production-style startup

## Agent metadata location
Keep this `AGENTS.md` at the repository root as the main entrypoint for agent tooling.

Store repo-specific skills under `.agents/skills/`.
Keep supporting agent material under `.agents/agents/` and `.agents/research/` when needed.

## Actual repo shape
Do not assume the default polyglot monorepo layout. This repo is currently centered around one web app.

Important top-level paths:
- `app/` Next.js App Router pages, layouts, route handlers, and app-local UI helpers
- `lib/` shared server and domain utilities such as auth, env defaults, Prisma access, and admin access rules
- `prisma/` Prisma schema and checked-in migrations
- `public/` static assets and CSS used by rendered templates and media output
- `scripts/` local container helper scripts
- `tests/` test fixtures and future automated coverage assets
- `.agents/` agent skills, agent notes, and research material
- `docker-compose.yml` production-style local stack
- `docker-compose.dev.yml` bind-mounted development stack

Relevant route areas inside `app/`:
- `app/account/` authenticated account area
- `app/api/auth/` login, logout, and registration handlers
- `app/api/account/` authenticated account APIs
- `app/api/admin/` admin-only user management APIs
- `app/api/pdf/` PDF generation endpoint
- `app/api/video/` cover and final video generation endpoints
- `app/instagram/`, `app/linkedin/`, and account template routes for social content flows

## Current stack defaults
- Framework: Next.js App Router, React, TypeScript
- Styling: global CSS plus Tailwind CSS 4 tooling where appropriate
- Data layer: Prisma with PostgreSQL
- Auth: cookie-based session flow implemented in app code
- Media/tooling: Puppeteer, FFmpeg/FFprobe, HTML-to-image, HTML2Canvas
- Package manager: npm with `package-lock.json`
- Runtime: Node.js in local dev and Docker containers

## Working rules for this repo
- Prefer extending the existing Next.js App Router structure instead of introducing a separate backend service.
- Keep route handlers in `app/api/**/route.ts` unless there is a clear existing abstraction to reuse.
- Reuse shared helpers in `lib/` before creating new one-off utility modules.
- Treat Prisma schema and migrations as the source of truth for persistence changes.
- Preserve the current cookie-session approach unless the user explicitly requests an auth redesign.
- Keep media-generation changes compatible with the Docker environment, including Chromium and FFmpeg paths already wired through compose.
- Favor small, feature-local components inside `app/components/` or the relevant route folder before introducing broad abstractions.
- Keep static rendering assets in `public/` when server-side generation depends on stable file paths.

## Local workflow defaults
Prefer the smallest command set that proves the change.

Common commands:
- `npm run dev`
- `npm run build`
- `npm run lint`
- `docker compose up`
- `docker compose -f docker-compose.dev.yml up`
- `npx prisma migrate deploy`
- `npx prisma generate`

Environment and data notes:
- Database configuration is driven by `DATABASE_URL` and the Postgres variables used in the compose files.
- The repo includes `.env.example` as the starting point for local setup.
- `lib/env.ts` contains the default local database URL fallback used by the app.

## Skill routing
Use the minimal set of skills that fits the task. Announce the skill names briefly when you use them.

- Use `stack-orchestrator` for repo-wide planning or work that spans app routes, data, infra, and tests.
- Use `vue3-frontend-builder` only if the user explicitly asks for Vue work elsewhere; do not assume it applies to this repo.
- Use `go-backend-builder` only if the user is intentionally adding a separate Go service; do not default to it here.
- Use `internal-docs-builder` for updates to repo guidance, engineering docs, and agent-facing instructions.
- Use `test-automation-builder` when adding or improving automated checks for this app.
- Use `e2e-flow-tester` when the user wants Playwright-style coverage or route-flow discovery for the web app.
- Use `web-visual-tester` when UI changes need browser validation or screenshot evidence.
- Use `frontend-architecture` for route organization, component boundaries, rendering strategy, or state ownership decisions in the Next.js app.
- Use `backend-architecture` for Prisma, data access, route-handler boundaries, auth, or service extraction decisions.
- Use `devops-infrastructure-builder` for Docker, container workflow, CI, deployment, or environment automation changes.
- Use `change-validator` when the user wants explicit proof that a change satisfies the request.
- Use the UX, research, and Penpot skills only when the task clearly calls for them.

## Shared defaults
- Prefer changes that fit the current single-app architecture before proposing a larger repo restructure.
- Default web implementation style: Next.js App Router with server-first behavior where it simplifies data and auth flows.
- Default database style: Prisma schema changes paired with explicit checked-in migrations.
- Default validation posture: run the smallest meaningful proof set and state what remains unverified.
- Prefer explicit environment variables, file paths, and route ownership over implicit conventions.

## Delivery rules
- Keep changes aligned with the actual repo structure, not the generic monorepo template.
- Validate changes against the user request, not only generic quality checks.
- After finishing a related set of changes, create a git commit that groups those related changes together.
- Use a descriptive commit message that explains the intent of the grouped change.
- Do not create extra README-like files inside skill folders unless the user explicitly asks for them.
