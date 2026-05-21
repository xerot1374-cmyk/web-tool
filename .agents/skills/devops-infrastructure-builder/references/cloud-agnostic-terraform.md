# Cloud-agnostic Terraform track

Use this track when the user wants Terraform patterns without locking into one provider.

Guidelines:
- Separate provider-neutral module intent from provider-specific implementation where practical.
- Use environment directories with clearly named variables and outputs.
- Keep service boundaries stable so providers can swap with minimal application changes.
- Avoid provider-specific assumptions in app runtime config unless explicitly chosen.
- Keep environment-dependent values in env files, with `.env.example` as the checked-in contract for required inputs.
