---
name: devops-infrastructure-builder
description: Design and implement infrastructure and delivery automation for this monorepo, including Docker-first local development, containerization, Compose workflows, CI/CD pipelines, environment configuration, and Terraform planning for AWS or cloud-agnostic deployments. Use when Codex needs to work in `infra/`, `.github/workflows/`, container configs, deployment pipelines, or platform automation.
---

# Devops Infrastructure Builder

Use this skill for provisioning and delivery automation work.

## Defaults
- Start with Docker-first local and CI workflows.
- Default to a multi-environment Docker Compose setup that supports `dev`, `staging`, and `prod`.
- When an existing repo lacks that shape or uses a weak environment setup, refactor it toward the default instead of preserving the status quo.
- Treat CI/CD as part of infrastructure scope.
- Keep Terraform available as an optional provider track.
- Prefer explicit environment promotion and artifact flow over hidden deployment logic.
- Treat environment files as the default source for runtime and deployment values.
- Commit a checked-in `.env.example` and keep runnable environment files such as `.env.dev`, `.env.staging`, `.env.prod`, and `.env.test` out of git.
- Include a test environment and a dedicated test container path when browser or end-to-end automation is part of the stack.

## Intake behavior
- Start with a short intake when the environment model, deployment flow, or current repo state is unclear.
- Ask exactly one substantive question per turn unless the user explicitly asks for grouped questions.
- Confirm the smallest missing set of details needed to act, including:
  - whether the task is greenfield setup, refactor, or CI/CD alignment
  - the target environments and promotion path
  - whether browser or end-to-end testing must run in containers
  - deployment or hosting constraints that affect Compose, CI, or Terraform
- If the user explicitly wants broader discovery, requirement shaping, or prompt preparation before implementation, hand off to `intake-orchestrator`.

## Workflow
- Read `references/docker-first.md` for the baseline path.
- Load `references/aws-terraform.md` when the user wants AWS-specific provisioning.
- Load `references/cloud-agnostic-terraform.md` when the user wants Terraform patterns without cloud lock-in.
- Load `devops-architecture` when the task is mainly about environment design, platform boundaries, observability posture, or deployment topology.
- Load `test-automation-builder` when pipeline design must reflect automated validation and Playwright stages.
- Load `internal-docs-builder` when infrastructure changes affect setup, operations, recovery steps, contributor workflow, or agent guidance.
- After finishing a coherent infrastructure or delivery change, create a descriptive git commit that groups the related platform work together.

## Implementation rules
- Keep local, CI, and deployment runtime assumptions aligned.
- Make `dev`, `staging`, `prod`, and `test` environment usage explicit across Compose, scripts, CI, and deployment automation when those environments are in scope.
- Prefer a Compose layout and command flow that makes environment selection obvious instead of hiding it behind undocumented script behavior.
- Define secrets, config, image builds, and rollout steps explicitly.
- Do not hardcode ports, hosts, image tags, bucket names, regions, credentials, URLs, feature flags, or similar environment-sensitive values in Compose, CI, Terraform, scripts, or examples.
- Put environment-sensitive values in env files and include a checked-in `.env.example` that documents every required variable with safe placeholder values.
- Keep `.env.example` synchronized with the actual variables referenced by infrastructure code and automation.
- Do not commit runnable environment files such as `.env.dev`, `.env.staging`, `.env.prod`, or `.env.test`.
- When refactoring an existing setup, update related CI/CD and deployment automation so the defined environments are used consistently end to end.
- Provide a dedicated test container and environment path for Playwright or other browser automation unless the user explicitly asks for a different approach.
- Prefer reusable CI workflow structure over one-off scripts.
- Keep Terraform modules reusable and environment composition readable.
- Treat rollback and failure visibility as design concerns, not cleanup tasks.
- Create or update internal docs and runbooks when meaningful infrastructure changes affect setup, deployment, troubleshooting, or operational recovery, and create missing docs when none exist.

## References
- `references/docker-first.md`
- `references/aws-terraform.md`
- `references/cloud-agnostic-terraform.md`
