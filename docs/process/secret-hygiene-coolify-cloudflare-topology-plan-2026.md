# Secret Hygiene, Coolify MCP, And Cloudflare Topology Plan 2026

## Purpose

This document captures the current planning pass for AWCMS Mini SIKESRA around operator secret hygiene, Coolify MCP handling, Cloudflare-hosted deployment, and PostgreSQL transport hardening.

It uses `docs/process/ai-workflow-planning-templates.md` as a primary process reference and keeps the recommendations aligned with the current repository baseline:

- EmDash `0.7.0` is the current reviewed package baseline in `awcms-mini-sikesra`
- AWCMS Mini SIKESRA remains single-tenant
- Cloudflare-hosted Worker runtime remains the supported app-hosting baseline
- PostgreSQL remains the system of record on a protected VPS managed through Coolify
- the reviewed production browser baseline is `https://sikesrakobar.ahlikoding.com`, with admin entry at `/_emdash/` redirecting into EmDash's current `/_emdash/admin` surface

It also reflects current OWASP, Cloudflare, Coolify, and PostgreSQL guidance for secret handling, secure transport, deployment seams, and rollback-safe infrastructure changes.

## Current Baseline

### Confirmed Repository State

- The current repository already routes operational secrets through environment variables and runtime config rather than hardcoding them in application services.
- The current maintained scripts reviewed during this pass do not embed confirmed live credentials in tracked code, but they still need explicit `.env` versus `.env.local` storage guidance and transport-specific env handling.
- `.env.example` already documents the main runtime secrets and bindings used by the current Cloudflare-hosted baseline.
- `wrangler.jsonc` currently declares the reviewed Worker custom-domain baseline for `sikesrakobar.ahlikoding.com`.
- `wrangler.jsonc` currently declares the `MEDIA_BUCKET` binding for `sikesra`.
- `wrangler.jsonc` now also declares the reviewed required Worker secret names, and the shared local Astro wrapper enforces the same required-secret contract for local Astro commands.
- The current runtime treats `/_emdash/` as the reviewed browser entry alias and redirects it to EmDash's current `/_emdash/admin` surface on the same host.
- Turnstile hostname allowlists and JWT edge auth already exist in the current runtime baseline.
- The tracked Coolify MCP wrapper now follows the repo env-loading pattern and reads `.env` plus `.env.local`, while the live token stays local-only.
- The current local operator secret file already contains the Coolify MCP token in `.env.local`, which is gitignored and is the correct storage class for that credential.
- The current reviewed Coolify-side secret surface is Environment Variables with locked secrets, explicit runtime/build scoping, and Docker Build Secrets for reviewed build-time sensitive inputs.
- The current reviewed PostgreSQL target inventory for this planning pass is VPS IP `202.10.45.224` and SSL hostname `id1.ahlikoding.com`.
- The repository now includes a dedicated secret-hygiene audit runbook in `docs/process/secret-hygiene-audit.md`.

### Confirmed Gaps

- Planning and historical-decision docs still mention the previous split-host baseline intentionally as migration context.
- Internal admin/plugin links still target EmDash's current `/_emdash/admin` surface directly beyond the reviewed `/_emdash/` entry alias.
- Direct infrastructure-side Coolify/PostgreSQL SSL enablement and certificate rollout still require operator execution outside the repository.
- Cloudflare-side verification of the live custom-domain and platform inventory still remains an operator validation task after repo changes land.
- `.env.example` now documents Cloudflare Tunnel, Access, account-level operator variables, and the current key-only VPS recovery posture without reintroducing a root-password env variable.

### Important Evidence From This Pass

- The script review performed for this planning pass did not confirm checked-in live credentials embedded in the maintained `scripts/**` entrypoints.
- That means the planning target should be framed as a prevention and audit hardening pass, not as a claim that the current repo definitely contains committed secrets in scripts.
- The Coolify token supplied for this request should be treated as sensitive operator input and must not be written into repository files, committed scripts, or GitHub issue bodies.
- The current tool session does not expose a Coolify MCP control surface, so this pass can update the local wrapper and secret-handling docs but cannot mutate Coolify-hosted resources directly.
- The current tool session did not confirm live Cloudflare account inventory, so Cloudflare-side hostname, Worker, Pages, or R2 changes remain operator validation tasks after repo changes land.
- The current repository fix keeps the setup shell path database-lazy and keeps the reviewed live Hyperdrive Worker transport active so Cloudflare bootstrap failures are less likely to surface as blanket setup-route Worker exceptions.

