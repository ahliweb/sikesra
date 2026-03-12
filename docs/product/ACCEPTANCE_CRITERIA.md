> **Documentation Authority**: [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) -> [AGENTS.md](../../AGENTS.md) -> [PRD.md](PRD.md)

# SIKESRA MVP Acceptance Criteria

> This document converts the expanded SIKESRA MVP PRD into implementation and verification checks for the repository.

## 1. Product Foundation and Scope

| ID | Criterion | Verification |
| --- | --- | --- |
| PF-1 | SIKESRA is implemented on the AWCMS platform baseline without introducing a separate custom backend application server. | Architecture review confirms Admin uses React/Vite, Public uses Astro, orchestrated server logic uses Cloudflare Workers, and data security relies on Supabase. |
| PF-2 | MVP scope remains focused on the pre-DTSEN phase. | Documentation and implementation review confirm there is no direct national write-through integration in the MVP baseline. |
| PF-3 | The product scope includes registry, evidence, workflow, monitoring, and public-safe views for the defined MVP domains. | Product docs, UI surfaces, and schema review confirm these concerns are represented within the active implementation plan. |

## 2. Identity, Registry, and Regional Model

| ID | Criterion | Verification |
| --- | --- | --- |
| ID-1 | Every official entity can be assigned a single immutable 20-digit SIKESRA ID. | ID generation tests confirm the 20D format is correct and the identifier does not change after issuance. |
| ID-2 | Internal database keys remain separate from the official 20D business identifier. | Schema and implementation review confirm UUID-style technical keys are distinct from the external-facing business identifier. |
| ID-3 | Micro-region data is stored as contextual operational metadata and never embedded into the 20D ID. | Data model and generation logic review confirm RT, RW, Dusun, and similar fields are stored separately from the identifier. |
| ID-4 | Every business entity is tenant-scoped and region-aware at least to official village level. | Schema and form review confirm records carry tenant scope and official regional binding. |
| ID-5 | The system uses a core registry plus domain extension model for SIKESRA entities. | Data model and implementation review confirm shared identity and workflow state are not duplicated across unrelated domain tables. |

## 3. MVP Domain Coverage

| ID | Criterion | Verification |
| --- | --- | --- |
| DM-1 | The MVP supports the priority domains of houses of worship, social or religious institutions, religious teachers or figures, orphans, and people with disabilities. | Form, schema, and workflow review confirm these domain groups are represented in the delivery plan and implementation surface. |
| DM-2 | Records for these domains can be created in structured form rather than ungoverned free-form storage. | UI and schema tests confirm domain entries use typed fields, validation, and registry-linked structure. |

## 4. Draft, Submission, and Verification Workflow

| ID | Criterion | Verification |
| --- | --- | --- |
| WF-1 | New or materially changed records can be saved as draft. | UI and data tests confirm draft persistence works without forcing final submission. |
| WF-2 | Submission is blocked until minimum required fields and evidence are present. | Form and API validation tests confirm incomplete records cannot enter the review queue. |
| WF-3 | Kecamatan verification actions are limited to authorized roles and scoped records. | Permission and workflow tests confirm only permitted sub-district reviewers can process applicable records. |
| WF-4 | Optional institutional validation can be inserted for selected domains without bypassing required workflow stages. | Workflow review confirms optional validation remains configuration-driven and does not replace core approval controls. |
| WF-5 | Final Kabupaten approval is controlled by authorized roles only. | Approval tests confirm only final approvers can move records into active operational status. |
| WF-6 | Revisions and rejections require a reason and preserve timestamped history. | Audit and workflow history review confirm every negative decision stores reason, actor, and time. |
| WF-7 | Important workflow transitions are actor-linked and cannot happen silently. | Event and history review confirm state changes produce traceable audit records. |

## 5. Document and Evidence Governance

| ID | Criterion | Verification |
| --- | --- | --- |
| DS-1 | Required supporting documents can be attached to relevant entities and workflow stages. | Upload and relation tests confirm required evidence can be linked to the correct records and contexts. |
| DS-2 | Uploaded documents are private by default in storage. | Storage and access tests confirm objects are not publicly readable. |
| DS-3 | Sensitive files are accessed only through short-lived signed URLs generated after authorization checks. | Worker and access-flow tests confirm file retrieval is temporary, authorized, and not exposed as a permanent public path. |
| DS-4 | Document lifecycle states such as uploaded, under review, verified, rejected, expired, and superseded are supported where required. | Document workflow review confirms evidence can participate in operational review rather than act as passive attachments only. |
| DS-5 | Document-related events such as upload, replacement, and critical access are auditable. | Audit review confirms evidence handling leaves a traceable log. |

## 6. Security, Authorization, and Audit

