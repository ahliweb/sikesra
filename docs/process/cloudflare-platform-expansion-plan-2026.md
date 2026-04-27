# Cloudflare Platform Expansion Plan 2026

## Purpose

This document captures the next planning pass for AWCMS Mini SIKESRA after the earlier alignment and security work landed.

This revision assumes the intended production topology is now:

- AWCMS Mini SIKESRA hosted on Cloudflare
- PostgreSQL hosted on a VPS managed through Coolify
- Cloudflare-provided edge services used for abuse defense, object storage, and edge API handling where appropriate

It is based on:

- current AWCMS Mini SIKESRA docs, implementation, and scripts
- current EmDash-first repository constraints and plugin/admin model
- Astro Cloudflare adapter guidance
- Cloudflare Turnstile, R2, and Workers guidance
- current OWASP guidance for authentication, file upload, and REST security

## Current Baseline

### Confirmed Repository State

- AWCMS Mini SIKESRA remains EmDash-first and single-tenant.
- The repository now exposes a Cloudflare adapter runtime baseline and keeps the Node adapter only as an explicit fallback target during migration.
- PostgreSQL remains the canonical system of record and Kysely remains the canonical migration/query layer.
- Soft delete already exists for part of the mutable identity and governance model.
- Cloudflare Turnstile, R2 integration, and Cloudflare-hosted edge API functions are not yet formalized in the current plan or runtime contract.

### Current Soft Delete State

- The architecture constraints already require soft delete for mutable identity and governance entities.
- Migrations and repositories already use `deleted_at` across key entities such as users, roles, permissions, job levels, job titles, and regions.
- Soft delete now has explicit restore/delete lifecycle primitives across the current mutable governance catalogs, but follow-on admin UX work may still be needed where routes exist before full screen affordances do.

### Current Deployment Gap

- The repo now documents and configures a Cloudflare-hosted runtime baseline while keeping PostgreSQL remote on a Coolify-managed VPS.
- The remaining deployment work is follow-on integration detail around reviewed frontend delivery, Hono integration, and feature-specific Cloudflare services.

## Planning Goal

Add or complete the following feature set without breaking EmDash-first rules:

1. consistent soft delete behavior for mutable entities
2. Cloudflare Turnstile for abuse-prone public flows
3. Cloudflare R2 bucket integration for object storage
4. Cloudflare edge functions for mobile or other API requests

These changes should preserve the current architecture rules:

- EmDash remains the host architecture
- PostgreSQL remains the single system of record
- Mini-specific work remains additive in services, plugins, runtime integration, and admin extensions
- Cloudflare services should be used through supported platform seams, not by creating a parallel application platform inside Mini

## EmDash Alignment Direction

### Keep

- EmDash as the runtime/admin/plugin host model
- Mini governance features as overlays
- service-layer authorization and auditability
- PostgreSQL plus Kysely as the canonical data layer

### Extend

- Move hosting alignment from Node adapter assumptions toward the Cloudflare adapter/runtime path used by Astro-compatible deployments
- keep plugin and admin extensions inside the EmDash model even when some request handling shifts to Cloudflare-hosted edge code
- treat edge APIs as an extension seam, not as a second independent platform core

## Recommended Workstreams

### 1. Cloudflare Runtime Alignment

Mini should establish a supported Cloudflare-hosted runtime baseline before adding feature-specific integrations.

Recommended direction:

- evaluate migration from `@astrojs/node` to `@astrojs/cloudflare`
- add Cloudflare deployment configuration such as `wrangler.jsonc` when the adapter move lands
- define runtime bindings for edge-hosted services instead of assuming local Node-only process access
- document the new production baseline as Cloudflare-hosted app plus Coolify-managed PostgreSQL
- keep PostgreSQL access behind the Hono backend API when adding Cloudflare-hosted frontend or edge features

Security and operational notes:

- keep PostgreSQL remote and private
- require TLS for database connectivity
- avoid exposing the database directly to public internet traffic
- treat Cloudflare-hosted app runtime and the Coolify-managed database host as separate trust boundaries

### 2. Soft Delete Consistency

Soft delete should be completed as a lifecycle standard for mutable identity, governance, catalog, and content-adjacent records that are operator-managed.

Recommended direction:

