# AGENTS.md

This file defines repository instructions for AI agents and human implementers working on AWCMS-Micro SIKESRA.

## Role of This Repository

This repository exists to implement SIKESRA as an EmDash-compatible AWCMS-Micro plugin/module. The canonical documentation lives in `docs/core/` and `docs/sikesra/`.

Do not treat SIKESRA as a standalone app. It must integrate through EmDash/AWCMS-Micro module and plugin boundaries.

## Required Reading Order

Before editing code or creating implementation tickets, read:

1. `README.md`
2. `docs/sikesra/README.md`
3. `docs/sikesra/IMPLEMENTATION_PLAN.md`
4. `docs/sikesra/11_ai_implementation_handoff.md`
5. The specific SIKESRA document for the work area.

For platform-level decisions, also read:

1. `docs/core/README.md`
2. `docs/core/awcms_micro_emdash_compatibility_docs_part_1.md`
3. `docs/core/awcms_micro_emdash_compatibility_docs_part_4.md`
4. `docs/core/awcms_micro_emdash_compatibility_docs_part_5.md`
5. `docs/core/awcms_micro_emdash_compatibility_docs_part_14.md`

## Authority Order

When documentation or preferences conflict, follow this order:

1. Original EmDash repository and official EmDash documentation.
2. EmDash AGENTS.md and plugin conventions.
3. AWCMS-Micro core documentation in `docs/core/`.
4. SIKESRA canonical documentation in `docs/sikesra/`.
5. `docs/sikesra/IMPLEMENTATION_PLAN.md`.
6. `docs/sikesra/IMPLEMENTATION_DECISIONS.md` after it exists.
7. Local implementation preference.

After Phase 0, `IMPLEMENTATION_DECISIONS.md` is the source of truth for real repository paths and confirmed conventions.

## First Required Task

Do not implement business features before completing Phase 0:

1. Discover plugin/module registration convention.
2. Discover admin page contribution convention.
3. Discover API route convention.
4. Discover public route convention.
5. Discover D1 migration and seed convention.
6. Discover test convention and commands.
7. Discover auth/session helper.
8. Discover permission registry helper.
9. Discover audit, ABAC, and media/R2 helpers or document local fallbacks.
10. Create `docs/sikesra/IMPLEMENTATION_DECISIONS.md`.

## Non-Negotiable Development Rules

1. Do not modify EmDash core unless a ticket explicitly says Phase 0 approved a core adapter.
2. Keep SIKESRA business logic inside the `sikesra` plugin/module boundary.
3. Enforce tenant, site, soft-delete, permission, ABAC, and region scope server-side.
4. Never trust frontend-supplied tenant, site, role, permission, or region scope.
5. Never return NIK/KIA hash, raw R2 key, private document URL, or highly restricted values through normal API responses.
6. Public `/sikesra` output must be aggregate-only and must apply small-cell suppression.
7. Excel import must use staging before promotion.
8. High-risk actions must require reason where configured and must write audit events.
9. Add tests when the repository has a test convention; otherwise document manual checks.
10. Stop and ask for review if work requires changing unrelated shared services or public APIs.

## Route Boundaries

| Surface | Route | Rule |
|---|---|---|
| Public page | `/sikesra` | Aggregate-safe data only. |
| Admin UI | `/_emdash/admin/plugins/sikesra/*` | Login and permission required. |
| Admin API | `/_emdash/api/plugins/sikesra/v1/*` | Login, RBAC, ABAC, masking, audit. |

## Permission Namespace

All permissions must use:

```txt
awcms:sikesra:<resource>:<action>
```

Examples:

```txt
awcms:sikesra:dashboard:read
awcms:sikesra:entity:read
awcms:sikesra:entity:create
awcms:sikesra:verification:verify
awcms:sikesra:document:private_download
awcms:sikesra:export:restricted
awcms:sikesra:audit:read
```

## Database Rules

1. Use D1-compatible SQL and keep schemas PostgreSQL-friendly.
2. Use `TEXT` primary keys.
3. Store booleans as `INTEGER` 0 or 1.
4. Store JSON as `TEXT` and validate it in service code.
5. Avoid PostgreSQL-only features in MVP migrations.
6. Use `awcms_sikesra_` prefix for all SIKESRA physical tables.
7. Normal repository queries must filter `tenant_id`, `site_id`, and `deleted_at IS NULL`.
8. Region scope must be backend-computed and intersected with query filters.

## API Rules

Every admin API handler must follow this sequence:

1. Generate or read `requestId`.
2. Build trusted request context from session/backend state.
3. Validate path, query, and body.
4. Enforce authentication.
5. Check route-level RBAC permission.
6. Load minimal resource metadata for object-level authorization.
7. Evaluate ABAC, region scope, status, sensitivity, and action.
8. Execute service method.
9. Serialize through backend masking/safety layer.
10. Write audit event if required.
11. Return common response envelope.

## UI Rules

1. Preserve EmDash admin patterns and Kumo/semantic tokens where available.
2. Do not make hidden UI controls the only security mechanism.
3. Use backend access flags to drive action availability.
4. Public page must not import or call the admin API client.
5. Public page must be mobile-first and aggregate-safe.
6. Admin screens should prioritize desktop/tablet operator workflows and remain responsive-basic on mobile.

## Ticket Sizing

Keep implementation tickets small:

1. One migration file.
2. One seed file.
3. One focused service.
4. One endpoint group with the same resource and permission pattern.
5. One UI screen consuming an already implemented API.
6. One test file for one risk area.

Avoid tickets that combine API, service, repository, UI, and tests for unrelated workflows.

## Completion Notes

Every implementation result should list:

1. Changed files.
2. Tests or manual checks run.
3. Assumptions or blockers.
4. Confirmation that no unrelated EmDash core change was made.
5. Any documentation that must be updated.

## Commit Guidance

Use concise conventional-style messages when possible:

```txt
docs: add implementation decision log
feat: scaffold sikesra plugin shell
feat: add sikesra settings migration
fix: enforce region scope on entity list
test: add sikesra masking coverage
```

Do not commit secrets, production data, private uploads, local D1 databases, R2 credentials, Cloudflare tokens, or personal data.
