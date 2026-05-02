# Cloudflare Edge JWT, Permissions, And AI Planning Plan 2026

## Purpose

This document captures the next planning pass for AWCMS Mini SIKESRA after the Cloudflare runtime, Turnstile, R2, and initial `/api/v1/*` baseline work landed.

This revision assumes the intended production topology is now:

- AWCMS Mini SIKESRA hosted on Cloudflare
- PostgreSQL hosted on a VPS managed through Coolify
- Cloudflare edge services used for abuse defense, object storage, and external-client API delivery where appropriate

It is based on:

- current AWCMS Mini SIKESRA requirements, docs, and implementation
- current EmDash-first repository constraints and plugin/admin model
- current local EmDash workspace conventions around plugin descriptors, plugin definitions, and auth descriptors
- current Cloudflare Workers guidance for edge runtime and secret handling
- current OWASP guidance for REST security, JWT handling, and serverless/API security
- current `jose` guidance for JWT signing and verification in Web-interoperable runtimes

## Current Baseline

### Confirmed Repository State

- AWCMS Mini SIKESRA remains EmDash-first and single-tenant.
- The supported runtime baseline is now Cloudflare-hosted, with PostgreSQL remaining the single system of record on a Coolify-managed VPS.
- The repo already exposes a versioned `/api/v1/*` edge API baseline, but it currently reuses the existing identity session rather than a dedicated JWT-based external/mobile API auth model.
- The repo already has a permission catalog plus role-permission matrix handling, but coverage is still strongest in the admin and governance surface rather than a single canonical matrix spanning core features, plugins, and edge APIs.
- The repo currently has one broad planning prompt artifact in `sikesrakobar_emdash_implementation_planning_prompt.md` and now also includes workflow-specific AI planning templates under `docs/process/ai-workflow-planning-templates.md`.

### Confirmed EmDash Alignment Notes

- The installed `emdash` package is now aligned to the reviewed `0.9.0` baseline.
- The local EmDash workspace continues to emphasize a split between plugin descriptors and runtime plugin definitions.
- EmDash exposes explicit auth-provider descriptors and capability-gated plugin contexts rather than encouraging ad hoc auth or plugin-specific security models.
- Mini should keep extending those seams rather than creating a second auth or permission platform beside EmDash.

### Confirmed Security Gap Summary

- External/mobile edge API auth still needs a stateless token model designed for Cloudflare-hosted request handling.
- Permission coverage still needs a single authoritative matrix that maps core features, plugin routes/services, and edge endpoints to the same canonical permission catalog.
- AI-assisted planning guidance now has task-specific templates, but those templates should continue to expand only through the documented issue-driven workflow and documentation authority order.

## Planning Goal

Add or improve the following without breaking EmDash-first rules:

1. JWT support for Cloudflare-hosted edge APIs used by mobile or other external clients
2. a proper permission matrix across core features, plugins, and edge functions
3. repo-local AI planning templates for documentation, feature, and development workflows

These changes should preserve the current architecture rules:

- EmDash remains the host architecture and admin/plugin surface
- PostgreSQL remains the single system of record
- Mini-specific auth and permission work remains additive in services, edge routes, and docs
- external/mobile APIs remain separate from `/_emdash/api/*`
- AI templates improve workflow discipline and documentation quality, not architectural authority

## Recommended Workstreams

### 1. JWT For Edge APIs

Mini should move the external/mobile edge API surface from identity-session reuse to an explicit JWT-based model that is purpose-built for `/api/v1/*`.

Current status:

- `/api/v1/health`, `/api/v1/token`, and `/api/v1/session` exist
- protected edge routes now accept JWT Bearer tokens and still keep the host identity session as a compatibility fallback
- `/api/v1/token` now issues short-lived JWT access tokens plus opaque rotation-backed refresh tokens stored in PostgreSQL

Recommended direction:

- keep EmDash admin and plugin auth on the current host/session boundary
- add a dedicated external/mobile API auth service for `/api/v1/*`
- issue short-lived access tokens as JWTs and keep longer-lived refresh tokens opaque and rotation-backed
- store refresh-token state, revocation state, and audit data in PostgreSQL
- keep edge handlers thin and route all security-sensitive state changes through shared Mini services