## Planning Goals

Add or improve the following capabilities without breaking EmDash-first rules:

1. ensure credentials are not embedded in maintained scripts and are instead sourced from `.env`, `.env.local`, deployment environment variables, or external secret stores as appropriate
2. define a safe, non-repository workflow for configuring Coolify MCP access with an operator-provided token
3. move the reviewed production target to `https://sikesrakobar.ahlikoding.com`, with the public site at `/` and the admin entry on the same host at `/_emdash/`
4. keep the Cloudflare-hosted app topology aligned with the requested path: browser/api to Cloudflare edge to Worker-hosted app runtime and platform services such as R2, with PostgreSQL on the Coolify-managed VPS over SSL
5. tighten PostgreSQL transport guidance so the Cloudflare runtime reaches PostgreSQL with reviewed SSL settings and explicit operator rollback notes
6. keep the reviewed PostgreSQL inventory explicit: VPS IP `202.10.45.224`, SSL hostname `id1.ahlikoding.com`, and application connectivity through env-managed connection strings rather than script-local credentials

## Recommended Workstreams

### 1. Secret Hygiene Audit For Scripts And Operator Helpers

Recommended direction:

- treat secret hygiene as an explicit operator and repository concern even if no current embedded credentials are confirmed
- audit maintained scripts, local automation helpers, and setup docs for:
  - hardcoded credentials
  - inline tokens in command examples
  - secrets echoed to stdout or captured in logs
  - scripts that bypass existing `.env` loading patterns
- standardize on:
  - `.env.example` for safe documented variable names and placeholders
  - `.env.local` for local operator secrets that must never be committed
  - deployment-managed environment variables or Cloudflare-managed secrets for production values

Recommended repository rules:

- do not commit actual credentials, tokens, or API keys to scripts, docs, examples, issue bodies, or config files
- do not place production credentials in `.env.example`
- keep scripts generic and make them fail clearly when required env vars are missing
- prefer explicit variable names over positional secret arguments when scripting sensitive operations

Recommended follow-up deliverables:

- a focused audit checklist for operator-managed scripts and helper commands
- doc updates clarifying where local-only secrets belong versus deployment secrets
- focused cleanup only if the audit finds real embedded secret values or unsafe examples

### 2. Coolify MCP Token Handling And Configuration

Recommended direction:

- treat Coolify MCP configuration as operator-local or environment-managed configuration, not repository configuration
- do not store the operator-provided Coolify token in source control, docs examples, GitHub issues, or tracked shell scripts
- if Coolify MCP is configured in an external MCP client file or local tool config, source the token from a local-only env var or OS secret store where the client supports it

Recommended security posture:

- keep the Coolify token server-only and operator-scoped
- prefer the smallest token scope available from Coolify
- rotate the token if it was ever pasted into a location that may be retained in logs, shell history, or issue trackers
- keep Coolify administrative credentials separate from runtime application credentials

Recommended operator workflow:

1. store the Coolify token in a local-only secret location such as `.env.local`, shell secret manager, password manager CLI integration, or MCP client secret storage
2. reference that secret indirectly from the MCP client configuration if the client supports env interpolation
3. verify the token is not printed by wrapper scripts or shell history helpers
4. document the presence of the MCP integration in operator docs without documenting the live token value itself

Recommended repository stance:

- document the expected variable name and storage location pattern if needed
- do not add the live token to repo files
- do not add a fake hardcoded token placeholder to executable scripts if that encourages copy-paste replacement in tracked files

### 3. Public And Admin Domain Separation

Recommended direction:

- keep `sikesrakobar.ahlikoding.com` as the canonical public hostname
- treat the current split-host posture as the confirmed starting point, not the desired end state
- migrate the reviewed production target to a single browser-facing hostname: `https://sikesrakobar.ahlikoding.com`
- move the reviewed admin entry target to `https://sikesrakobar.ahlikoding.com/_emdash/`
- preserve the EmDash-first admin surface and do not create a second admin app, a second auth core, or a separate operator hostname unless a future issue reintroduces that intentionally

This should be handled as an explicit runtime migration issue because the current repo baseline still uses split-host terminology and the `/_emdash/admin` entry path.

Recommended security posture:

