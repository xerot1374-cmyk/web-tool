---
name: devops-architecture
description: Define and refine devops and platform architecture for this monorepo, including environment topology, container boundaries, delivery pipelines, Terraform composition, secrets flow, observability posture, and operational responsibilities. Use when Codex needs to reason about platform shape before or during infrastructure implementation.
---

# Devops Architecture

Use this skill when the platform question is architectural rather than only file-level implementation.

## Core concerns
- Local, CI, staging, and production environment topology
- Container and runtime boundaries
- Artifact build, publish, and promotion flow
- Secrets and configuration management
- Observability and rollback expectations
- Terraform module and environment composition

## Guidance
- Start with Docker-first workflows and explicit environment promotion.
- Treat CI/CD as part of the platform architecture, not an afterthought.
- Keep secrets flow, artifact flow, and runtime config easy to trace.
- Require environment-sensitive values to enter the system through env files, with `.env.example` defining the expected contract.
- Avoid hardcoded operational values in architecture examples, reference layouts, or recommended automation patterns.
- Prefer reusable infrastructure patterns over environment-specific duplication.
- Define operational expectations early enough to shape infrastructure choices.

## Reference
- Read `references/platform-blueprint.md` when deciding environment boundaries and deployment flow.
