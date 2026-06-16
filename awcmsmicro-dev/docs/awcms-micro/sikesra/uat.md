# UAT (ARCHIVED — see `README.md` in this directory)

> Superseded by `docs/prd/06.UAT_AND_DEPLOYMENT_CHECKLIST.md`. References `packages/plugins/sikesra/tests/`, a path that doesn't exist — kept only as historical record.

## Minimum Acceptance Areas

- public `/sikesra` does not expose sensitive personal data
- admin routes require authentication
- missing permission denies access
- cross-region access is denied
- autosave, validation, ID generation, verification, document, import, export, and dashboard flows work inside scope

## Current Test Sources

- `packages/plugins/sikesra/tests/`
- root validation commands in `package.json`

Formal UAT scripts and operator sign-off still need a dedicated follow-up issue.