Recommended token model:

- Access tokens:
  - short TTL, preferably 5 to 15 minutes
  - signed with `jose` in a Cloudflare-compatible runtime
- the current implementation uses `HS256` through `jose` with explicit algorithm allowlisting
- include explicit `iss`, `aud`, `sub`, `iat`, and `exp`
  - include only minimal authorization claims needed for edge enforcement
- Refresh tokens:
  - opaque, random, high-entropy values
  - hashed at rest in PostgreSQL
  - one-time rotation on use
  - revocable per client or per device
  - bound to explicit audience/client type metadata

Recommended verification rules:

- enforce an explicit allowed algorithm list
- reject `alg=none` and algorithm confusion paths
- verify issuer, audience, expiration, not-before, and key id expectations
- keep JWT claims minimal and never treat client-supplied role text alone as the full authorization truth
- treat user status, soft-delete state, and protected-account rules as server-side checks where applicable

Cloudflare and deployment notes:

- keep signing keys in Cloudflare-managed secrets
- if a separate verifier or multiple runtimes need verification, expose or generate a JWKS-friendly verification path
- keep database-backed token and permission flows behind the Hono backend API rather than introducing direct edge-to-PostgreSQL transport
- apply Cloudflare WAF and rate limiting to token issuance and refresh endpoints
- add Turnstile where public token-grant or low-trust onboarding endpoints warrant it

### 2. Canonical Permission Matrix Coverage

Mini should complete a single authoritative permission matrix that spans core governance features, plugin-declared capabilities, and edge API endpoints.

Current status:

- core permissions and role-permission matrix support already exist
- plugin permission registration already normalizes plugin-declared permissions into the same catalog shape
- edge APIs now have canonical self-service session permissions for the current `/api/v1/session` baseline, but broader edge route coverage still needs to expand as more external/mobile endpoints land
- repo docs now need to keep a maintained feature-to-permission inventory covering core, plugins, and edge functions together as the surface grows

Recommended direction:

- keep `scope.resource.action` permission codes as the canonical naming model
- define a documented permission inventory for every current first-party feature surface
- keep backend service authorization as the authority, with route metadata and UI visibility treated as convenience layers
- require edge routes to declare required permissions and map them through the same authorization services used elsewhere
- require plugin descriptors, plugin definitions, and plugin route guards to stay aligned to the same normalized permission catalog

Recommended first coverage areas:

- users and profiles
- roles and role assignments
- permission catalog and matrix changes
- jobs, titles, levels, and assignments
- logical regions and administrative regions
- security settings, 2FA operations, sessions, lockouts, and audit logs
- R2-backed media/object workflows as they land
- edge API session, token, and future external-client resource endpoints

Recommended supporting work:

- add a documented permission matrix inventory for current first-party features
- add tests that assert edge routes and plugin routes declare permissions consistently
- add gap checks so newly added first-party features do not bypass the catalog
- keep protected or high-risk permissions explicitly marked for step-up or stronger review paths

### 3. AI Workflow Planning Templates

Mini should add compact, reusable prompt templates for common AI-assisted repository workflows rather than relying only on one broad planning prompt.

Current status:

- `sikesrakobar_emdash_implementation_planning_prompt.md` exists as a broad planning artifact
- the repo now provides focused templates for docs updates, issue-driven feature planning, implementation execution, security review, and release-readiness work

Recommended direction:

- keep templates repository-local and grounded in `REQUIREMENTS.md`, `AGENTS.md`, `README.md`, and `DOCS_INDEX.md`
- make templates workflow-specific and issue-driven
- separate planning, documentation, implementation, security review, and release-readiness prompts
- ensure every template reinforces the same rules:
  - EmDash-first architecture
  - issue-first workflow
  - real-state documentation
  - focused validation and atomic scope

Recommended initial templates:

- documentation update template
- feature planning and issue decomposition template
- implementation execution template
- security hardening or review template
- release or migration checklist update template

## Security Standards And Recommendations

