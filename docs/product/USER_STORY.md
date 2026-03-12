> **Documentation Authority**: [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) -> [AGENTS.md](../../AGENTS.md) -> [PRD.md](PRD.md)

# SIKESRA MVP User Stories

> This document aligns to `docs/product/PRD.md` and reflects the expanded MVP scope condensed from the full SIKESRA draft.

## 1. Foundation, Identity, and Regional Context

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| FD-1 | Platform or Tenant Admin | As an implementation owner, I can run SIKESRA on the AWCMS architecture baseline so that product delivery stays aligned with approved platform guardrails. | The system uses AWCMS Admin, AWCMS Public, Supabase, Cloudflare Workers, and Cloudflare R2 without a separate custom backend server. |
| FD-2 | Village or Kelurahan Admin | As a local operator, I can register an entity with one immutable 20-digit SIKESRA ID so that the record has a stable business identity across workflow, documents, and reporting. | The entity receives a canonical 20D ID that does not change after issuance. |
| FD-3 | Village or Kelurahan Admin | As a local operator, I can capture RT, RW, Dusun, or similar micro-region data as contextual attributes so that field precision improves without changing the official entity identity. | Micro-region data is stored separately from the 20D identifier and can be updated without breaking identity continuity. |
| FD-4 | Operator Wilayah | As a regional operator, I can classify entities by official region and core entity type so that the registry remains structured and searchable. | Records always have valid tenant scope, official regional binding, and entity classification. |

## 2. Core Registry and Data Entry

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| RG-1 | Village or Kelurahan Admin | As a village admin, I can create draft records for houses of worship, social or religious institutions, religious teachers or figures, orphans, and people with disabilities so that the MVP target domains are operational. | Priority domain records can be created from structured forms with consistent validation. |
| RG-2 | Operator Kabupaten | As a district-level operator, I can enrich a core entity with domain-specific details so that different record types remain manageable without duplicating identity logic. | The system supports a core registry plus domain-specific extensions tied to the same entity. |
| RG-3 | Operator Wilayah | As an operator, I can search and filter records by identity, region, status, and completeness so that I can quickly find operational cases. | Record lists support operational discovery instead of acting as raw table dumps. |
| RG-4 | Operator Wilayah | As an operator, I can save partial work as draft and resume later so that long or evidence-heavy forms do not force one-session completion. | Draft-first behavior preserves progress safely until the record is ready for review. |

## 3. Document and Evidence Handling

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| DC-1 | Village or Kelurahan Admin | As a submitting operator, I can upload required supporting documents and media evidence so that each submission is backed by verifiable proof. | Documents and media are attached to the correct entity and workflow context. |
| DC-2 | Validator or Reviewer | As a reviewer, I can inspect documents by type, status, and relevance so that evidence review is efficient and traceable. | Documents support review lifecycle states such as uploaded, under review, verified, rejected, expired, and superseded. |
| DC-3 | Authorized Reviewer | As an authorized reviewer, I can open sensitive files through short-lived signed access so that private documents stay secure while remaining usable for workflow. | File access is permission-checked, temporary, and auditable. |
| DC-4 | Auditor | As an auditor, I can trace who uploaded, replaced, or accessed critical evidence so that document governance is reviewable. | Document-related events are preserved in audit history. |

## 4. Verification, Validation, and Approval Workflow

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| WF-1 | Village or Kelurahan Admin | As a local submitter, I can move a completed draft into submission only after minimum requirements are met so that incomplete records do not clog review queues. | Submission is blocked until minimum fields and mandatory evidence are present. |
| WF-2 | Kecamatan Verifier | As a sub-district verifier, I can review administrative completeness, location plausibility, and basic evidence quality so that weak records are corrected early. | Verifiers can approve, reject, or request revision with recorded reasons. |
| WF-3 | Institutional Validator | As a sector-specific validator, I can perform optional substantive validation on selected domains so that specialized review can be inserted without bypassing core governance. | Optional validation steps can be applied only where configured and relevant. |
| WF-4 | Regency Admin or Approver | As a regency approver, I can make the final approval decision so that only fully reviewed records become active operational master data. | Final approval transitions records into active operational status under audit. |
| WF-5 | Any Reviewer | As a reviewer, I can request revision with explicit reasoning so that the submitter knows exactly what must be corrected. | Revision requests carry timestamped reasons and remain visible in workflow history. |
| WF-6 | Auditor or Supervisor | As a supervisor, I can inspect workflow transitions and actor history so that no major state change happens silently. | Every important transition is actor-linked, timestamped, and auditable. |

