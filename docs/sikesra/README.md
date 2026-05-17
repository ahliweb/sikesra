# SIKESRA Documentation

Sistem Informasi Kesejahteraan Rakyat — native AWCMS-Micro / EmDash-compatible plugin for welfare, religious, institutional, vulnerable-person, document, verification, import, report, and public aggregate data workflows.

## Specification Docs (Reading Order)

| Order | Document                                                           | Use For                                                                 |
| ----- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 1     | [01_product_requirements.md](01_product_requirements.md)           | Product scope, personas, MVP, acceptance criteria                       |
| 2     | [02_architecture.md](02_architecture.md)                           | Module architecture, route boundaries, service layers                   |
| 3     | [03_data_model.md](03_data_model.md)                               | D1 schema, 34 tables, data dictionary rules                             |
| 4     | [04_api_contracts.md](04_api_contracts.md)                         | API envelope, endpoints, request/response contracts                     |
| 5     | [05_ui_ux.md](05_ui_ux.md)                                         | Public/admin screens, wizard, verification, import, documents           |
| 6     | [06_security_rbac_abac.md](06_security_rbac_abac.md)               | Roles, permissions, ABAC, masking, public-data safety                   |
| 7     | [07_operations_sop.md](07_operations_sop.md)                       | Operational procedures for input, validation, verification, publication |
| 8     | [08_implementation_backlog.md](08_implementation_backlog.md)       | Atomic implementation backlog for GitHub issues / AI agents             |
| 9     | [09_12_week_mvp_plan.md](09_12_week_mvp_plan.md)                   | Week-by-week MVP delivery plan and release gates                        |
| 10    | [10_validation_checklist.md](10_validation_checklist.md)           | Final validation checklist for implementation readiness                 |
| 11    | [11_ai_implementation_handoff.md](11_ai_implementation_handoff.md) | Handoff guide for junior programmers and AI coding agents               |

Additional planning docs: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), [IMPLEMENTATION_DECISIONS.md](IMPLEMENTATION_DECISIONS.md), [operator-workflow.md](operator-workflow.md).

## Implementation Status

[**SIKESRA_INTEGRATION_OVERLAY.md**](SIKESRA_INTEGRATION_OVERLAY.md) — Living document tracking what's implemented vs placeholder vs not started.

### Fully Implemented

- Plugin descriptor with admin pages (`/`, `/entities`, `/verification`, `/audit`, `/settings`, `/operations`) and widget (`overview`)
- 30 route handlers in `sandbox-entry.ts`
- Schema-backed draft create/update/autosave for all 8 MVP detail modules, writing to the real `awcms_sikesra_*_details` tables
- Archive/restore backend routes with permission checks, reason+confirmation enforcement, audit, and archived-record exclusion from normal dashboard/verification flows
- Block-based admin entity workflow for create draft, section edit, validation, code generation, submit, archive, and restore
- Operator-friendly module metadata for all 8 MVP data modules, including readable create flow options, registry module filters, and readable detail field labels
- Duplicate preview/warnings on entity detail and validation views using `awcms_sikesra_duplicate_candidates`
- Document step in the entity workflow with D1-backed document metadata registration and listing
- Wizard progress navigation and review/submit summary on the entity workflow
- Plugin manager integration in the active Cloudflare deployment, including live listing of `sikesra`
- Document workflow (upload, complete, list, download, verify, replace, audit)
- Import workflow (CSV parse, batch, stage, map, validate, promote, rollback, duplicate detection)
- Export workflow (3 report types, job lifecycle, CSV generation, permission filtering)
- Security: 36 permissions, ABAC engine (11 operators), PII masking, route guards, audit (28 action types)
- Storage config (6 namespaces)
- D1 schema backup (34 `awcms_sikesra_*` tables in `update-backup/d1/`)
- Infrastructure (worker wrapper, wrangler config, postbuild script)
- Cloudflare host integration at `demos/cloudflare/`
- Tests (10 test files, including detail CRUD and admin workflow coverage)

### Placeholder

- `v1/status` — still returns `{ status: "rebuild-pending" }`
- Operations subpages (`documents`, `imports`, `reports`) — dedicated subpages now expose document, import, and report surfaces
- Request context — trusted plugin request context is injected, but tenant/site/role mapping still uses fallback defaults when richer host context is unavailable

### Not Started

- React admin components (zero `.tsx` files)
- Import/Export workflow UI
- Dashboard charts/visualizations
- Verification review UI beyond the current Block Kit queue/review shell
- Document management UI beyond the current operations shell

## Operational Runbooks

| Document                                     | Covers                                                  |
| -------------------------------------------- | ------------------------------------------------------- |
| [D1_RESTORE.md](D1_RESTORE.md)               | Inventory and restore backup to D1                      |
| [DEPLOYMENT.md](DEPLOYMENT.md)               | Cloudflare bindings, postbuild adapter, smoke check     |
| [OPERATIONS.md](OPERATIONS.md)               | Operational path, open workflows, safe operating model  |
| [SECURITY_OVERLAY.md](SECURITY_OVERLAY.md)   | Permission catalog, ABAC, masking, audit                |
| [DOCUMENT_WORKFLOW.md](DOCUMENT_WORKFLOW.md) | Document upload, classification, download, verification |
| [IMPORT_WORKFLOW.md](IMPORT_WORKFLOW.md)     | Import staging, validation, promotion, rollback         |
| [EXPORT_WORKFLOW.md](EXPORT_WORKFLOW.md)     | Export/report job lifecycle, CSV generation             |

## Route Boundaries

- Public page: `/sikesra`
- Admin pages: `/_emdash/admin/plugins/sikesra/*`
- Public-safe API: `/_emdash/api/plugins/sikesra/public/*`
- Versioned API: `/_emdash/api/plugins/sikesra/v1/*`

## Current Live Notes

- The active deployed host is the Cloudflare demo/worker path, not only `demos/plugins-demo/`.
- The plugin list endpoint now includes `sikesra` in production.
- The registry/detail services now read module-specific detail rows from the dedicated 8-table schema, and draft writes no longer depend on the removed `awcms_sikesra_entity_details` shape.

## Non-Negotiable Rules

1. Implemented as EmDash/AWCMS-Micro plugin named `sikesra` — no core forks
2. Admin routes under `/_emdash/admin/plugins/sikesra/*`
3. API routes under `/_emdash/api/plugins/sikesra/v1/*`
4. Public page at `/sikesra` — aggregate-safe data only
5. D1 is MVP database; R2 stores files; D1 stores metadata
6. All physical tables use `awcms_sikesra_*` prefix
7. Business tables include `tenant_id`, `site_id`, timestamps, `deleted_at`, `created_by`, `updated_by`
8. `sikesra_id_20` format: `[kode_desa_kel_10][jenis_2][subjenis_2][sequence_6]`
9. RBAC/ABAC enforced server-side
10. Sensitive values masked by backend serializers
11. Excel import goes through staging → mapping → validation → duplicate review → promotion
12. Public output must not expose NIK/KIA, hashes, protected names, exact addresses, individual details, or small-cell aggregates
13. Verification, document access, exports, import promotion, ID changes, policy changes, and settings must be audited
