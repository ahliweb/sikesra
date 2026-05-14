# SIKESRA Document Workflow

The SIKESRA document workflow is restored as repo-local overlay code in `packages/plugins/sikesra/src/document.ts`.

Included now:

1. Upload validation for MIME type, classification, and file size
2. Upload metadata shell creation and completion flow
3. Entity-linked document listing with masked metadata by default
4. Highly restricted download reason enforcement
5. Verification, rejection, and replacement workflow
6. Audit entries for upload, completion, download, verification, and replacement
7. Versioned plugin routes under `/_emdash/api/plugins/sikesra/v1/documents/*`

## Delivery Model

The restored overlay stores document metadata in plugin storage and binary content as base64 in plugin KV, so the workflow stays repo-local and avoids leaking raw storage keys through normal API output.

## Verification

- `pnpm --filter @ahliweb/plugin-sikesra test`
- `pnpm --filter @ahliweb/plugin-sikesra typecheck`

This restores the document metadata and access lifecycle outside EmDash core while keeping any future host-specific adapter work repo-local.
