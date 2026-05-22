# SIKESRA Import Workflow

The SIKESRA import staging and promotion flow is restored as repo-local overlay code in `packages/plugins/sikesra/src/import.ts`.

Included now:

1. Import batch creation
2. CSV row staging into isolated import-row storage
3. Mapping and validation pass for staged rows
4. Duplicate-review gating for repeated mapped identity signatures
5. Promotion into isolated promoted-entity storage
6. Rollback of promoted rows
7. Audit entries for create, map, validate, and promote lifecycle steps
8. Versioned plugin routes under `/_emdash/api/plugins/sikesra/v1/imports/*`

## Scope Note

The restored overlay focuses on the staging, validation, promotion, and rollback lifecycle. It keeps the workflow outside EmDash core and makes later host-specific ingestion adapters repo-local as well.

## Verification

- `pnpm --filter @ahliweb/plugin-sikesra test`
- `pnpm --filter @ahliweb/plugin-sikesra typecheck`

This restores the import workflow as an isolated plugin overlay without reintroducing business logic into EmDash core packages.
