> **Documentation Authority**: [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) -> [AGENTS.md](../../AGENTS.md) -> [PRD.md](PRD.md)

# SIKESRA MVP Gap Analysis

> This document compares the expanded SIKESRA MVP PRD to the current repository state after the AWCMS baseline import and subsequent cleanup work.
> 
> **Last Updated:** 2026-03-12

## 1. Executive Summary

The current codebase provides a strong **AWCMS platform foundation** with **SIKESRA core schema now implemented**.

### 1.1 Overall Assessment

- **Platform foundation:** present
- **SIKESRA domain model:** schema implemented, UI pending
- **20D identity model:** implemented
- **Multi-tier SIKESRA workflow:** schema ready, UI pending
- **Document governance foundation:** schema ready, UI pending
- **Public-safe split:** pending
- **DTSEN readiness:** conceptual only

### 1.2 Main Conclusion

The repository has the SIKESRA core schema, 20D identity functions, permission family, and RLS policies in place. The remaining work focuses on admin UI modules, dashboards, and public-safe views.

## 2. What Already Exists

### 2.1 AWCMS Platform Baseline Present

The repo already includes the core platform layers required by the PRD:

- AWCMS admin routing and module framework in `awcms/src/components/MainRouter.jsx`
- Supabase migration structure in `supabase/migrations/`
- Cloudflare and media-related platform groundwork in `supabase/migrations/20260308070000_add_cloudflare_media_schema.sql`
- Generic public and admin product documentation in `README.md`, `DOCS_INDEX.md`, and product docs

### 2.2 Generic Governance Features Present

Some platform-level foundations align with the PRD direction:

- Tenant-oriented architecture and RLS-oriented data approach are already part of the base system
- Media and document handling groundwork exists in current platform code and migrations
- Audit, permission, and resource registry concepts already exist at the platform level
- Admin UI already supports generic dashboards, content management, users, roles, and settings

## 3. Major Gaps Against the Expanded PRD

## 3.1 SIKESRA Core Schema (IMPLEMENTED)

The expanded PRD expects a SIKESRA-specific core registry and related tables such as:

- `sikesra_entities` (implemented)
- `sikesra_documents` (implemented)
- `sikesra_submissions` (implemented)
- `sikesra_verifications` (implemented)
- `sikesra_approvals` (implemented)
- `sikesra_audit_events` (implemented)
- `sikesra_micro_regions` (implemented)
- `sikesra_entity_types` (reference table, implemented)

Current status:
- SIKESRA schema migration created: `20260312150000_sikesra_core_schema.sql`
- RLS policies created: `20260312150100_sikesra_rls_policies.sql`
- All tables have tenant isolation and soft delete support

## 3.2 20-Digit SIKESRA ID Logic (IMPLEMENTED)

The PRD requires a stable 20D business identifier and explicit separation from technical UUID keys.

Current status:
- `generate_sikesra_id()` function implemented
- `validate_sikesra_id()` function implemented
- `parse_sikesra_id()` function implemented
- `issue_sikesra_id()` function implemented
- Format: `[10-digit village code][2-digit entity type][2-digit subtype][6-digit sequence]`

## 3.3 Micro-Region Modeling (IMPLEMENTED)

The PRD requires micro-regions such as RT, RW, and Dusun to exist as operational attributes, not as part of identity.

Current status:
- `sikesra_micro_regions` table created
- Supports RT, RW, Dusun, Lingkungan, and other types
- Linked to `administrative_regions` for official village context

## 3.4 SIKESRA Workflow States and Review Queues Are Missing

The PRD expects draft-first submission, Kecamatan verification, optional institutional validation, Kabupaten approval, revision handling, and audit-linked transitions.

Current gap:

- The current admin app is still generic and does not expose dedicated SIKESRA verification queues or SIKESRA-specific state transitions in `awcms/src/components/MainRouter.jsx`
- There are no active modules named for SIKESRA entities, submissions, verifications, or approvals

Impact:

- The repository does not yet implement the central business workflow that defines the SIKESRA MVP.

## 3.5 SIKESRA Permission Family (IMPLEMENTED)

The PRD expects permissions such as:

- `tenant.sikesra_entity.create`
- `tenant.sikesra_submission.submit`
- `tenant.sikesra_verification.verify_kecamatan`
- `tenant.sikesra_verification.verify_kabupaten`

