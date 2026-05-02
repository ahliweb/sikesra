# Cloudflare Hostname, Turnstile, And R2 Automation Plan 2026

## Purpose

This document captures the next planning pass for AWCMS Mini SIKESRA after the Cloudflare-hosted runtime, Turnstile baseline, R2 storage baseline, and JWT-backed edge API work landed.

This revision focuses on the next operator-facing automation layer for the supported production baseline:

- AWCMS Mini SIKESRA hosted on Cloudflare
- PostgreSQL hosted on a VPS managed through Coolify
- EmDash remaining the host runtime and admin architecture
- Cloudflare-managed hostnames, abuse controls, and object storage configured through repeatable automation paths

It is based on:

- current AWCMS Mini SIKESRA requirements, docs, and implementation
- current EmDash-first repository constraints and current EmDash `0.9.0` alignment
- current Cloudflare Workers custom-domain guidance
- current Cloudflare Turnstile server-side validation guidance
- current Cloudflare R2 bucket and custom-domain guidance
- current OWASP guidance for deployment, authentication, and file-upload security

## Current Baseline

### Confirmed Repository State

- AWCMS Mini SIKESRA remains EmDash-first and single-tenant.
- The supported app runtime baseline is Cloudflare-hosted.
- PostgreSQL remains the single system of record and is expected to remain on a protected VPS managed through Coolify.
- `wrangler.jsonc` already defines the Worker baseline, static asset binding, and observability, but does not yet declare custom-domain routes, R2 bindings, or environment-specific hostname separation.
- Turnstile server-side validation already exists for selected public flows when `TURNSTILE_SECRET_KEY` is configured.
- The repository already has a private-by-default R2 storage service baseline, but the deployment docs still assume operator-managed binding configuration rather than full Cloudflare MCP-assisted automation.
- The repository already exposes `/api/v1/*` under the Cloudflare-hosted runtime and keeps the EmDash admin surface under `/_emdash/admin`.

### Confirmed Deployment Gap

- The repo does not yet document or automate separate public and admin subdomains for the same AWCMS Mini SIKESRA deployment.
- The repo does not yet document a full automation plan for provisioning `sikesrakobar.ahlikoding.com` and `sikesrakobar.ahlikoding.com` through Cloudflare-managed custom domains.
- The repo does not yet document a full automation plan for Turnstile widgets and hostname management across both target subdomains.
- The repo does not yet document a full automation plan for creating and binding the `sikesra` R2 bucket.
- The currently available Cloudflare MCP session did not return visible zone, Worker, KV, custom-domain, or R2 inventory during this planning pass, so the plan below should be treated as the intended automation path and verified against live account state during implementation.

## Planning Goal

Add or improve the following capabilities without breaking EmDash-first rules:

1. automatically configure `sikesrakobar.ahlikoding.com` as the Cloudflare-managed public hostname for the AWCMS Mini SIKESRA public website
2. automatically configure `sikesrakobar.ahlikoding.com` as the Cloudflare-managed admin hostname for the AWCMS Mini SIKESRA admin entry path
3. automatically provision and enable Cloudflare Turnstile for the relevant public and admin-facing auth flows on those hostnames
4. automatically provision and bind the Cloudflare R2 bucket `sikesra`
5. keep all of the above aligned with Cloudflare-hosted Mini runtime behavior, current EmDash host architecture, and PostgreSQL on a Coolify-managed VPS

These changes should preserve the current architecture rules:

- EmDash remains the host runtime and admin shell
- Mini does not create a second admin platform or a parallel application core
- PostgreSQL remains the canonical system of record
- Cloudflare services are used through deployment/runtime seams, bindings, and managed configuration rather than ad hoc in-app control planes
- public and admin hostnames stay operationally distinct even if they point at the same Worker deployment

## Recommended Workstreams

### 1. Public And Admin Hostname Automation

Mini should formally support separate browser-facing hostnames for the public site and the admin entrypoint:

- `sikesrakobar.ahlikoding.com`
- `sikesrakobar.ahlikoding.com`

Recommended direction:

