> **Documentation Authority**: [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) -> [AGENTS.md](../../AGENTS.md) -> [README.md](../../README.md) -> [DOCS_INDEX.md](../../DOCS_INDEX.md)

# SIKESRA MVP Product Requirements Document (PRD)

> **Basis of this PRD:** This repository-level PRD condenses the broader `temp_debug_files/output-mvp.pdf` draft into an implementable MVP baseline for SIKESRA on top of the AWCMS platform architecture.

## 1. Product Overview

SIKESRA, Sistem Informasi Kesejahteraan Rakyat, is a regional social welfare information system for structured registry, document governance, verification, and operational follow-up across village, sub-district, and regency levels.

The MVP focuses on the **pre-DTSEN** phase. It is designed to replace fragmented spreadsheet, PDF, and manual coordination practices with a governed application that is secure, auditable, and ready for phased expansion.

### 1.1 MVP Goals

- Create a tenant-scoped, structured registry for priority social welfare entities.
- Establish a draft-first, evidence-based, multi-tier verification workflow.
- Securely store and review documents and field evidence.
- Provide role-based dashboards for operational monitoring, backlog control, and decision support.
- Separate internal sensitive data from safe public information.
- Keep the system architecturally ready for future read-only DTSEN comparison.

### 1.2 MVP Success Indicators

- Core entity domains can be entered, reviewed, and managed consistently.
- Village -> Kecamatan -> Kabupaten verification works with status tracking and audit history.
- Mandatory supporting documents can be uploaded, classified, and reviewed securely.
- Internal users can monitor backlog, revisions, and SLA-like process signals from dashboards.
- Public-facing views expose only approved, non-sensitive, safe information.

## 2. Product Scope

### 2.1 In Scope for the MVP

- Internal registry for welfare-related institutional and individual entities.
- Regional and micro-region aware data capture.
- Draft, submission, verification, validation, approval, revision, archive, and audit flows.
- Secure document and media evidence handling.
- Basic operational dashboards, reporting, and controlled exports.
- Public-safe information surfaces such as aggregate statistics, service guidance, and approved directory-style content where explicitly allowed.

### 2.2 Out of Scope for the MVP

- Direct write integration to DTSEN or other national master systems.
- Traditional custom backend servers outside the AWCMS, Supabase, and Cloudflare pattern.
- Full real-time cross-system synchronization with external national platforms.
- Unrestricted public access to internal workflow, personal data, or raw operational records.

## 3. Architectural Foundation (AWCMS-First)

SIKESRA must be implemented as an AWCMS-based system and must not introduce a separate primary backend application server.

- **Admin Layer:** AWCMS Admin (`React + Vite`) for internal workflows, dashboards, forms, review queues, and reports.
- **Public Layer:** AWCMS Public (`Astro + React Islands`) for static-first, safe public information.
- **Mobile or Field Layer:** AWCMS Mobile (`Flutter`) is a later-stage extension path for field verification and visit workflows.
- **Edge/API Layer:** Cloudflare Workers for privileged orchestration, signed file access, export jobs, notifications, and controlled integrations.
- **Database & Security Layer:** Supabase PostgreSQL for tenant-scoped data, auth, ABAC, RLS, audit support, and lifecycle controls.
- **Storage Layer:** Cloudflare R2 for document, media, and export storage with private-by-default access.

### 3.1 Core Architecture Principles

- **Platform-first:** SIKESRA follows AWCMS patterns rather than inventing a parallel architecture.
- **Multi-tenant by design:** Tenant isolation is mandatory for business tables and access control.
- **Security by default:** Data and files are private unless explicitly marked safe for public exposure.
- **Workflow-centric:** The system manages status, review, and approvals, not just raw records.
- **Modular growth:** Domain features expand on top of shared registry, document, workflow, and audit foundations.
- **Public-private split:** Admin, public, and future field access paths are separated by architecture and policy.

## 4. Data Model & Identity Standardization

### 4.1 Core Data Model Strategy

The MVP uses a **core registry plus domain extension** model.

- A central entity registry stores stable identity, classification, tenant scope, region, lifecycle, and workflow state.
- Domain-specific tables extend the core model for sector-specific attributes.
- Documents, submissions, verifications, approvals, follow-up actions, and audit events remain linked back to the same core entity identity.

### 4.2 Immutable 20-Digit SIKESRA ID (20D)

Every official SIKESRA entity must have one immutable 20-digit business identifier.

- **Format:** `[10-digit village code] + [2-digit entity type] + [2-digit subtype] + [6-digit sequence]`
- **Purpose:** Canonical business identifier for workflow, documents, reports, and operational references.
- **Immutability:** The 20D ID does not change after issuance.
- **Database key model:** Internal database primary keys should remain UUID-based; the 20D ID is the official business identifier.

