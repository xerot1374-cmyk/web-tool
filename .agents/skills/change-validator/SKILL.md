---
name: change-validator
description: Validate whether changes produced by other skills actually satisfy the user's request by turning prompt requirements into concrete checks, commands, and acceptance criteria. Use when Codex needs to verify code or configuration changes, decide what should be run, report what was proven versus assumed, or define validation steps that other implementation skills should follow.
---

# Change Validator

Use this skill after implementation work, or when the user explicitly asks how to verify that generated changes adhere to the requested prompt.

## Use this skill when
- The user asks whether a change is complete or correct.
- The user asks what should be run or checked before calling the task done.
- Another skill produced changes and needs a validation handoff.
- The request includes explicit acceptance criteria that need proof.
- You need to distinguish between "implemented", "tested", and "verified against the prompt".

## Validation workflow
- Restate the requested outcome before validating anything.
- Break the prompt into verifiable requirements.
- Separate required proof into:
  - prompt-specific checks
  - stack safety checks
  - optional confidence checks
- Map each requirement to one or more validation methods:
  - static inspection
  - unit or integration tests
  - build or typecheck
  - lint or formatting checks
  - runtime smoke test
  - manual review points when automation is not available
- Run or recommend the smallest set of checks that can prove the request.
- Report what passed, what failed, what was not run, and what remains unverified.

## Validation rules
- Validate against the user request, not only against generic code quality.
- Prefer checks that directly prove the requested behavior.
- Do not claim validation for anything that was not actually checked.
- When commands cannot be run, say so clearly and provide the exact next checks to run.
- Distinguish between "test coverage exists" and "the prompt requirement is satisfied".
- Record environmental blockers such as missing dependencies, unavailable services, or missing credentials.

## Output format
Produce validation results with these sections:

```markdown
## Requested Outcome
## Validation Targets
## Checks Run
## Results
## Unverified Areas
## Recommended Next Checks
```

For each check, use this structure:

```markdown
- Check: <name>
  Why: <requirement it proves>
  Method: <command, inspection, or manual verification>
  Result: <passed | failed | not run | blocked>
```

## Cross-skill handoff
- Accept implementation context from builder, architecture, orchestration, or intake skills.
- Validate the minimum repo-safe checks even when the upstream skill did not ask for them explicitly.
- Recommend `test-automation-builder` when validation reveals missing automated coverage.
- Recommend `devops-infrastructure-builder` when runtime, CI, or environment validation is missing.
- Recommend `stack-orchestrator` when validation reveals cross-stack gaps rather than local issues.

## Stack defaults
- Go backend: validate targeted `go test`, build or command wiring, migration expectations, and configuration shape.
- Vue frontend: validate typechecking, unit or component coverage where relevant, and user-flow behavior for changed views.
- Expo mobile: validate route or screen behavior, TypeScript health, and mobile-specific feature constraints where feasible.
- Devops or infra: validate Compose, workflow syntax, environment assumptions, and deployment-path consistency.
- Cross-stack: validate contract alignment, environment naming consistency, and requested E2E or smoke coverage.

## References
- Read `references/validation-matrix.md` for repo-specific validation targets by stack area.
- Read `references/output-template.md` for the canonical reporting structure and examples.
- Read `references/adherence-rules.md` for how to connect prompt wording to proof obligations.