### OWASP-Driven Requirements

- keep HTTPS-only delivery for all public and edge API endpoints
- enforce authentication and authorization on every protected API endpoint
- validate JWT issuer, audience, expiration, not-before, and algorithm expectations explicitly
- use short-lived access tokens and rotate refresh tokens on use
- avoid storing secrets or sensitive session state in JWT payloads
- keep generic error responses for authentication-sensitive and recovery-sensitive paths where feasible
- validate request content types, sizes, and methods consistently
- log security-sensitive token issuance, refresh, revoke, and permission-mutation events
- follow serverless guidance to keep functions thin, secrets externalized, and least-privilege configuration enforced

### Cloudflare-Specific Requirements

- store signing keys and JWT-related secrets in Cloudflare-managed secrets
- prefer Web Crypto-compatible JWT tooling such as `jose`
- keep edge APIs behind Cloudflare rate limiting, WAF, and observability controls
- keep external/mobile API routing versioned and separate from `/_emdash/api/*`
- prefer private bindings and platform-native transport layers instead of avoidable internal HTTP hops
- keep PostgreSQL access narrow, TLS-protected, and operationally separated from the public edge

### PostgreSQL And Coolify Requirements

- store refresh-token metadata, revocation state, and audit events in PostgreSQL
- hash opaque refresh tokens at rest
- use TLS for app-to-database traffic
- keep `pg_hba.conf` and firewall rules scoped narrowly to the Cloudflare-approved app path or transport layer
- avoid superuser credentials for runtime token and permission services
- keep PostgreSQL hardening and runtime least-privilege requirements in place even when edge-facing API surfaces grow

## Proposed Execution Order

1. add repo-local AI workflow planning templates and references so future work follows the documented workflow more consistently
2. define and document the canonical permission matrix inventory across core, plugins, and edge APIs
3. add JWT issuance, refresh, verification, and revocation support for `/api/v1/*`
4. move protected edge routes onto canonical permission enforcement using the shared matrix and services

This order reduces rework because the JWT model should consume a stable permission contract, and the AI templates help keep the next implementation pass issue-driven and well-scoped.

## Proposed Issue Breakdown

### Issue A: Add AI Workflow Planning Templates

Recommended SIKESRA issue: create or use a scoped issue

- add repository-local prompt templates for docs, feature planning, implementation, and security review work
- align them with documentation authority and issue-driven workflow rules
- link them from the maintained docs index and process docs

### Issue B: Complete Canonical Permission Matrix Coverage

Recommended SIKESRA issue: create or use a scoped issue

- document the first-party permission inventory across core, plugins, and edge APIs
- fill current permission catalog gaps for first-party features
- define edge-route permission declaration and enforcement rules
- add focused validation for permission coverage and consistency

### Issue C: Add JWT-Based Edge Auth For External And Mobile APIs

Recommended SIKESRA issue: create or use a scoped issue

- add JWT issuance, verification, refresh, and revocation support for `/api/v1/*`
- use Cloudflare-compatible key handling and `jose`-style verification patterns
- keep refresh-token state and auditability in PostgreSQL
- document token security, key rotation, and edge auth operations

## Validation Expectations

For planning and template docs work:

- docs review against current code and constraints
- `pnpm lint`

For implementation issues created from this plan:

- `pnpm check`
- issue-specific unit tests
- edge auth smoke tests for issuance, refresh, revocation, and protected route access

## Cross-References

- `docs/process/cloudflare-platform-expansion-plan-2026.md`
- `docs/architecture/constraints.md`
- `docs/architecture/overview.md`
- `docs/governance/auth-and-authorization.md`
- `docs/plugins/contract-overview.md`
- `docs/process/ai-workflow-planning-templates.md`
- `sikesrakobar_emdash_implementation_planning_prompt.md`

## External Guidance References

- Cloudflare Workers guidance for secret handling and edge runtime behavior
- OWASP REST Security Cheat Sheet
- OWASP JSON Web Token guidance
- OWASP Serverless and API security guidance
- `jose` documentation for JWT signing and verification in Web-interoperable runtimes