## 5. Role-Based Security and Sensitive Data Protection

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| SC-1 | Internal User | As an internal user, I see only records and actions allowed for my role, tenant, and regional scope so that unauthorized access is prevented by design. | Views and actions remain aligned to ABAC permissions and RLS enforcement. |
| SC-2 | Authorized Officer | As an authorized officer, I can reveal masked sensitive fields only when my role and need-to-know context permit it so that personal data stays protected by default. | Sensitive values such as NIK remain masked unless explicitly allowed. |
| SC-3 | Report Operator | As a reporting user, I can export only the data allowed for my role and purpose so that read access does not automatically grant unrestricted export access. | Export rights are controlled separately from standard read access. |
| SC-4 | Security Reviewer | As a security reviewer, I can inspect critical actions such as approvals, exports, and document access so that risky behavior is visible and reviewable. | Sensitive operations leave a traceable audit footprint. |

## 6. Dashboards, Monitoring, and Reporting

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| DB-1 | Village or Kelurahan Admin | As a local operator, I can see my drafts, returned revisions, and pending submissions so that I know which cases need immediate attention. | Local dashboards prioritize actionable work queues. |
| DB-2 | Kecamatan Verifier | As a verifier, I can see pending reviews, problem cases, and overdue work so that I can focus on bottlenecks and throughput. | Verification dashboards surface queue health and SLA-like urgency indicators. |
| DB-3 | Regency Admin | As a regency admin, I can monitor approval backlog, data quality, and region-based workload so that I can manage system-wide operational flow. | Executive and operational dashboards expose summary and drill-down views. |
| DB-4 | Auditor or Reviewer | As an oversight user, I can inspect audit, history, and change visibility so that governance review is possible without modifying records. | Monitoring and audit views are accessible in read-only form where appropriate. |

## 7. Public-Safe Views and DTSEN Readiness

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| PV-1 | Public User | As a public visitor, I can view approved, non-sensitive information so that transparency is supported without exposing internal or personal data. | Public views are restricted to safe, explicitly allowed content and aggregates. |
| PV-2 | Tenant Administrator | As a tenant administrator, I can keep internal operational records separated from public-safe projections so that the public portal never reads unrestricted internal data directly. | Internal and public access paths stay architecturally separated. |
| PV-3 | Future DTSEN Operator | As a future operator, I can compare local records against national reference data without overwriting local master records silently so that discrepancies become reviewable operational proposals. | DTSEN-ready flows remain read-only and proposal-driven rather than write-through. |

## 8. DevOps and Operational Delivery

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| OP-1 | Technical Lead | As a delivery owner, I can deploy SIKESRA through separated environments and controlled CI/CD stages so that releases are reproducible and safe. | Local, staging, and production environments stay isolated and governed. |
| OP-2 | DevOps Engineer | As an operations engineer, I can ship schema changes only through timestamped SQL migrations so that data model changes remain auditable and repeatable. | Database evolution follows migration discipline rather than manual production edits. |
| OP-3 | Operations Team | As an operations team member, I can rely on backups, observability, and smoke checks so that incidents are detectable and recovery is realistic. | Backup, monitoring, and post-deploy verification are part of the normal operating baseline. |

## References

- [PRD.md](PRD.md) - Product requirements and MVP scope
- [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) - Testable checks aligned to these stories
- [GAP_ANALYSIS.md](GAP_ANALYSIS.md) - Current codebase gaps against the expanded PRD
- [README.md](../../README.md) - Monorepo overview and SIKESRA runtime baseline
- [docs/security/abac.md](../security/abac.md) - Permission model details
- [docs/security/rls.md](../security/rls.md) - Database enforcement details
