# SIKESRA Development Documentation

SIKESRA, or Sistem Informasi Kesejahteraan Rakyat, is planned as a native AWCMS-Micro and EmDash-compatible module for welfare, religious, institutional, vulnerable-person, document, verification, import, report, and public aggregate data workflows.

This folder is the canonical implementation documentation set. It replaces earlier overlapping drafts with a non-duplicated structure: each document owns one topic and links to the other documents instead of repeating them.

## Reading Order

| Order | Document | Use It For |
|---:|---|---|
| 1 | [01_product_requirements.md](01_product_requirements.md) | Product scope, personas, MVP requirements, acceptance criteria. |
| 2 | [02_architecture.md](02_architecture.md) | Module architecture, route boundaries, service layers, deployment model. |
| 3 | [03_data_model.md](03_data_model.md) | D1 schema, table groups, required fields, data dictionary rules. |
| 4 | [04_api_contracts.md](04_api_contracts.md) | API envelope, endpoint list, request/response contracts. |
| 5 | [05_ui_ux.md](05_ui_ux.md) | Public/admin screens, wizard, verification, import, documents, reports. |
| 6 | [06_security_rbac_abac.md](06_security_rbac_abac.md) | Roles, permissions, ABAC, masking, public-data safety, audit controls. |
| 7 | [07_operations_sop.md](07_operations_sop.md) | Operational procedures for input, validation, verification, publication, export, audit. |
| 8 | [08_implementation_backlog.md](08_implementation_backlog.md) | Atomic implementation backlog suitable for GitHub issues or AI coding agents. |
| 9 | [09_12_week_mvp_plan.md](09_12_week_mvp_plan.md) | Week-by-week MVP delivery plan and release gates. |
| 10 | [10_validation_checklist.md](10_validation_checklist.md) | Final validation checklist for implementation readiness. |
| 11 | [11_ai_implementation_handoff.md](11_ai_implementation_handoff.md) | Limited-context handoff guide for junior programmers and AI coding agents. |

## Source Attachments

Source attachments may be stored in this folder when they support future mapping work. They are not part of the canonical SIKESRA module specification unless a future issue explicitly maps their formulas or fields into the SIKESRA data model.

## Non-Negotiable Implementation Rules

1. SIKESRA must be implemented as an EmDash/AWCMS-Micro plugin or module named `sikesra`.
2. Do not fork or rewrite EmDash core. If an extension point is missing, document the smallest required platform adapter before implementing SIKESRA business logic.
3. Admin routes must live under `/_emdash/admin/plugins/sikesra/*`.
4. Admin API routes must live under `/_emdash/api/plugins/sikesra/v1/*`.
5. The public page must live at `/sikesra` and must only display aggregate-safe data.
6. Cloudflare D1 is the MVP database. SQL must be D1-compatible and PostgreSQL-friendly.
7. Cloudflare R2 stores files. D1 stores file metadata, access classification, checksum, and verification state.
8. All SIKESRA physical tables must use the `awcms_sikesra_` prefix.
9. Business tables must include `tenant_id`, `site_id`, timestamps, `deleted_at`, `created_by`, and `updated_by` unless a documented exception exists.
10. All main records must support `sikesra_id_20` using `[kode_desa_kel_10][jenis_2][subjenis_2][sequence_6]`.
11. RBAC and ABAC must be enforced server-side. Hidden UI controls are not security.
12. Sensitive values must be masked or omitted by backend serializers before JSON leaves the server.
13. Excel import must go through upload, staging, mapping, validation, duplicate review, and explicit promotion.
14. Public output must not expose NIK/KIA, hashes, protected names, exact addresses, individual desil, disability details, document links, or small-cell aggregates.
15. Verification, document access, restricted exports, import promotion, duplicate overrides, ID generation/correction, policy changes, and settings changes must be audited.

## Implementation Handoff

Start with `08_implementation_backlog.md` and `11_ai_implementation_handoff.md`. Every implementation ticket should include:

1. Exact files to create or edit after repository discovery.
2. Relevant documentation sections to read first.
3. Security and privacy rules that must not be violated.
4. Tests or manual checks required before completion.
5. Confirmation that no unrelated EmDash core change was made.
