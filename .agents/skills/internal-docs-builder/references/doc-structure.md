# Internal doc structure

Default locations:
- `docs/internal/engineering-overview/` for repo or subsystem orientation docs
- `docs/internal/runbooks/` for operational and recurring task procedures
- `docs/internal/adr/` for architecture decision records
- `AGENTS.md` for repo-wide agent operating guidance
- `.agents/skills/<skill-name>/` for skill-local agent instructions

Placement rules:
- Update the smallest existing doc that fits before adding a new file.
- Create a new doc only when the topic is new or the existing doc would become unclear.
- Keep internal docs separate from user-facing and API/reference docs by default.
