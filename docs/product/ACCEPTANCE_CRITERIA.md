> **Documentation Authority**: [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) -> [AGENTS.md](../../AGENTS.md) -> [PRD.md](PRD.md)

# SIKESRA MVP Acceptance Criteria

> This document mirrors the current SIKESRA MVP PRD and turns its requirements into testable checks.

## 1. Product Foundation and Scope

| ID | Criterion | Verification |
| --- | --- | --- |
| PF-1 | SIKESRA runs on the AWCMS architecture baseline without introducing custom backend application servers. | Architecture review confirms Admin uses React/Vite, Public uses Astro, backend logic uses Supabase and Cloudflare Workers, and no custom Node.js business server is required. |
| PF-2 | MVP scope covers the pre-DTSEN phase only. | Product documentation and implementation review confirm no direct DTSEN write integration exists in the MVP baseline. |
| PF-3 | The system supports the defined MVP entity groups. | Form, schema, and workflow review confirm support for houses of worship, social or religious institutions, religious teachers or figures, orphans, and people with disabilities. |

## 2. Identity and Data Standardization

| ID | Criterion | Verification |
| --- | --- | --- |
| ID-1 | Every registered entity can be assigned a single immutable 20-digit SIKESRA ID. | ID generation tests confirm the output follows the documented 20D format and remains unchanged after issuance. |
| ID-2 | Micro-region data is treated as contextual metadata and not part of ID generation. | Data model and ID generation review confirm RT, RW, Dusun, and similar fields are stored separately from the canonical identifier. |
| ID-3 | Duplicate entity creation is controlled by standardized identity and validation rules. | Insert and validation tests confirm duplicate detection or blocking rules are enforced consistently within the allowed scope. |

## 3. Draft, Submission, and Verification Workflow

| ID | Criterion | Verification |
| --- | --- | --- |
| WF-1 | Village-level operators can save records as draft. | UI and database tests confirm draft records persist without requiring final submission. |
| WF-2 | Submission is blocked until minimum required fields and mandatory documents are present. | Form and API validation tests confirm incomplete records cannot enter the review queue. |
| WF-3 | Kecamatan verifiers can review, approve, reject, or request revision according to role permissions. | Permission and workflow tests confirm only authorized verifier roles can perform sub-district verification actions. |
| WF-4 | Optional institutional validation can be inserted into the process without bypassing required checks. | Workflow configuration and status transition review confirm optional sectoral validation is supported when enabled. |
| WF-5 | Regency admins control final approval into active master data. | Approval tests confirm only final approvers can move records into the active operational dataset. |
| WF-6 | Rejections and revision requests require a reason and produce a timestamped workflow trail. | Audit and workflow history review confirm every negative decision includes reason, actor, and timestamp. |

## 4. Document Security and Storage

| ID | Criterion | Verification |
| --- | --- | --- |
| DS-1 | Mandatory supporting documents can be uploaded for relevant entity workflows. | Upload and validation tests confirm required document classes are accepted where the workflow demands them. |
| DS-2 | Uploaded documents are private by default in storage. | Storage configuration and access tests confirm objects are not publicly readable. |
| DS-3 | Reviewers access documents only through short-lived signed URLs after permission checks. | Worker and access-flow tests confirm signed document access is temporary, authorized, and not directly public. |
| DS-4 | Document upload and access events are auditable. | Audit log review confirms uploads, permissioned reads, and workflow-linked file events are recorded. |

## 5. Role-Based UI and Sensitive Data Protection

| ID | Criterion | Verification |
| --- | --- | --- |
| RB-1 | Users only see features and data allowed by role and regional scope. | UI review and RLS tests confirm role-based menus, pages, and records are restricted correctly. |
| RB-2 | Sensitive data is masked by default. | UI inspection confirms fields such as NIK and sensitive health or disability details are obscured for non-authorized views. |
| RB-3 | Sensitive data reveal actions require appropriate authorization. | Permission tests confirm masked data can be revealed only by allowed roles and scopes. |
| RB-4 | Dashboards are task-oriented and show operational bottlenecks, not only summary counts. | Dashboard review confirms pending verification, revisions, SLA indicators, and quality issues are surfaced prominently. |

## 6. Security, Audit, and Data Lifecycle

| ID | Criterion | Verification |
| --- | --- | --- |
| SA-1 | Tenant-scoped business tables enforce RLS and ABAC rules. | Policy audit and cross-role tests confirm unauthorized reads and writes are blocked at the database layer. |
| SA-2 | Permission keys follow the `scope.resource.action` format. | Permission registry and code review confirm SIKESRA flows use standardized ABAC naming. |
| SA-3 | Critical workflow events are written to an append-only audit trail. | Audit schema and behavior review confirm status changes, uploads, approvals, revisions, and deletions are logged without destructive overwrite patterns. |
| SA-4 | Business data uses soft delete rather than hard delete in standard operations. | Application and database review confirm entity archival relies on `deleted_at`. |

## 7. Public-Safe Data and DTSEN Readiness

| ID | Criterion | Verification |
| --- | --- | --- |
| PV-1 | Public views expose only explicitly safe, approved information. | Public query and rendering review confirm sensitive internal data is excluded from public surfaces. |
| PV-2 | Internal operational records remain separated from public-safe projections. | Data flow and route review confirm internal admin surfaces and public portals use distinct access patterns. |
| PV-3 | Future DTSEN integration is modeled as read-only reference data. | Architecture and schema planning review confirm DTSEN-ready flows do not overwrite local master data directly. |
| PV-4 | Discrepancies between local and future national reference data create reviewable operational proposals. | Workflow design review confirms mismatch handling produces explicit review items rather than silent sync behavior. |

## 8. DevOps, Deployment, and Operations

| ID | Criterion | Verification |
| --- | --- | --- |
| DO-1 | Local or Dev, Staging or UAT, and Production environments remain separated. | Deployment config review confirms isolated environment variables, secrets, and deployment targets. |
| DO-2 | Secrets are managed outside source control. | Repository and deployment review confirm sensitive values are injected via secret managers and not committed. |
| DO-3 | CI or CD pipelines include validation, testing, build, deployment, and post-deploy smoke checks. | GitHub Actions review confirms required stages exist for Admin, Public, and Worker surfaces. |
| DO-4 | Database changes are shipped through timestamped SQL migrations only. | Migration review confirms schema changes are represented in `supabase/migrations/`. |
| DO-5 | Backup, rotation, and observability expectations are documented and implementable. | Ops documentation review confirms daily logical backup flow, R2 rotation target, Prometheus or Grafana expectations, and Sentry coverage requirements. |
| DO-6 | Product docs stay aligned across PRD, user stories, acceptance criteria, README, and DOCS_INDEX. | Documentation review confirms the SIKESRA MVP terminology and scope are consistent across the core docs set. |

## References

- [PRD.md](PRD.md) - Product requirements and MVP scope
- [USER_STORY.md](USER_STORY.md) - Persona and workflow-driven stories
- [README.md](../../README.md) - Monorepo overview and SIKESRA baseline
- [DOCS_INDEX.md](../../DOCS_INDEX.md) - Canonical documentation routing
- [docs/security/abac.md](../security/abac.md) - ABAC model details
- [docs/security/rls.md](../security/rls.md) - RLS policy details
