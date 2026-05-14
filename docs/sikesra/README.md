# SIKESRA Documentation

Sistem Informasi Kesejahteraan Rakyat — native AWCMS-Micro / EmDash-compatible plugin for welfare, religious, institutional, vulnerable-person, document, verification, import, report, and public aggregate data workflows.

## Specification Docs (Reading Order)

| Order | Document | Use For |
|-------|----------|---------|
| 1 | [01_product_requirements.md](01_product_requirements.md) | Product scope, personas, MVP, acceptance criteria |
| 2 | [02_architecture.md](02_architecture.md) | Module architecture, route boundaries, service layers |
| 3 | [03_data_model.md](03_data_model.md) | D1 schema, 34 tables, data dictionary rules |
| 4 | [04_api_contracts.md](04_api_contracts.md) | API envelope, endpoints, request/response contracts |
| 5 | [05_ui_ux.md](05_ui_ux.md) | Public/admin screens, wizard, verification, import, documents |
| 6 | [06_security_rbac_abac.md](06_security_rbac_abac.md) | Roles, permissions, ABAC, masking, public-data safety |
| 7 | [07_operations_sop.md](07_operations_sop.md) | Operational procedures for input, validation, verification, publication |
| 8 | [08_implementation_backlog.md](08_implementation_backlog.md) | Atomic implementation backlog for GitHub issues / AI agents |
| 9 | [09_12_week_mvp_plan.md](09_12_week_mvp_plan.md) | Week-by-week MVP delivery plan and release gates |
| 10 | [10_validation_checklist.md](10_validation_checklist.md) | Final validation checklist for implementation readiness |
| 11 | [11_ai_implementation_handoff.md](11_ai_implementation_handoff.md) | Handoff guide for junior programmers and AI coding agents |

Additional planning docs: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), [IMPLEMENTATION_DECISIONS.md](IMPLEMENTATION_DECISIONS.md).

## Implementation Status

[**SIKESRA_INTEGRATION_OVERLAY.md**](SIKESRA_INTEGRATION_OVERLAY.md) — Living document tracking what's implemented vs placeholder vs not started.

### Fully Implemented
- Plugin descriptor with admin pages (`/`, `/operations`) and widget (`overview`)
- 28 route handlers in `sandbox-entry.ts`
- Document workflow (upload, complete, list, download, verify, replace, audit)
- Import workflow (CSV parse, batch, stage, map, validate, promote, rollback, duplicate detection)
- Export workflow (3 report types, job lifecycle, CSV generation, permission filtering)
- Security: 36 permissions, ABAC engine (11 operators), PII masking, route guards, audit (28 action types)
- Storage config (6 namespaces)
- D1 schema backup (34 `awcms_sikesra_*` tables in `update-backup/d1/`)
- Infrastructure (worker wrapper, wrangler config, postbuild script)
- Demo integration at `demos/plugins-demo/`
- Tests (5 test files)

### Placeholder
- Public data endpoints (`public/metadata`, `public/filters`, `public/summary`) — return hardcoded empty data
- Admin UI content — static "restoration in progress" text
- `v1/status` — returns `{ status: "rebuild-pending" }`
- Request context — hardcoded test/dev bypass

### Not Started
- React admin components (zero `.tsx` files)
- Entity CRUD interfaces
- Import/Export admin UI
- Settings admin page
- Dashboard/charts
- Verification UI
- Document management UI

## Operational Runbooks

| Document | Covers |
|----------|--------|
| [D1_RESTORE.md](D1_RESTORE.md) | Inventory and restore backup to D1 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Cloudflare bindings, postbuild adapter, smoke check |
| [OPERATIONS.md](OPERATIONS.md) | Operational path, open workflows, safe operating model |
| [SECURITY_OVERLAY.md](SECURITY_OVERLAY.md) | Permission catalog, ABAC, masking, audit |
| [DOCUMENT_WORKFLOW.md](DOCUMENT_WORKFLOW.md) | Document upload, classification, download, verification |
| [IMPORT_WORKFLOW.md](IMPORT_WORKFLOW.md) | Import staging, validation, promotion, rollback |
| [EXPORT_WORKFLOW.md](EXPORT_WORKFLOW.md) | Export/report job lifecycle, CSV generation |

## Route Boundaries

- Public page: `/sikesra`
- Admin pages: `/_emdash/admin/plugins/sikesra/*`
- Public-safe API: `/_emdash/api/plugins/sikesra/public/*`
- Versioned API: `/_emdash/api/plugins/sikesra/v1/*`

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