- keep a single Cloudflare-hosted Worker deployment as the default application runtime unless a later operational need justifies splitting public and admin traffic into separate Workers
- configure both hostnames as Cloudflare-managed custom domains for the Worker, because Cloudflare custom domains make the Worker the origin and automatically manage the DNS path for the hostname
- treat `sikesrakobar.ahlikoding.com` as the canonical `SITE_URL` for public pages and public auth flows
- treat `sikesrakobar.ahlikoding.com` as an allowed operator-facing hostname for the EmDash admin entrypoint and associated session flows
- add explicit documentation and runtime rules for canonical-host handling so public pages do not drift across both hostnames unintentionally

Recommended implementation shape:

- keep `wrangler.jsonc` or environment-specific Wrangler config as the declarative source for Worker custom domains where practical
- use Cloudflare MCP or equivalent Cloudflare-managed automation to ensure both custom domains are attached to the intended Worker in the reviewed Cloudflare account
- verify the target zone for `ahlikoding.com` exists and capture the zone ID during implementation
- document whether the admin hostname should:
  - serve the full app shell with admin-first navigation, or
  - redirect directly to `/_emdash/admin` while preserving same-host auth/session behavior

Recommended routing rules:

- `sikesrakobar.ahlikoding.com` should serve the public site and public auth flows
- `sikesrakobar.ahlikoding.com` should serve the admin entrypoint and operator auth flows
- both hostnames should terminate on Cloudflare-managed TLS
- if both hostnames point to the same Worker, hostname-aware middleware or route handling should keep public and admin UX separated clearly

Operational notes:

- admin hostname separation improves operator clarity and can simplify Cloudflare WAF and access-rule targeting
- this is hostname separation, not a second application platform
- the admin hostname should not become a public edge API hostname for third-party/mobile use cases

### 2. Turnstile Provisioning And Hostname Management

Turnstile should be provisioned and documented as part of the Cloudflare deployment automation path for the target hostnames.

Recommended direction:

- provision at least one Turnstile widget for AWCMS Mini SIKESRA using Cloudflare-managed automation
- bind the widget configuration to the intended production hostnames rather than treating Turnstile as a free-floating global secret
- continue server-side Siteverify validation for every protected flow
- validate hostname and expected action in the server-side response for any flow that depends on a specific hostname or widget context

Recommended first protected flows:

- public login on `sikesrakobar.ahlikoding.com`
- password-reset request on `sikesrakobar.ahlikoding.com`
- invite activation or similar public onboarding routes on `sikesrakobar.ahlikoding.com`
- any admin login or operator-facing unauthenticated flow exposed on `sikesrakobar.ahlikoding.com`

Recommended widget strategy:

- prefer separate widgets or clearly separated action values for public and admin-facing flows if that improves analytics and incident isolation
- if a shared widget is used across multiple hostnames, ensure hostname validation remains explicit in Siteverify handling
- do not rely on client-only validation or widget presence as the security decision point

Cloudflare guidance reflected here:

- Siteverify remains mandatory server-side
- tokens are short-lived and single-use
- hostname validation should be enforced when deployment assumptions depend on known hostnames
- action validation should be enforced when route-specific widgets use distinct action names
- secrets must remain server-only and Cloudflare-managed

### 3. R2 Bucket Provisioning And Binding Automation

Mini should formally support automated creation and configuration of the R2 bucket `sikesra`.

Recommended direction:

- create `sikesra` through Cloudflare-managed automation for the reviewed Cloudflare account
- bind the bucket into the Cloudflare-hosted runtime using the existing private-by-default runtime contract
- keep PostgreSQL as the system of record for ownership, authorization state, lifecycle state, and future metadata tables
- do not expose the bucket as a broad public-write or public-list surface

Recommended binding model:

- keep the runtime binding name aligned to the current code path, which defaults to `MEDIA_BUCKET`
- set `R2_MEDIA_BUCKET_BINDING=MEDIA_BUCKET`
- set `R2_MEDIA_BUCKET_NAME=sikesra`
- update `wrangler.jsonc` to declare the R2 binding once the bucket is provisioned

Recommended access model:

- private-by-default bucket access
- application-controlled object keys
- allowlisted content types and file size limits enforced in app code
- controlled download handlers or narrowly scoped signed-access patterns rather than broad public object exposure
- only use an R2 custom domain if a concrete product requirement emerges for public asset delivery; do not make this the default path for governance-sensitive uploads