Current status:
- SIKESRA permission family created: `20260312150200_sikesra_permissions.sql`
- Permission groups implemented: entity, micro_region, document, submission, verification, approval, audit, report, dashboard
- Role assignments configured for owner, super_admin, admin, editor, author

## 3.6 SIKESRA Dashboards and Reporting Are Missing

The PRD expects dashboards for:

- village or local operator queues
- Kecamatan verification backlog
- Kabupaten approval backlog
- quality and completeness indicators
- workflow and SLA-like monitoring

Current gap:

- Generic dashboard infrastructure exists, but not SIKESRA-specific operational widgets or KPIs
- Current admin dashboard code such as `awcms/src/components/dashboard/AdminDashboard.jsx` and `awcms/src/hooks/useDashboardData.js` is still platform-generic

Impact:

- Operational monitoring described in the PRD cannot yet be performed through product-specific dashboards.

## 3.7 Public-Safe SIKESRA Data Model Is Not Defined Yet

The PRD expects public-safe views limited to approved, non-sensitive information.

Current gap:

- Public infrastructure exists, but there is no SIKESRA-specific public-safe schema, view strategy, or route set implemented for safe welfare information exposure
- No dedicated SIKESRA public view contract appears in current code or migrations

Impact:

- Public portal capability exists as a platform, but SIKESRA-safe public data publication rules are not yet implemented in product code.

## 3.8 DTSEN Readiness Exists Only as Documentation

The PRD requires future read-only DTSEN comparison, isolated reference tables, and proposal-driven discrepancy handling.

Current gap:

- No implementation of DTSEN reference tables, mismatch review tables, or proposal workflows exists in active schema or code
- DTSEN readiness currently lives only in documentation

Impact:

- The repository is conceptually prepared but not technically prepared for the PRD's post-DTSEN comparison model.

## 4. Partially Aligned Areas

## 4.1 Document and Media Foundations

Status: **partial**

- The platform already contains media and storage groundwork
- Cloudflare media and session-bound access patterns exist in recent migrations such as `supabase/migrations/20260308213000_add_session_bound_media_access.sql`
- However, SIKESRA-specific document classes, evidence relationships, and review lifecycle states are not yet modeled

## 4.2 Multi-Tenant Security Foundations

Status: **partial to strong foundation**

- The platform is clearly tenant-aware and already uses a permission and RLS-oriented model
- But the product-specific resource family, workflows, and field sensitivity controls required for SIKESRA still need implementation

## 4.3 Public or Admin Separation

Status: **partial**

- The architecture supports a clean admin/public split
- The SIKESRA-specific safe-public contract still needs to be defined in code and schema

## 5. Recommended Implementation Order

Based on the current repo state, the most efficient next implementation order is:

1. **Create SIKESRA core schema**
   - Add `sikesra_entities`, documents, submissions, verifications, approvals, audit, and micro-region tables
2. **Implement 20D identity rules**
   - Add generation, validation, immutability guards, and unique constraints
3. **Introduce SIKESRA permission families**
   - Seed `tenant.sikesra_*` permissions and bind them to routes and workflows
4. **Build SIKESRA admin modules**
   - Registry lists, detail screens, forms, verification inboxes, and approval views
5. **Add document and evidence workflows**
   - Required document classes, reviewer states, and signed evidence access paths
6. **Build SIKESRA dashboards**
   - Queue, completeness, region workload, and review bottleneck monitoring
7. **Define public-safe views**
   - Public-safe aggregates and approved informational surfaces only
8. **Prepare DTSEN-ready structures**
   - Reference tables, mismatch handling, and proposal-driven comparison logic

## 6. Readiness Summary

| Area | Status | Notes |
| --- | --- | --- |
| AWCMS platform baseline | Ready | Core admin, public, Supabase, and edge foundations are present |
| SIKESRA schema | Not ready | No active `sikesra_*` schema implementation yet |
| 20D identity | Not ready | Only documented, not implemented |
| SIKESRA workflow | Not ready | No dedicated submission, verification, and approval modules yet |
| Document governance | Partial | Platform media exists, product evidence model missing |
| Dashboards | Partial | Generic dashboards exist, SIKESRA KPIs missing |
| Public-safe data model | Partial | Public architecture exists, SIKESRA-safe views missing |
| DTSEN readiness | Concept only | Documented but not implemented |

## References

- [PRD.md](PRD.md) - Expanded SIKESRA MVP PRD used as the comparison baseline
- [USER_STORY.md](USER_STORY.md) - Updated user-story layer for the expanded PRD
- [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) - Updated validation layer for the expanded PRD
