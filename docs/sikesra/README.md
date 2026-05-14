# SIKESRA Docs

The restored shell lives in `packages/plugins/sikesra`.

Current route boundaries:

- Public page target: `/sikesra`
- Admin pages: `/_emdash/admin/plugins/sikesra/*`
- Public-safe API: `/_emdash/api/plugins/sikesra/public/*`
- Versioned admin/data API target: `/_emdash/api/plugins/sikesra/v1/*`

The shell intentionally ships placeholder aggregate-safe responses first so the repo can rebuild each higher-risk concern atomically:

1. D1 schema and seed replay
2. Public and admin surfaces
3. RBAC, ABAC, masking, and audit
4. Operational workflows
5. Deployment bindings and Cloudflare overlay

Schema and seed replay now use the repo-local helper documented in `docs/sikesra/D1_RESTORE.md`.

Deployment bindings, wrapper, and smoke verification are documented in `docs/sikesra/DEPLOYMENT.md`.

Current repo-local operating procedures and remaining workflow gaps are documented in `docs/sikesra/OPERATIONS.md`.
