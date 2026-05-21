# Output template

Use this structure for validation reports:

```markdown
## Requested Outcome
<what the prompt asked for>

## Validation Targets
- <requirement 1>
- <requirement 2>

## Checks Run
- Check: <name>
  Why: <requirement it proves>
  Method: <command or inspection>
  Result: <passed | failed | not run | blocked>

## Results
- <high-signal finding>

## Unverified Areas
- <anything not proven>

## Recommended Next Checks
- <next command or review step>
```

## Example

```markdown
## Requested Outcome
Add JWT auth to the Go backend and expose login and refresh flows.

## Validation Targets
- login route exists
- refresh flow exists
- auth wiring follows repo defaults
- changes are covered by meaningful checks

## Checks Run
- Check: backend unit tests
  Why: prove auth service logic still passes
  Method: `go test ./internal/service/...`
  Result: passed

- Check: route wiring review
  Why: prove requested endpoints exist
  Method: inspect Echo route registration and handler wiring
  Result: passed

- Check: refresh flow runtime proof
  Why: prove the request works end to end
  Method: not run
  Result: not run

## Results
- The service and route wiring for login and refresh are present.
- Automated proof exists for service behavior.

## Unverified Areas
- No end-to-end proof of token refresh behavior was run.

## Recommended Next Checks
- Run an HTTP-level integration test for login and refresh.
```
