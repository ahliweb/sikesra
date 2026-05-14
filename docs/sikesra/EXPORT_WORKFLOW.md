# SIKESRA Export Workflow

The SIKESRA export/report job flow is restored as repo-local overlay code in `packages/plugins/sikesra/src/export.ts`.

Included now:

1. Report catalog with required permissions and reason requirements
2. Export job creation and tenant/site scoping
3. Generation of stored CSV export content through plugin KV and storage
4. Download metadata without leaking internal storage keys
5. Audit entries for create, restricted create, and download events
6. Versioned plugin routes under `/_emdash/api/plugins/sikesra/v1/exports/*`

## Route Boundary Note

The package exports the versioned routes directly, but the strongest permission checks live in the service layer’s trusted request context. When a host wants caller-specific permission derivation beyond the standard authenticated plugin route baseline, it should wrap these services in a repo-local trusted adapter rather than move logic into EmDash core.

## Verification

- `pnpm --filter @ahliweb/plugin-sikesra test`
- `pnpm --filter @ahliweb/plugin-sikesra typecheck`

This keeps the workflow outside EmDash core while restoring the report catalog, job lifecycle, restricted-reason handling, and audit trail.
