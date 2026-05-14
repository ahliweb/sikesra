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

The restored permission, ABAC, masking, and audit overlay is documented in `docs/sikesra/SECURITY_OVERLAY.md`.

The restored export/report job workflow is documented in `docs/sikesra/EXPORT_WORKFLOW.md`.

The restored document metadata and access workflow is documented in `docs/sikesra/DOCUMENT_WORKFLOW.md`.

The restored import staging and promotion workflow is documented in `docs/sikesra/IMPORT_WORKFLOW.md`.
