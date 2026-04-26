# Repository Docs And Secret Handling Recommendations 2026

## Purpose

This document records the current recommendations and completed alignment status for refreshing core repository guidance, AI workflow planning guidance, local skills, and secret-handling documentation in AWCMS Mini SIKESRA.

It follows the authority order in `REQUIREMENTS.md`, `AGENTS.md`, `README.md`, `DOCS_INDEX.md`, and the focused process/security/runtime docs.

It also follows the issue-driven planning rules in `docs/process/ai-workflow-planning-templates.md`.

## Current Confirmed Baseline

- EmDash `0.7.0` remains the current reviewed package baseline and canonical host architecture.
- AWCMS Mini SIKESRA remains single-tenant, PostgreSQL-backed, and Kysely-based.
- The supported runtime baseline is a Cloudflare-hosted Worker.
- PostgreSQL runs on a VPS managed through Coolify.
- The current reviewed production database transport is Cloudflare Hyperdrive.
- Media/file storage is expected to use the private R2 bucket bound as `MEDIA_BUCKET` with bucket name `sikesra`.
- The reviewed admin browser entry remains `https://sikesrakobar.ahlikoding.com/_emdash/`, which redirects into EmDash's `/_emdash/admin` surface.
- Turnstile still protects the public login, password-reset request, and invite-activation flows when configured.
- The private-database Cloudflare Tunnel path is active again, and the tunnel token is now stored in root-only VPS-managed storage with a monthly rotation timer.
- The reviewed Coolify-managed VPS now uses key-only root SSH recovery; password-based root SSH login is disabled and the root password is locked.

## Confirmed Documentation Alignment Status

### Core Docs And Skills

- `README.md` now reflects the current EmDash `0.7.0` baseline, live Hyperdrive-backed Cloudflare Worker posture, required Worker secret contract, and Coolify locked-secret guidance.
- `AGENTS.md` now records the current live Hyperdrive path and key-only VPS recovery posture.
- `docs/README.md` now references the current active documentation issue map.
- local docs skills now require Worker secret contract and Coolify locked-secret guidance to stay accurate when docs touch credentials or deployment-managed configuration.

### Planning Guidance

- `docs/process/ai-workflow-planning-templates.md` now describes the live Hyperdrive-backed Worker baseline, restored tunnel/connectivity posture, monthly tunnel-token rotation, and key-only VPS recovery.

### Secret Handling And Env Guidance

- `.env.example` now treats `VPS_ROOT_PASSWORD` as retired for this environment and keeps the reviewed recovery posture on key-only SSH.
- `docs/process/secret-hygiene-audit.md` now treats `VPS_ROOT_PASSWORD` as a value that must not be reintroduced into env files or maintained scripts.
- security and operator docs should consistently distinguish:
  - local operator secrets in `.env.local`
  - deployment/runtime secrets in Cloudflare-managed or CI/CD-managed storage
  - VPS connector secrets in root-only server-managed storage
  - Coolify-managed resource secrets in locked Coolify Environment Variables with runtime/build scope set deliberately

## Script Audit Finding

The current maintained `scripts/**` entrypoints reviewed in this pass do not confirm embedded live credentials in tracked repository code.

That means the current task should be framed as:

- documentation and env-guidance alignment
- secret-handling prevention and hardening
- issue-driven follow-up planning

It should not be framed as a confirmed committed-secret incident.

## Recommended Workstreams

### 1. Refresh Core Repository Docs And Skills

SIKESRA issue: create or use a scoped issue

Recommended changes:

- refresh `README.md`, `AGENTS.md`, `DOCS_INDEX.md`, and `docs/README.md`
- update local skills so they describe the current live/runtime posture accurately
- keep the docs explicit about the current Cloudflare Worker, Hyperdrive, R2, Turnstile, and key-only VPS recovery posture
- keep rollout-only controls such as staged 2FA enforcement and ABAC audit-only mode documented carefully

Current status: repository-side core docs and docs-skill refresh complete.

### 2. Update AI Workflow Planning Templates

SIKESRA issue: create or use a scoped issue

Recommended changes:

- update the current repository baseline section
- remove stale blocked-rollout language
- add current operator guardrails for root-only VPS-managed tunnel token storage, monthly tunnel rotation, and key-only SSH recovery
- keep the templates atomic, token-efficient, and issue-driven

Current status: planning template refresh complete.

### 3. Align Secret-Handling Docs And Env Examples

SIKESRA issue: create or use a scoped issue

Recommended changes:

- keep `.env.example` from normalizing `VPS_ROOT_PASSWORD` as an operator variable for this environment
- refresh `docs/process/secret-hygiene-audit.md` and related docs to match the current storage classes
- document the VPS-managed Cloudflare tunnel-token rotation posture accurately
- keep the current script audit statement explicit: no confirmed embedded live credentials in maintained tracked scripts

Current status: repository-side env and secret-handling guidance complete; live Coolify-side confirmation remains tracked separately in the scoped SIKESRA issue.

## Security Recommendations

### OWASP-Aligned

- keep secrets out of source control, stdout, and issue bodies
- prefer least privilege for Cloudflare, Coolify, PostgreSQL, and automation credentials
- keep runtime secrets separate from operator automation secrets
- rotate secrets when exposure is suspected or when a secret remains duplicated longer than necessary
- keep security-sensitive recovery paths auditable and operationally simple
- centralize and standardize secret locations by trust boundary so operators know whether a value belongs in local env files, Cloudflare-managed Worker secrets, Coolify locked secrets, CI/CD secrets, or root-only VPS-managed storage

### Cloudflare-Aligned

- keep production Worker runtime secrets in Cloudflare-managed secrets or CI/CD-managed storage rather than Wrangler `vars`
- keep local Worker secrets in untracked `.env*` or `.dev.vars*` files only, following Cloudflare's local-development guidance
- keep tunnel tokens out of local operator env files once the reviewed VPS-managed path exists
- keep R2 private by default and use Worker bindings instead of embedded object-store credentials in scripts

### Coolify/VPS-Aligned

- use the Coolify-managed SSH key as the reviewed recovery path
- keep password-based root SSH recovery disabled unless a separately reviewed incident explicitly reintroduces it
- keep root-only server-managed files for tunnel runtime and rotation material protected with restrictive permissions
- use Coolify Environment Variables marked as locked secrets for sensitive Coolify-managed resource values, set runtime-only scope by default for runtime secrets, and use Docker Build Secrets instead of ordinary build args for reviewed build-time secrets

## Validation Guidance

- `pnpm check:secret-hygiene`
- `pnpm lint`

Use broader validation only if a follow-on issue changes runtime behavior rather than docs, env examples, or maintained guidance.

## Resulting Issue Set

- the scoped SIKESRA issue docs: update AI workflow planning templates for the current live runtime and operator posture
- the scoped SIKESRA issue security: align env examples and secret-handling docs with current VPS-managed tunnel rotation and key-only SSH recovery
- the scoped SIKESRA issue docs: refresh core repository guidance and skills for the current Cloudflare/Coolify runtime posture
- the scoped SIKESRA issue ops: audit Coolify-managed secrets for locked runtime scope and build-secret usage