### 4.3 Micro-Region Policy

RT, RW, Dusun, Lingkungan, and similar micro-region markers are operational context only.

- They must be stored as structured attributes or references.
- They must never be embedded into the 20D ID.
- Changes to micro-region context must not change the entity's official identity.

### 4.4 Priority MVP Entity Domains

The repository MVP prioritizes these domains:

1. Houses of Worship
2. Social or Religious Institutions
3. Religious Teachers or Figures
4. Orphans
5. People with Disabilities

The broader draft also indicates future extension toward additional social, institutional, assistance, and monitoring domains once the foundation is stable.

## 5. Regional Model and Operating Context

SIKESRA is region-aware and must support both official administrative hierarchies and local operational segmentation.

- Official hierarchy: Province -> Regency or City -> District -> Village or Kelurahan.
- Operational micro-regions: Dusun, RW, RT, or similar local segmentation.
- All entities must map to an official village-level location at minimum.
- Micro-regions are optional but strongly recommended where verification, service targeting, or field distribution needs more precision.

## 6. Core Business Workflows

### 6.1 Workflow Principles

- **Draft-first:** New or materially changed records start as draft.
- **Evidence-based:** Documents, field evidence, and notes support review decisions.
- **Role and region aware:** Actions depend on both role and territorial scope.
- **No silent transitions:** Significant workflow transitions require actor, timestamp, and reason capture.
- **Internal-first:** The pre-DTSEN MVP optimizes internal governance, not national write-through integration.

### 6.2 Baseline Workflow Stages

The recommended MVP workflow is:

1. `draft`
2. `ready_for_submission`
3. `submitted_kelurahan`
4. `under_verification_kecamatan`
5. `revision_requested_kecamatan`
6. `verified_kecamatan`
7. `under_validation_instansi` where needed
8. `validated_instansi`
9. `under_review_kabupaten`
10. `revision_requested_kabupaten`
11. `approved_kabupaten`
12. `active`
13. `inactive`
14. `archived`
15. `rejected`

### 6.3 Key Workflow Roles

- **Village or Kelurahan Admin:** Creates drafts, completes records, uploads evidence, and submits.
- **Kecamatan Verifier:** Reviews administrative completeness, geography, and plausibility.
- **Institutional Validator:** Performs optional sector-specific checks for selected domains.
- **Regency Admin or Approver:** Makes final operational approval decisions.
- **Field Verifier:** Supports site visits, location checks, and evidence collection in later extensions.
- **Auditor or Reviewer:** Reviews history, policy compliance, and process accountability.

### 6.4 Revision and Rejection Rules

- Revision and rejection must include a reason.
- Important transitions must be timestamped and actor-linked.
- Workflow history must remain available for audit and supervision.

## 7. Document and Evidence Management

Documents are part of the validation process, not passive attachments.

- Required documents vary by entity type.
- Documents must support classification, status, and relationship to the owning entity and workflow.
- Reviewers must be able to inspect evidence without making documents public.
- Important lifecycle states include uploaded, under review, verified, rejected, expired, and superseded.

### 7.1 Minimum Document Governance Requirements

- Private-by-default storage in Cloudflare R2.
- Signed, short-lived retrieval URLs generated by Cloudflare Workers.
- Metadata capturing uploader, document type, relation, and verification state.
- Audit logging for upload, replacement, sensitive access, and approval-linked evidence usage.

## 8. Security, Authorization, and Audit

### 8.1 Security Principles

SIKESRA uses a defense-in-depth approach.

- **Auth:** Supabase Auth provides authenticated identity.
- **ABAC:** Permission keys follow the AWCMS `scope.resource.action` pattern.
- **RLS:** Tenant-scoped tables must enforce Row Level Security.
- **Least privilege:** Roles should receive the minimum rights needed.
- **Need-to-know:** Sensitive information visibility depends on operational necessity.
- **Soft delete:** Business deletion relies on lifecycle fields such as `deleted_at`.

### 8.2 Representative Permission Model

Examples of expected SIKESRA permissions include:

- `tenant.sikesra_entity.create`
- `tenant.sikesra_entity.update`
- `tenant.sikesra_submission.submit`
- `tenant.sikesra_verification.verify_kecamatan`
- `tenant.sikesra_verification.verify_kabupaten`
- `tenant.sikesra_program.approve`
- `tenant.sikesra_report.export`
- `tenant.sikesra_audit.read`

### 8.3 Sensitive Data Rules

- Sensitive values such as NIK and certain disability-related details are masked by default.
- Highly sensitive records and files require stricter read and export controls.
- Public-facing code paths must never read unrestricted internal tables directly.

### 8.4 Audit Requirements