- prefer host-only cookies unless a reviewed operator workflow requires cross-host sharing
- keep origin, redirect, and CSRF validation aligned with the single reviewed hostname set
- keep Turnstile hostname allowlists and login protections aligned with the single production hostname
- keep admin/plugin APIs under the EmDash surface and external/mobile APIs under `/api/v1/*`
- keep admin and public abuse controls independently reviewable by route and path even when they share one hostname

### 4. Cloudflare Edge Topology And PostgreSQL SSL

Recommended direction:

- keep the application-hosting baseline on the Cloudflare Worker runtime unless a later architecture issue scopes a static-first split deliberately
- treat Cloudflare Pages and R2 as optional platform services around the Worker runtime, not as evidence that the app has already been split into separate public/admin runtimes
- keep the browser-facing request path simple: browser/api to Cloudflare edge to the Worker-hosted app runtime, with the runtime reaching PostgreSQL over SSL and using R2 through the private `MEDIA_BUCKET` binding when object storage is enabled
- document PostgreSQL SSL posture explicitly, including app-side connection string expectations, Coolify-side SSL enablement, the reviewed hostname `id1.ahlikoding.com`, and what to do if hostname validation is not ready yet

Recommended operator posture:

- prefer `sslmode=verify-full` when PostgreSQL certificate and hostname validation are available end to end
- if the infrastructure is temporarily limited to a weaker reviewed mode such as `require`, document that as an interim state and track the follow-on hardening issue explicitly
- keep PostgreSQL credentials application-scoped and non-superuser
- keep database ingress narrow and auditable
- keep Hyperdrive aligned with the current live reviewed deployment posture and do not remove it from reviewed Worker config unless the rollback or migration plan explicitly changes the active transport

## Security Standards And Recommendations

### OWASP-Aligned Recommendations

- keep secrets out of source control and out of operator-visible logs wherever possible
- apply least privilege to Coolify, Cloudflare, database, and automation credentials
- separate runtime secrets from operator automation secrets
- rotate credentials when exposure is suspected rather than relying on obscurity or prompt-history cleanup
- keep secure transport and peer validation explicit for database connectivity, not implied by deployment location alone
- keep generic error handling for auth and recovery flows
- keep audit coverage for privileged recovery and configuration changes
- do not store or reintroduce emergency recovery credentials such as `VPS_ROOT_PASSWORD` in `.env.local` or any script; the reviewed VPS recovery path now uses key-only SSH and the emergency-recovery runbook
- treat `CLOUDFLARE_TUNNEL_TOKEN` as equivalent to the right to run the tunnel; rotate it if it has ever appeared in shell history, issue comments, or copied env files

### Cloudflare-Aligned Recommendations

- keep production application hosting on the reviewed Worker baseline unless an explicit architecture issue approves a split
- keep the primary browser-facing hostname on `sikesrakobar.ahlikoding.com` and route both public and admin entry traffic through the same reviewed app surface for the requested single-host target
- keep custom domains, Turnstile config, Worker bindings, and runtime secrets declarative or environment-managed where practical
- use Cloudflare-managed secrets or equivalent server-only configuration for Turnstile and edge auth secrets
- keep custom domains attached through the Worker custom-domain path when the Worker is the origin
- keep Hyperdrive in scope as the recommended next-step pooling option for Cloudflare-to-PostgreSQL traffic if direct SSL operation becomes operationally brittle

### Coolify And PostgreSQL Recommendations

- keep Coolify administrative tokens separate from app runtime env vars
- do not reuse the same credential for Coolify automation and database access
- keep PostgreSQL credentials application-scoped and non-superuser
- keep remote database traffic protected with TLS and restricted ingress rules
- enable PostgreSQL SSL on the Coolify-managed database resource and update the reviewed application connection string accordingly
- prefer `DATABASE_URL` values that connect through `id1.ahlikoding.com` for hostname validation, while retaining `202.10.45.224` as operator inventory and fallback troubleshooting data
- document certificate-validation expectations and rollback steps before switching production traffic

## Proposed Execution Order

1. refresh the planning docs and issue breakdown for the requested Cloudflare/Coolify target
2. perform the focused secret-hygiene and Coolify MCP hardening work
3. migrate runtime/docs/deployment assumptions from the split-host baseline to the requested single-host target
4. update PostgreSQL transport guidance and operator config so the Cloudflare runtime uses SSL to reach the Coolify-managed PostgreSQL server
5. evaluate Hyperdrive only as a follow-on if direct SSL connectivity needs a safer pooling or transport layer
6. separate repository-scoped Hyperdrive transport changes from operator-side Cloudflare binding rollout so issue scope stays reviewable