Cloudflare guidance reflected here:

- use Worker bindings for runtime access
- do not depend on unsupported S3 ACL semantics for R2 authorization
- if a custom domain is added later for asset delivery, configure it explicitly against the bucket and zone, and keep authorization strategy separate from bucket naming alone

### 4. Cloudflare MCP Automation Layer

Mini should treat Cloudflare MCP automation as an operator-assist deployment seam, not as an always-on in-app control plane.

Recommended direction:

- use the Cloudflare MCP during setup and operational automation to:
  - verify the `ahlikoding.com` zone and its zone ID
  - create or attach Worker custom domains for the public and admin hostnames
  - create the `sikesra` bucket if it does not exist
  - verify or configure Worker bindings and related secrets
  - create or update Turnstile-related assets when the MCP surface supports them directly
- keep the resulting runtime configuration declarative in repo-managed config and docs where practical
- prefer idempotent setup commands or scripts so repeated provisioning attempts do not create drift

Important limitation for the current planning pass:

- the currently available Cloudflare MCP inventory calls did not return visible resource data, so implementation must include a first validation step to confirm the accessible zone, Worker, and R2 state for the reviewed Cloudflare account

### 5. EmDash Alignment For Split Hostnames

Mini must keep admin operations inside the EmDash admin experience even when a separate admin hostname is introduced.

Recommended direction:

- preserve `/_emdash/admin` as the canonical admin route surface
- use the admin hostname only as a dedicated entry host for that same EmDash admin surface
- do not create a second admin shell, second login subsystem, or separate identity store for the admin hostname
- ensure the host/session boundary remains compatible across public and admin hostnames, with explicit cookie-domain and secure-cookie review during implementation

Recommended validation questions for implementation:

- should auth cookies remain host-only to reduce cross-host exposure, or is a shared parent-domain cookie required for the intended user experience?
- if host-only cookies are used, are login and admin entry flows clear enough for operators moving between `sikesrakobar.ahlikoding.com` and `sikesrakobar.ahlikoding.com`?
- if shared cookies are used, are `SameSite`, `Secure`, and origin checks still tight enough for the threat model?

The default recommendation is to prefer host-only cookies unless a concrete cross-host operator workflow requires otherwise.

## Security Standards And Recommendations

### OWASP-Driven Requirements

- keep HTTPS-only delivery on both hostnames
- keep strict access control at every protected admin and edge endpoint
- validate Turnstile tokens server-side and reject replayed, invalid, or hostname-mismatched tokens
- use generic errors for authentication-sensitive and recovery-sensitive flows where feasible
- keep request-size limits and content-type validation on upload and API surfaces
- keep file-upload defense-in-depth for any R2-backed upload surface
- keep audit logs and security-event coverage for privileged admin and recovery actions
- separate operational roles and secrets so provisioning automation does not expand runtime privileges unnecessarily

### Cloudflare-Specific Requirements

- use Worker custom domains for `sikesrakobar.ahlikoding.com` and `sikesrakobar.ahlikoding.com` when the Worker is the origin
- keep Cloudflare-managed TLS enabled on both hostnames
- use hostname-aware WAF, rate limiting, and managed challenge policies where admin and public traffic need different controls
- store Turnstile and runtime secrets in Cloudflare-managed secrets or equivalent server-only secret storage
- validate Turnstile hostname values explicitly when multiple hostnames are in play
- keep observability enabled for the Worker deployment and monitor host-specific anomalies
- keep R2 private by default and use bindings rather than in-app REST credentials for routine runtime access

### PostgreSQL And Coolify Requirements

- keep PostgreSQL private behind the Coolify-managed VPS boundary
- use TLS for database traffic from the Cloudflare-hosted runtime
- keep `pg_hba.conf` and network rules scoped narrowly
- use non-superuser runtime credentials
- keep PostgreSQL access behind the reviewed Hono backend path rather than adding a direct Cloudflare-to-database transport layer

### Hostname And Session Recommendations

