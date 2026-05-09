# 10 Validation Checklist

Use this document before implementation starts, before each phase merge, and before MVP release.

## Documentation Validation

- [ ] Documentation set has no duplicate canonical documents.
- [ ] `README.md` reading order is accurate.
- [ ] Product requirements, architecture, data model, API, UI, security, SOP, backlog, sprint plan, and validation checklist exist.
- [ ] AI and junior implementation handoff exists and is linked from `README.md`.
- [ ] Source attachments, when present, are treated only as reference artifacts.
- [ ] Parent `advance/README.md` links to the SIKESRA documentation set.

## Repository Discovery Validation

- [ ] Plugin registration convention found.
- [ ] Admin route convention found.
- [ ] API route convention found.
- [ ] Public route convention found.
- [ ] D1 migration convention found.
- [ ] Seed convention found.
- [ ] R2/media helper found or fallback documented.
- [ ] Auth/session helper found.
- [ ] Permission registry found.
- [ ] Audit service found or fallback documented.
- [ ] ABAC extension point found or fallback documented.
- [ ] Any required core extension is documented before business implementation.

## Architecture Validation

- [ ] SIKESRA is a plugin/module named `sikesra`.
- [ ] No unnecessary EmDash core changes.
- [ ] Admin UI route is `/_emdash/admin/plugins/sikesra/*`.
- [ ] API route is `/_emdash/api/plugins/sikesra/v1/*`.
- [ ] Public route is `/sikesra`.
- [ ] `module.manifest.json` declares routes, permissions, storage scopes, migrations, dependencies, and rollback behavior.
- [ ] Frontend calls typed API client only, not D1/R2 directly.

## Database Validation

- [ ] All custom tables use `awcms_sikesra_` prefix.
- [ ] Business tables include `tenant_id`, `site_id`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`.
- [ ] Normal repository queries filter tenant, site, and deleted status.
- [ ] Region-scoped queries use backend-computed scope.
- [ ] `awcms_sikesra_entities.sikesra_id_20` has uniqueness and length validation.
- [ ] Sequence table is unique per tenant/site/village/type/subtype.
- [ ] Indexes exist for list, dashboard, verification, import, document, export, and audit paths.
- [ ] Migrations run locally.
- [ ] Seeds are repeatable.

## Security Validation

- [ ] All permissions registered under `awcms:sikesra:*`.
- [ ] Every admin API has a base permission.
- [ ] Object-level operations evaluate ABAC.
- [ ] Explicit deny overrides allow.
- [ ] Cross-region access is denied or excluded.
- [ ] Public user cannot call admin detail APIs.
- [ ] Sensitive serializer masks NIK/KIA, child names, disability, desil, address, contact, guardian, document metadata.
- [ ] NIK/KIA hash is never returned.
- [ ] Raw R2 key is never returned.
- [ ] High-risk actions are audited.
- [ ] Audit before/after is redacted according to viewer permission.

## Public Page Validation

- [ ] `/sikesra` loads without login.
- [ ] Public page uses only public-safe service or loader.
- [ ] Public summary filters active, verified, non-deleted records only.
- [ ] Public output contains no names, NIK/KIA, addresses, documents, individual desil, disability detail, or protected exact coordinates.
- [ ] Small-cell suppression works.
- [ ] Public filters cannot isolate vulnerable individuals.
- [ ] Public caveat and update timestamp are visible.
- [ ] Mobile and desktop layouts are usable.

## Entity and Wizard Validation

- [ ] Draft creation works.
- [ ] Autosave saves section patches.
- [ ] Validation errors are section-aware.
- [ ] Completeness recalculates after updates.
- [ ] Required fields block submit and ID generation.
- [ ] Official and local regions are visually and technically distinct.
- [ ] Detail tables are written according to object type.
- [ ] Access flags drive UI actions.

## ID Validation

- [ ] Generated ID is exactly 20 digits.
- [ ] ID format is `[kode_desa_kel_10][jenis_2][subjenis_2][sequence_6]`.
- [ ] Missing village/type/subtype blocks generation.
- [ ] Local RT/RW changes do not change generated ID.
- [ ] Normal users cannot edit generated ID.
- [ ] ID correction requires special permission and reason.
- [ ] ID generation and correction are audited.

## Verification Validation

- [ ] Submit changes status to configured submitted level.
- [ ] Queue is filtered by verifier level and region scope.
- [ ] Verify decisions are valid for current status.
- [ ] Need revision requires note.
- [ ] Reject requires note.
- [ ] Verification event stores actor, level, action, previous status, next status, note, request metadata.
- [ ] Final verification sets record active/verified.

## Document Validation

- [ ] Upload validates MIME, extension, size, checksum, classification.
- [ ] Dangerous file types are blocked.
- [ ] Metadata is stored in D1.
- [ ] Physical file is stored in R2.
- [ ] Preview/download uses signed/proxy route.
- [ ] Raw R2 key is hidden.
- [ ] Highly restricted download requires reason where configured.
- [ ] Preview/download is audited.
- [ ] Replacement supersedes old document.

## Import Validation

- [ ] Workbook creates import batch.
- [ ] Sheet names and columns are detected.
- [ ] Mapping validates required fields.
- [ ] Raw and mapped rows are stored in staging.
- [ ] Raw staging data is protected.
- [ ] Invalid rows cannot be promoted.
- [ ] Duplicate candidates are detected.
- [ ] High-risk duplicate override requires reason.
- [ ] Promotion creates entity/detail/person/attribute/document records where applicable.
- [ ] Promoted rows are not automatically verified.
- [ ] Import events are audited.

## Export and Report Validation

- [ ] Report metadata shows field sensitivity.
- [ ] Export requires permission.
- [ ] Restricted fields require restricted export permission.
- [ ] Restricted export requires reason.
- [ ] Highly restricted individual data is excluded by default.
- [ ] Export job records filters, fields, format, reason, row count, actor, file metadata.
- [ ] Export download is authenticated and audited.
- [ ] Raw R2 keys and system-sensitive fields are not exported.

## Audit Validation

- [ ] Audit list supports date, actor, action, resource, success, risk filters.
- [ ] Audit detail shows request metadata where allowed.
- [ ] Sensitive before/after values are redacted.
- [ ] Audit export requires permission and reason.
- [ ] Audit export is audited.

## Operations Validation

- [ ] D1 backup/export procedure documented.
- [ ] R2 lifecycle/backup/retention policy documented.
- [ ] Restore test validates D1 metadata and R2 object linkage.
- [ ] Incident response contacts and escalation exist.
- [ ] Production sensitive data is not used in local development.
- [ ] Rate limits or guardrails exist for import, export, download, and sensitive reveal where supported.

## MVP Go/No-Go

Go only if:

1. All P0 tests pass.
2. Public privacy tests pass.
3. Cross-region tests pass.
4. Sensitive masking tests pass.
5. Import staging and promotion tests pass.
6. Document R2 tests pass.
7. Verification workflow tests pass.
8. Export restrictions pass.
9. Audit redaction tests pass.
10. Backup/restore test is completed.
11. Critical/high risks are treated or formally accepted.
12. Documentation matches the implementation.
