# SIKESRA Architecture Constraints

## Purpose

This document freezes the execution constraints for SIKESRA (awcms-mini-sikesra) implementation. It is the repository-local architecture guardrail for all follow-on issues and pull requests.

This document is derived from:

- upstream `awcms-mini/docs/architecture/constraints.md`
- `ahliweb/sikesra` issue tracker
- `docs/process/github-issue-workflow.md`

If an implementation choice conflicts with this document, the implementation should stop and the conflict should be resolved through a new GitHub issue in `ahliweb/sikesra` before work continues.

## Core Rule

SIKESRA is EmDash-first.

This means:

- EmDash is the canonical host architecture.
- EmDash owns the CMS structure, runtime shape, admin baseline, content architecture, auth boundary, and plugin model.
- AWCMS concepts may be used only as non-conflicting governance overlays.
- If EmDash and AWCMS concepts conflict, EmDash wins.

## Canonical Technical Direction

The implementation should assume the following are fixed unless a later issue explicitly changes them:

- Host architecture: EmDash
- Database: PostgreSQL (`sikesrakobar` on VPS `202.10.45.224`)
- Query and migration layer: Kysely
- System model: single-tenant only
- Extension model: EmDash-compatible internal plugins
- Admin model: EmDash admin extended carefully
- Public rendering model: EmDash public/content architecture
- Security model: backend and service-layer enforcement first
- Hosting: Cloudflare Worker (`sikesra-kobar`) at `sikesrakobar.ahlikoding.com`
- Database transport: Hyperdrive (`sikesra-kobar-postgres-runtime`, ID `27eafcdafb5e4904bf083c4133a54161`)

## Scope Guardrails

### Allowed

- EmDash core features used as the foundation
- PostgreSQL-backed EmDash deployment
- Kysely-based migrations, queries, and transactions
- Governance overlay tables and services for:
  - roles hierarchy
  - permissions
  - ABAC refinement
  - job hierarchy
  - logical/detail regions
  - administrative regions
  - 2FA and security controls
  - audit and security event logging
- EmDash-compatible plugin extensions that consume shared governance services
- EmDash admin extensions for governance screens

### Forbidden

- Supabase in any core runtime, database, auth, or migration role
- multi-tenant logic of any kind
- tenant-scoped data model patterns such as `tenant_id`
- direct porting of AWCMS modules/resources outside the EmDash host/plugin model
- a separate competing admin shell outside EmDash
- visual editor work in v1
- universal PostgreSQL RLS as the primary authorization mechanism
- collapsing role hierarchy into job hierarchy
- collapsing logical/detail regions into administrative regions
- expanding Mini into a general ERP platform

## EmDash-First Rules

The following rules are mandatory for all implementation work:

- Prefer extending EmDash through supported runtime, admin, service, and plugin seams.
- Do not recreate core CMS primitives that EmDash already provides.
- Do not bypass EmDash's admin or plugin model to introduce a second platform core.
- Keep Mini-specific code additive wherever possible.
- Prefer shapes that could coexist with upstream EmDash rather than diverge from it.

## Governance Overlay Rules

AWCMS concepts are overlays, not platform ownership.

Allowed overlay behavior:

- add policy metadata,
- add hierarchy metadata,
- add assignment structures,
- add security controls,
- add audit discipline,
- add service-layer authorization rules.

Forbidden overlay behavior:

- replacing EmDash content architecture,
- replacing EmDash plugin architecture,
- replacing EmDash admin with a second admin platform,
- importing AWCMS multi-tenant assumptions into Mini,
- treating jobs or regions as hidden permission systems.

## Data Layer Constraints

PostgreSQL plus Kysely is the canonical data foundation.

This implies:

- all first-party application data should live in PostgreSQL,
- all schema changes should be expressed through Kysely-compatible migrations,
- all multi-step writes should use explicit transaction boundaries,
- SQL behavior should stay visible and reviewable,
- schema design should remain single-tenant and operationally simple.

The implementation must not introduce:

- Supabase-managed migrations,
- Supabase Auth,
- hidden database policy dependence as the main authorization layer,
- architecture that makes Kysely secondary or optional for core data access.