- treat the public and admin hostnames as separate trust surfaces even when they terminate on the same Worker
- prefer host-only cookies unless a reviewed operator workflow requires cross-subdomain session sharing
- keep CSRF, origin, and redirect validation aligned with the exact allowed hostnames
- ensure canonical-host logic does not expose admin-only flows through the public hostname by accident

### R2 And Upload Recommendations

- do not trust client-provided file names or `Content-Type`
- keep generated object keys application-owned
- keep uploads behind authenticated and authorized application handlers
- consider malware scanning or quarantine review if the accepted document set expands beyond tightly controlled assets
- avoid public write paths and unaudited public read paths

## Proposed Execution Order

1. validate live Cloudflare account and zone access for the reviewed Cloudflare account
2. add Worker custom-domain automation for `sikesrakobar.ahlikoding.com` and `sikesrakobar.ahlikoding.com`
3. add hostname-aware runtime and session configuration for public vs admin entry flows
4. add Turnstile provisioning and hostname-aware validation updates for the selected public and admin flows
5. create and bind the `sikesra` R2 bucket
6. add deployment smoke tests and operator runbooks for the automated setup path

This order reduces rework because Turnstile hostname enforcement and any host-aware session behavior depend on the hostname model being explicit first, while the R2 bucket can then be attached cleanly to the already validated runtime deployment.

## Proposed Issue Breakdown

### Issue A: Validate Cloudflare Zone And Custom-Domain Automation Baseline

Recommended SIKESRA issue: create or use a scoped issue

- confirm the accessible Cloudflare zone for `ahlikoding.com` and record the required zone ID
- document or automate Worker custom-domain provisioning for `sikesrakobar.ahlikoding.com`
- document or automate Worker custom-domain provisioning for `sikesrakobar.ahlikoding.com`
- define the runtime rule for public vs admin hostname handling

### Issue B: Add Hostname-Aware Runtime And Admin Entry Rules

Recommended SIKESRA issue: create or use a scoped issue

- define canonical host handling in runtime docs and code where needed
- ensure the admin hostname maps cleanly to the EmDash admin entrypoint without creating a second admin shell
- review cookie, origin, redirect, and CSRF handling across the public and admin hostnames

### Issue C: Automate Turnstile Provisioning For Public And Admin Hostnames

Recommended SIKESRA issue: create or use a scoped issue

- provision Turnstile assets for the target hostnames using Cloudflare-managed automation where available
- update runtime configuration and docs for multi-hostname Turnstile handling
- extend hostname-aware Turnstile validation for the selected flows
- document analytics and abuse-response expectations

### Issue D: Automate R2 Bucket Provisioning And Binding For `sikesra`

Recommended SIKESRA issue: create or use a scoped issue

- create the R2 bucket `sikesra`
- bind the bucket to the Worker as `MEDIA_BUCKET`
- update runtime and deployment docs for the bucket binding and operator checks
- validate the private-by-default access path against the current R2 storage service baseline

### Issue E: Add Cloudflare Automation Smoke Tests And Operator Runbook Updates

Recommended SIKESRA issue: create or use a scoped issue

- add deployment validation steps for hostname, Turnstile, and R2 automation
- document operator smoke tests for public hostname, admin hostname, Turnstile-protected flows, and R2 binding availability
- document rollback expectations if automated Cloudflare provisioning only partially succeeds

## Validation Expectations

For planning and documentation work:

- review docs against the current repository state and current planning constraints
- `pnpm lint`

For follow-up implementation issues created from this plan:

- `pnpm check`
- issue-specific Cloudflare automation verification steps
- smoke tests for public hostname, admin hostname, Turnstile validation, and R2 binding availability

## Cross-References

- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/cloudflare-platform-expansion-plan-2026.md`
- `docs/process/cloudflare-edge-jwt-permissions-ai-plan-2026.md`
- `docs/architecture/runtime-config.md`
- `docs/security/operations.md`
- `docs/process/cloudflare-coolify-origin-hardening.md`

## External Guidance References

- Cloudflare Workers custom domain routing guidance
- Cloudflare Turnstile Siteverify and hostname-management guidance
- Cloudflare R2 bucket creation, binding, and custom-domain guidance
- OWASP Authentication Cheat Sheet
- OWASP REST Security Cheat Sheet
- OWASP File Upload Cheat Sheet