| ID | Criterion | Verification |
| --- | --- | --- |
| SA-1 | Tenant-scoped business tables enforce RLS and ABAC controls. | Policy audit and cross-role tests confirm unauthorized reads and writes are blocked at the data layer. |
| SA-2 | Permission keys follow the `scope.resource.action` format. | Permission registry and code review confirm SIKESRA-aligned permissions follow the standard key pattern. |
| SA-3 | Sensitive values are masked by default and revealed only through authorized access paths. | UI and permission review confirm restricted fields remain obscured unless explicitly permitted. |
| SA-4 | Audit trails for critical workflow, document, and approval events are append-only in practice. | Audit schema and event-flow review confirm critical actions are recorded without destructive overwrite behavior. |
| SA-5 | Business record deletion relies on soft delete lifecycle rules instead of default hard deletion. | Application and schema review confirm archival behavior uses lifecycle flags such as `deleted_at`. |
| SA-6 | Export access is more restricted than ordinary read access for sensitive data. | Role and workflow review confirm export behavior is permission-gated separately from general viewing. |

## 7. API and Edge Operation Rules

| ID | Criterion | Verification |
| --- | --- | --- |
| AP-1 | Safe direct reads and simple mutations can run under Supabase client access with RLS enforcement. | Code review confirms standard client paths remain policy-bound and do not bypass data controls. |
| AP-2 | Sensitive orchestration runs through Cloudflare Workers rather than unrestricted browser-side logic. | Endpoint and architecture review confirm privileged actions such as signed file access and sensitive transitions use the approved edge layer. |
| AP-3 | Shared validation, numbering logic, or workflow helpers can be enforced through database-side functions or RPCs where appropriate. | Schema and code review confirm reusable validation logic is placed in approved data-layer mechanisms when needed. |

## 8. UI/UX and Operational Visibility

| ID | Criterion | Verification |
| --- | --- | --- |
| UX-1 | The admin experience is task-oriented and process-driven rather than generic CRUD-only. | UI review confirms the product surfaces workflow state, next actions, and operational context. |
| UX-2 | Long forms use progressive disclosure through steps, sections, or guided flows. | Form review confirms complex entry flows are broken into usable sections or wizard-like stages. |
| UX-3 | Dashboards emphasize queue health, bottlenecks, revisions, and operational visibility rather than only aggregate totals. | Dashboard review confirms actionable monitoring signals are shown prominently. |
| UX-4 | Entity detail views combine profile, location, evidence, workflow, and history in a coherent operator experience. | Detail-screen review confirms users can inspect operational context without excessive context switching. |
| UX-5 | Public-facing views expose only approved, safe information. | Public route and rendering review confirm internal workflow and sensitive fields do not leak into public surfaces. |

## 9. DevOps, Deployment, and Operations

| ID | Criterion | Verification |
| --- | --- | --- |
| DO-1 | Local or Dev, Staging or UAT, and Production environments remain isolated. | Deployment and config review confirm environment variables, domains, and secrets are separated appropriately. |
| DO-2 | Secrets are managed outside committed source code. | Repository and deployment review confirm sensitive values are injected through secret managers or platform bindings. |
| DO-3 | CI or CD stages cover validate, test, build, deploy, and post-deploy verification. | GitHub Actions and release-flow review confirm required delivery stages exist or are planned explicitly. |
| DO-4 | Schema changes are shipped through timestamped SQL migrations only. | Migration review confirms database evolution is represented in the migration directories rather than manual drift. |
| DO-5 | Backup, observability, and smoke verification are documented as operating requirements. | Ops review confirms backup flow, monitoring expectations, and post-deploy verification are part of the baseline. |

## 10. DTSEN Readiness

| ID | Criterion | Verification |
| --- | --- | --- |
| DT-1 | Future DTSEN integration is modeled as read-only reference access. | Architecture and planning review confirm DTSEN is not treated as a direct writable target from the MVP system. |
| DT-2 | DTSEN reference data is isolated from local operational master data. | Data model planning review confirms reference tables or views are separated from local core records. |
| DT-3 | Mismatches between local and future national data generate reviewable proposals rather than silent overwrite behavior. | Workflow design review confirms discrepancy handling is proposal-driven and auditable. |

## 11. Documentation and Delivery Alignment

| ID | Criterion | Verification |
| --- | --- | --- |
| DC-1 | Product docs remain aligned across the PRD, user stories, acceptance criteria, and gap analysis. | Documentation review confirms the expanded SIKESRA MVP framing is consistent across the product doc set. |
| DC-2 | Repository documentation preserves AWCMS architectural guardrails while presenting SIKESRA as the product layer. | README and documentation index review confirm SIKESRA-first framing does not conflict with platform rules. |

## References

- [PRD.md](PRD.md) - Product requirements and MVP scope
- [USER_STORY.md](USER_STORY.md) - Persona and workflow-driven stories
- [GAP_ANALYSIS.md](GAP_ANALYSIS.md) - Current implementation gaps against the expanded PRD
- [README.md](../../README.md) - Monorepo overview and SIKESRA baseline
- [DOCS_INDEX.md](../../DOCS_INDEX.md) - Canonical documentation routing
