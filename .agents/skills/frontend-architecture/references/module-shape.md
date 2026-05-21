# Frontend architecture baseline

Apply this to both Vue web and Expo mobile unless a platform-specific reason overrides it.

Layers:
- Route/screen
- Feature module
- Shared UI component
- Service/API adapter
- State/session

Rules:
- Put business behavior in modules, not only in route files.
- Keep state ownership obvious.
- Avoid circular dependencies between modules.
- Centralize auth/session and API error handling.