Current status after the completed repository passes:

- Steps 1 through 4 have repository-scoped updates landed.
- Remaining work is primarily documentation alignment and any future operator hardening that should not be folded into unrelated repository changes.

## Proposed Issue Breakdown

### Issue A: Refresh Cloudflare/Coolify Recommendations And Planning

Tracked SIKESRA issue: create or use a scoped issue

- refresh the maintained planning doc using the confirmed repo state
- convert the reviewed recommendations into dependency-ordered implementation issues
- keep the resulting plan aligned with the current EmDash-first and Cloudflare-hosted baseline

Current status: repository planning work complete.

### Issue B: Harden Coolify MCP And Repository Secret Handling

Tracked SIKESRA issue: create or use a scoped issue

- audit maintained scripts and docs for embedded secrets or unsafe secret-handling examples
- move any confirmed embedded credentials into env-based or secret-store-based configuration
- update examples so they use placeholders and documented env vars only

Current status: repository secret-handling hardening work complete. `.env.example` now covers the current operator-managed variable classes for Cloudflare, Coolify, runtime secrets, and the tunnel connector path without normalizing password-based VPS recovery for this environment.

### Issue C: Consolidate AWCMS Mini SIKESRA To A Single Cloudflare Hostname

Tracked SIKESRA issue: create or use a scoped issue

- update runtime config, tests, docs, and deployment assumptions for `https://sikesrakobar.ahlikoding.com`
- move the reviewed admin entry path target to `/_emdash/` on the same host
- keep EmDash-first routing and versioned `/api/v1/*` behavior intact

Current status: repository single-host migration work complete.

### Issue D: Require SSL Between Cloudflare Runtime And Coolify-Managed PostgreSQL

Tracked SIKESRA issue: create or use a scoped issue

- document and enforce the reviewed PostgreSQL SSL posture
- align Coolify-side SSL configuration with app-side connection settings using `id1.ahlikoding.com` as the reviewed SSL hostname
- update operator guidance, smoke tests, and rollback notes for the transport change

Current status: repository-side SSL baseline work complete; infrastructure execution remains operator-side.

### Issue E: Adopt Cloudflare Hyperdrive For PostgreSQL Transport

Tracked SIKESRA issues: create or use scoped dependency-ordered issues

- add runtime support for selecting Hyperdrive-backed PostgreSQL transport without breaking the reviewed direct `DATABASE_URL` path
- document binding prerequisites, rollout order, smoke tests, and secret-handling expectations for Hyperdrive
- keep the live Cloudflare binding enablement and deployed verification as an explicit operator rollout track
- keep PostgreSQL origin endpoint preparation explicit when the reviewed SSL hostname is not a reachable Hyperdrive origin path
- keep the private-database Cloudflare Tunnel alternative explicit as a separate operator decision path when public origin exposure is not desired

Reviewed current route-name default for the private-database path: `pg-hyperdrive.ahlikoding.com`.

Preferred current direction: use the private-database Cloudflare Tunnel path unless the operator explicitly decides that a separately reachable public PostgreSQL origin endpoint is acceptable.

Current status: the repository and live Worker are now aligned on `DATABASE_TRANSPORT=hyperdrive`, with local build and typecheck paths deriving the required local Hyperdrive connection string from env-managed `DATABASE_URL` rather than tracked script values.

## Validation Expectations

For this planning and documentation pass:

- review docs against the current repository state
- `pnpm lint`

For follow-up implementation or audit issues:

- `pnpm lint` for docs/config-only cleanup
- `pnpm check` for runtime or script behavior changes
- focused secret-hygiene review of changed scripts and examples
- focused deployment and health smoke tests for hostname and PostgreSQL transport changes

## Cross-References

- `docs/process/ai-workflow-planning-templates.md`
- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/cloudflare-hostname-turnstile-r2-automation-plan-2026.md`
- `docs/process/runtime-smoke-test.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/postgresql-vps-hardening.md`
- `docs/security/operations.md`

## External Guidance References

- OWASP guidance on secrets management, least privilege, secure configuration, and protected transport
- Cloudflare Workers guidance on custom domains, secrets, and PostgreSQL connectivity patterns
- Cloudflare Hyperdrive guidance as a follow-on transport/pooling option
- Coolify guidance for PostgreSQL SSL enablement and operator-managed database configuration