Critical events must be append-only and reviewable.

- Record creation and critical edits
- Status transitions
- Verification and approval actions
- Document upload or replacement
- Sensitive exports
- Permission-affecting changes
- Archive, restore, and soft-delete events

## 9. API and Edge Constraints

### 9.1 Data Access Pattern

- Standard safe reads and simple mutations may use Supabase JS clients under RLS.
- Sensitive orchestration must run through Cloudflare Workers.
- Database functions or RPCs may enforce shared validation, policy helpers, numbering rules, and workflow logic.

### 9.2 Worker-Backed Operations

Cloudflare Workers are the approved layer for:

- 20D ID generation when orchestration is required
- Sensitive workflow transitions
- Signed document access
- Controlled exports
- Notifications and webhooks
- Future read-only integration flows

## 10. UI/UX Requirements

The SIKESRA MVP UI must support real operator workflows rather than generic CRUD screens.

### 10.1 Required Experience Principles

- **Task-oriented interfaces:** Users should see the next action, not only raw data.
- **Progressive disclosure:** Long forms and complex details are split into structured steps or sections.
- **Workflow clarity:** Status, pending issues, and next-stage ownership must be clear.
- **Region-aware views:** Users should not be overloaded with data outside their territorial scope.
- **Sensitive-data minimization:** Restricted information is hidden or masked unless authorized.
- **Consistent AWCMS patterns:** Reusable layout, badges, filters, history views, and action panels should be used.

### 10.2 Key Admin Experience Areas

- Role-specific dashboards
- Operational list views with filters and status badges
- Entity detail pages with profile, location, documents, workflow, and history sections
- Submission and revision wizards
- Verification inboxes
- Evidence and document panels
- Audit and monitoring views

### 10.3 Public Experience Requirements

The public portal is limited to safe, approved information such as:

- Aggregate statistics
- Service guidance and SOP content
- Announcements or informational content
- Approved public-safe directory information where allowed

## 11. Reporting, Monitoring, and Operational Visibility

The MVP must provide enough operational visibility to manage bottlenecks and data maturity.

- Dashboard indicators for draft volume, verification backlog, revisions, and active records
- Region-based workload breakdowns
- Document completeness and expiry-related monitoring
- Controlled exports for operational and managerial reporting
- Audit and event visibility for reviewers and supervisors

## 12. DevOps and Deployment Strategy

### 12.1 Environment Strategy

- Separate Local or Development, Staging or UAT, and Production environments.
- Use secret managers and bindings rather than committed production credentials.
- Keep public, admin, worker, storage, and database configuration separated by environment.

### 12.2 Delivery Requirements

- CI/CD through GitHub Actions
- Validate, test, build, deploy, and post-deploy verification stages
- Timestamped SQL migrations only for schema changes
- Controlled rollout with manual production approval for sensitive releases
- Health and smoke verification after deployment

### 12.3 Operational Requirements

- Daily logical PostgreSQL backups using `pg_dump`
- Encrypted backup handling and rotation into Cloudflare R2
- Observability through Prometheus or Grafana and Sentry
- Recovery procedures, release safety, and rollback or forward-fix planning

## 13. MVP Roadmap Direction

The PDF draft supports a staged delivery model. At the repo PRD level, the MVP should be executed in this order:

1. **Foundation:** tenancy, schema, policy, identity, and classification
2. **Core Registry:** entity management for priority domains
3. **Documents and Workflow:** evidence handling, submissions, verifications, approvals, and audit
4. **Operational Dashboards:** backlog, quality, and reporting visibility
5. **Program Linkage:** limited assistance or intervention readiness once validated data is stable
6. **Stabilization:** hardening, optimization, and preparation for future post-DTSEN expansion

## 14. Post-DTSEN Readiness

The system must remain ready for future DTSEN-era operation without changing the MVP's internal-first focus.

- DTSEN must be treated as **read-only reference data**.
- Local SIKESRA operational records remain the authoritative source for regional workflow, documentation, and local context.
- DTSEN reference data must live in isolated tables or views, not overwrite local master records directly.
- Differences between local and national reference data must produce reviewable operational proposals rather than automatic overwrite behavior.

## 15. References

- [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) - Repository architecture, security, and platform baseline
- [AGENTS.md](../../AGENTS.md) - AWCMS implementation guardrails and workflow rules
- [README.md](../../README.md) - Monorepo overview and operating baseline
- [DOCS_INDEX.md](../../DOCS_INDEX.md) - Documentation routing
- [USER_STORY.md](USER_STORY.md) - Persona and role-aligned workflow stories
- [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) - Testable checks aligned to this PRD
- `temp_debug_files/output-mvp.pdf` - Full source draft used as the basis for this condensed repo PRD