- define the authoritative list of entities that must support soft delete
- confirm repositories exclude soft-deleted rows by default
- add explicit restore/include-deleted/read-history paths where operators need them
- standardize `deleted_at`, `deleted_by_user_id`, and `delete_reason` usage where attribution matters
- keep append-only tables such as audit logs, security events, tokens, and auth-history tables out of soft delete flows
- keep effective-dated assignment/history tables using `ends_at` or `expires_at`, not `deleted_at`

Security and correctness notes:

- soft delete should not silently bypass authorization or audit requirements
- admin screens should distinguish active, soft-deleted, and historical records clearly
- restore flows should be explicit and auditable

### 3. Cloudflare Turnstile

Turnstile should be added as an abuse-defense layer for public or abuse-prone endpoints, not as a substitute for authentication or authorization.

Current status:

- server-side Turnstile validation now protects login and password-reset request handlers when `TURNSTILE_SECRET_KEY` is configured
- follow-on work may still expand Turnstile coverage to additional public onboarding or edge API flows

Recommended first targets:

- login
- password reset request
- invite activation or other public onboarding endpoints if those are publicly routable
- public edge API endpoints that are likely to receive unauthenticated or low-trust traffic

Implementation rules from Cloudflare guidance:

- server-side Siteverify validation is mandatory
- tokens are single-use and short-lived, so the backend must reject replayed or expired tokens
- hostname validation should be enforced where the deployment model requires it
- the secret must be stored in Cloudflare-managed secrets/bindings, not in source or public config
- expected action values should be validated where action-specific widgets are used

Security notes:

- Turnstile is an abuse-control layer, not an identity signal
- failed validation should not produce account-enumerating responses
- pair Turnstile with application rate limiting and Cloudflare WAF/rate-limiting rules

### 4. Cloudflare R2 Integration

R2 should be the object storage layer for operator-managed uploads or media-like assets when Mini needs object storage beyond PostgreSQL.

Current status:

- Mini now has a binding-backed R2 storage service baseline with private-by-default assumptions, application-generated object keys, and allowlist/size validation
- follow-on work is still needed to add concrete metadata tables, upload UI/routes, and controlled download handlers for specific product surfaces

Recommended design:

- keep PostgreSQL as the source of truth for metadata, ownership, authorization state, and lifecycle state
- keep binary objects in R2
- access R2 from Cloudflare-hosted runtime code through bindings, not by calling Cloudflare REST APIs from inside the runtime
- use private-by-default buckets
- use controlled download handlers or presigned URLs for object access instead of making broad buckets public by default

Upload/download guidance:

- generate application-owned object keys instead of trusting user filenames
- allowlist content types and extensions
- enforce file size limits
- validate content type and, where appropriate, file signatures
- keep object metadata and authorization decisions in PostgreSQL
- use multipart upload only when object size requires it

Security notes from OWASP and Cloudflare guidance:

- do not trust user-provided `Content-Type`
- keep public retrieval limited and auditable
- avoid public write exposure
- consider malware scanning or a review/quarantine path if the system will eventually accept broader document uploads

### 5. Edge Functions For Mobile And External APIs

Mini should add a dedicated edge API surface for mobile or other non-admin clients only when the boundary and workflow rules are explicit.

Current status:

- Mini now exposes a versioned `/api/v1/*` edge API baseline with a public health endpoint and authenticated current-session inspection/revocation
- the current baseline still relies on the existing authenticated identity session rather than a separate token-based mobile auth system
- follow-on work is still needed for broader mobile/external resource APIs and any future stateless token design

Recommended direction:

- use Cloudflare-hosted edge handlers or Workers for versioned API routes
- keep the API stateless and explicit about authentication, authorization, content types, and workflow transitions
- use PostgreSQL as the source of truth through the approved connectivity path
- keep edge functions thin and service-oriented instead of duplicating business logic in many route files
- keep mobile or external API scope separate from admin/plugin routes

Recommended API standards:

- versioned route prefix such as `/api/v1/...`
- narrow CORS policy
- JSON-only request/response contract unless a specific endpoint requires otherwise
- request size limits and content-type validation
- authorization at every endpoint
- generic error responses for authentication and recovery-sensitive paths
- audit logging for security-sensitive mutations

Cloudflare-specific guidance:

