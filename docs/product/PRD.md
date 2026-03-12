> **Documentation Authority**: [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) -> [AGENTS.md](../../AGENTS.md) -> [README.md](../../README.md) -> [DOCS_INDEX.md](../../DOCS_INDEX.md)

# SIKESRA MVP Product Requirements Document (PRD)

> **Basis of this PRD:** SIKESRA is implemented on top of the AWCMS platform architecture and follows the repository guardrails for Supabase, Cloudflare Workers, Cloudflare R2, Astro, React, and multi-tenant security.

## 1. Product Vision & MVP Objectives

System Information for Social Welfare (SIKESRA) transforms regional social welfare data management from manual, fragmented formats such as spreadsheets and PDFs into an integrated, verified, and secure application.

For the MVP, covering the pre-DTSEN phase, the primary objective is to establish internal data governance, streamline multi-tier verification workflows, and secure document management without depending on external national databases such as DTSEN.

### MVP Success Indicators

- Structured data entry is available for core social welfare domains.
- Hierarchical verification works across village, sub-district, and regency levels.
- Secure document upload and storage are operational.
- Internal sensitive data is separated from safe public-facing views.

## 2. Architectural Foundation (AWCMS-First)

SIKESRA must operate as a multi-tenant application built strictly on the AWCMS platform architecture. Custom backend servers, including traditional Node.js app servers or Serverpod-style backends, are out of scope.

The MVP stack is fixed as follows:

- **Admin Layer:** AWCMS Admin (`React + Vite`) for internal dashboards, data entry, verification, and workflow operations.
- **Public Layer:** AWCMS Public (`Astro + React Islands`) for static, safe public portals.
- **Edge/API Layer:** Cloudflare Workers for HTTP orchestration, webhook integrations, signed access, and privileged operations.
- **Database & Security Layer:** Supabase PostgreSQL for operational data, authentication, Row Level Security (RLS), and Attribute-Based Access Control (ABAC).
- **Storage Layer:** Cloudflare R2 for secure document and media storage.

## 3. Data Model & Identity Standardization

To maintain consistency and reduce duplicate records during the MVP phase, SIKESRA uses a strict codification standard.

### The Immutable 20-Digit ID (20D)

Every registered entity must receive a single, immutable 20-digit SIKESRA ID as its canonical business identifier.

- **Format:** `[10-digit village code] + [2-digit entity type] + [2-digit subtype] + [6-digit sequence]`
- **Immutability rule:** The identifier never changes after issuance.
- **Micro-regions policy:** RT, RW, Dusun, and similar micro-region markers are contextual attributes only and must never be embedded into the ID generation logic.

This policy ensures the identifier stays stable even when local micro-region boundaries change.

### Core MVP Entities

The MVP focuses on these priority entity groups:

1. Houses of Worship
2. Social or Religious Institutions
3. Religious Teachers or Figures
4. Orphans
5. People with Disabilities

## 4. Core Business Workflows

The MVP replaces one-step data entry with an evidence-based, multi-tier verification process.

### Draft and Submission

- Village or Kelurahan Admin enters data as draft.
- Submission is allowed only after minimum required fields are complete.
- Mandatory supporting documents, such as ID cards or decrees, must be uploaded before submission.

### Kecamatan Verification

- Sub-district verifiers review administrative completeness.
- Verifiers confirm location validity.
- Verifiers assess document legibility and submission quality.

### Institutional Validation (Optional)

- Relevant sectoral institutions may perform domain-specific validation.
- Typical examples include Ministry of Religion or Social Services review paths.

### Kabupaten Approval

- Regency Admin performs final review.
- Approved records become active operational master data.

### Revision Handling

- Rejections and revision requests must capture a reason.
- Each workflow event must be time-stamped.
- Workflow history must be visible through audit records.

## 5. UI/UX Requirements

The product experience must be task-oriented and process-driven rather than purely form-centric.

- **Role-based views:** Users only see features, tasks, and records relevant to their role and regional scope.
- **Actionable dashboards:** Dashboards prioritize bottlenecks, pending verifications, SLA tracking, and data quality signals over simple aggregate totals.
- **Progressive disclosure:** Long forms must be split into logical steps or wizard flows to reduce cognitive load.
- **Sensitive data masking:** Sensitive fields such as NIK or detailed disability-related data must be masked by default and revealed only to authorized roles.

## 6. Security & API Constraints

SIKESRA applies a defense-in-depth security model built on Supabase and Cloudflare platform controls.

- **Authorization:** All tenant-scoped tables must enforce RLS, with access determined by role, region, and data classification using ABAC permission keys such as `tenant.sikesra_entity.update`.
- **Private-by-default files:** Documents stored in Cloudflare R2 are private and are accessible only through short-lived signed URLs generated by Cloudflare Workers after permission checks.
- **Immutable audit trails:** Critical actions including status changes, uploads, approvals, and soft deletes must be written to an append-only audit log.
- **Soft delete lifecycle:** Business records must never be hard-deleted in normal flows and must rely on `deleted_at` for archival behavior.

## 7. DevOps & Deployment Strategy

MVP delivery must align with AWCMS operational rules for reproducibility, safety, and staged deployment.

- **Environment separation:** Local or Dev, Staging or UAT, and Production environments must stay isolated, and secrets must be managed through platform secret managers only.
- **CI/CD pipeline:** GitHub Actions pipelines must cover linting or validation, testing, build steps for Admin, Public, and Worker surfaces, deployment, and post-deploy smoke verification using `k6`.
- **Database migrations:** Supabase schema changes must be delivered only through timestamped, version-controlled SQL migrations.
- **Backup and rotation:** Daily logical PostgreSQL backups using `pg_dump` must be encrypted, stored temporarily, and rotated into a dedicated Cloudflare R2 backup bucket.
- **Observability:** Prometheus and Grafana are required for internal health monitoring, while Sentry must capture runtime errors across Admin, Public, and Edge layers.

## 8. Post-DTSEN Readiness

Although the MVP targets the pre-DTSEN phase, the architecture must remain ready for future national integration.

When DTSEN is introduced:

- SIKESRA acts as a read-only cross-checking system rather than a direct writer to the national dataset.
- DTSEN data must live in isolated reference tables.
- Detected discrepancies must create operational proposals for review instead of silently overwriting local or national master data.

## References

- [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) - Repository architecture, version, and security source of truth
- [AGENTS.md](../../AGENTS.md) - Implementation guardrails and AWCMS platform rules
- [README.md](../../README.md) - Monorepo overview and environment baseline
- [DOCS_INDEX.md](../../DOCS_INDEX.md) - Canonical documentation routing
- [USER_STORY.md](USER_STORY.md) - Persona-aligned flows derived from the PRD
- [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) - Testable checks aligned to this MVP scope