## Soft Delete Constraints

- mutable identity and governance entities should prefer soft delete over hard delete
- the canonical soft delete marker is `deleted_at`
- when operator attribution matters, add `deleted_by_user_id` and `delete_reason`
- repositories should exclude soft-deleted rows by default unless an explicit include-deleted path is requested
- append-only security, audit, token, and event tables should not use soft delete
- effective-dated relationship/history tables should prefer `expires_at` or `ends_at` rather than `deleted_at`
- hard delete should be reserved for maintenance-only workflows, not normal application behavior

## Authorization Constraints

Mini should use hybrid RBAC plus ABAC.

Required rules:

- RBAC is the explicit baseline grant model.
- Permissions should use `scope.resource.action` naming.
- ABAC refines access using user, resource, region, job, and session context.
- Authorization should be enforced in backend services and route guards.
- UI visibility checks are convenience only, not authority.

Forbidden rules:

- ABAC-only authorization with no explicit permission catalog,
- job title or job level as direct permission grants,
- region assignment as automatic unrestricted write authority,
- PostgreSQL RLS as the main v1 policy engine.

## Hierarchy Constraints

### Role Hierarchy

- Roles are authorization constructs.
- Roles may carry `staff_level` metadata.
- Role level may constrain who can administer whom.
- Protected roles must remain explicitly protected.

### Job Hierarchy

- Jobs are organizational constructs.
- Jobs must remain separate from roles.
- Job data may influence ABAC context but must not replace explicit permissions.

### Region Hierarchy

- Logical/detail regions and administrative regions are separate systems.
- Logical regions are for operational/business scope.
- Administrative regions are for legal/geographic scope.
- The two hierarchies must not be collapsed into one model.

## Plugin Constraints

Plugins should remain EmDash-compatible.

Required rules:

- plugin permissions should register into the shared permission model,
- plugin routes should use shared authorization helpers,
- plugin business logic should use shared governance services,
- plugin changes that affect policy or security should be auditable.

Forbidden rules:

- plugins directly bypassing governance services,
- plugins writing arbitrary policy state without shared validation,
- marketplace-grade trust assumptions in v1.

## Admin Constraints

- Governance screens should be implemented as EmDash admin extensions.
- User, role, permission, job, region, security, and audit screens should stay inside the EmDash admin experience.
- Mini must not create a second standalone admin architecture.

## Security Constraints

- TOTP is the v1 2FA mechanism.
- Protected actions should support step-up authentication.
- Password hashing should use a strong modern algorithm such as Argon2id.
- Rate limiting, lockouts, audit logs, and security events are mandatory concerns.
- WebAuthn/passkeys are phase 2, not v1 baseline.

## Sensitive Data Constraints

The following data categories must be treated as sensitive/personal and never logged, exposed in responses, or committed:

- NIK (Nomor Induk Kependudukan)
- KIA (Kartu Identitas Anak)
- No KK (Nomor Kartu Keluarga)
- Religion fields
- Child data
- Elderly/vulnerable-person data
- Disability data
- Contact information
- Health notes
- Documents

## Delivery Constraints

- Work should begin from a GitHub issue in `ahliweb/sikesra`.
- Each issue should stay atomic and dependency-aware.
- Scope expansion should be split into follow-up issues rather than absorbed silently.
- Changes should be validated against the issue acceptance criteria.
- When a task is blocked by architecture ambiguity, stop and resolve it through a new issue.

## Non-Goals

The following are explicitly not goals for SIKESRA v1:

- becoming full AWCMS,
- reproducing AWCMS multi-tenant platform behavior,
- delivering the visual editor,
- becoming a generic ERP platform,
- building a broad third-party plugin marketplace trust model.

## Decision Priority

When multiple documents or assumptions appear to conflict, use this order:

1. GitHub issue scope and acceptance criteria for the active task (`ahliweb/sikesra`)
2. `docs/architecture/constraints.md`
3. `AGENTS.md`
4. `docs/process/github-issue-workflow.md`

If a conflict remains unresolved after applying this order, open a new issue in `ahliweb/sikesra` before implementing further changes.