- use service bindings or platform bindings where possible instead of internal HTTP hops
- do not introduce direct PostgreSQL connectivity from Workers; route database-backed behavior through Hono instead
- avoid exposing management/admin endpoints as public mobile APIs

## Security Standards And Recommendations

### OWASP-Driven Requirements

- keep HTTPS-only delivery for public and edge API endpoints
- enforce access control at every API endpoint
- use generic error messages for recovery-sensitive and authentication-sensitive flows where feasible
- validate request content types and reject unexpected media types
- apply request size limits and rate limiting to public endpoints
- keep audit logs for security-sensitive events and privileged state changes
- follow file upload defense-in-depth guidance for any R2-backed upload surface

### Cloudflare-Specific Requirements

- validate Turnstile server-side with Siteverify
- store Turnstile secrets in Cloudflare secrets/bindings
- use R2 bindings directly from Cloudflare-hosted code
- keep R2 buckets private by default
- use Cloudflare rate limiting, WAF, or managed challenge rules for exposed abuse-prone routes
- keep observability enabled for Cloudflare-hosted runtime paths and edge APIs

### PostgreSQL And VPS Requirements

- use TLS for app-to-database traffic
- keep `pg_hba.conf` and firewall rules scoped narrowly to the application path
- avoid superuser credentials for runtime access
- keep migration and metadata state in PostgreSQL even if binary objects move to R2

## Proposed Execution Order

1. establish the Cloudflare-hosted runtime and PostgreSQL connectivity baseline
2. complete soft delete lifecycle consistency
3. add Turnstile to public abuse-prone flows
4. add R2-backed object storage with PostgreSQL metadata ownership
5. add versioned edge APIs for mobile or external consumers

This order reduces rework because Turnstile, R2 bindings, and edge APIs all depend on a clear Cloudflare runtime/binding model.

## Proposed Issue Breakdown

### Issue A: Cloudflare Runtime And PostgreSQL Connectivity Alignment

SIKESRA issue: create or use a scoped issue

- migrate or validate Astro/EmDash hosting for Cloudflare runtime support
- define Cloudflare deployment config and bindings
- keep edge runtime code thin and use Hono for PostgreSQL-backed behavior
- update runtime and deployment docs for Cloudflare-hosted Mini plus Coolify-managed PostgreSQL

### Issue B: Soft Delete Lifecycle Completion

SIKESRA issue: create or use a scoped issue

- define and complete soft delete coverage for mutable entities
- add restore/include-deleted operator paths where needed
- document lifecycle and audit rules for soft delete vs append-only vs effective-dated records

### Issue C: Cloudflare Turnstile Integration

SIKESRA issue: create or use a scoped issue

- add Turnstile widget/verification flow to selected public endpoints
- validate Siteverify responses server-side with hostname/action checks where applicable
- document secret handling and edge abuse-defense rules

### Issue D: Cloudflare R2 Object Storage Integration

SIKESRA issue: create or use a scoped issue

- add R2 bucket binding usage for object storage
- keep metadata and authorization state in PostgreSQL
- implement private-by-default object access and upload constraints
- document upload and retrieval security rules

### Issue E: Edge API Surface For Mobile And External Clients

SIKESRA issue: create or use a scoped issue

- add versioned Cloudflare-hosted API endpoints for approved non-admin use cases
- define authentication, authorization, CORS, rate limiting, and audit standards
- document the separation between admin/plugin routes and mobile/external APIs

## Validation Expectations

For planning and docs work:

- docs review against current code and constraints
- `pnpm lint`

For implementation issues created from this plan:

- `pnpm check`
- issue-specific validation commands
- Cloudflare deployment smoke tests where runtime/binding changes land

## Cross-References

- `docs/process/emdash-alignment-and-security-plan-2026.md`
- `docs/architecture/constraints.md`
- `docs/architecture/overview.md`
- `docs/architecture/runtime-config.md`
- `docs/process/postgresql-vps-hardening.md`

## External Guidance References

- Astro Cloudflare adapter guidance
- Cloudflare Turnstile server-side validation guidance
- Cloudflare R2 binding and presigned URL guidance
- Cloudflare Workers best practices and Hono-backed API separation
- OWASP Authentication Cheat Sheet
- OWASP REST Security Cheat Sheet
- OWASP File Upload Cheat Sheet
