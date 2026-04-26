# Cloudflare Hyperdrive Decision

## Purpose

This document records the current architecture decision for whether AWCMS Mini SIKESRA should adopt Cloudflare Hyperdrive for PostgreSQL access from the Cloudflare-hosted Worker runtime.

## Decision

For the current live deployment phase, Hyperdrive is the preferred transport and pooling layer for PostgreSQL access from the Cloudflare-hosted runtime.

It is now enabled in the live deployment baseline.

The current baseline is:

- Hyperdrive-backed PostgreSQL access from the Cloudflare-hosted Worker runtime
- private-database tunnel path through `pg-hyperdrive.ahlikoding.com`
- reviewed SSL posture on PostgreSQL using a publicly trusted certificate
- Coolify-managed PostgreSQL on the VPS

The repository already includes the runtime transport seam for Hyperdrive selection, but live binding enablement and operator rollout remain separate so deployment config and origin connectivity stay reviewable.

## Why This Is The Decision

Cloudflare's current guidance for Workers and Hyperdrive recommends Hyperdrive for remote PostgreSQL access from Workers because it provides regional pooling and avoids paying the full connection setup cost on every request.

That aligns with AWCMS Mini SIKESRA's current deployment shape:

- Worker-hosted runtime on Cloudflare
- remote PostgreSQL on a Coolify-managed VPS
- existing direct TLS posture already documented and hardened

## Why It Is Not Enabled Immediately

The current fallback and local-development path still supports direct `DATABASE_URL` transport.

The implementation change is not just a deployment toggle. It requires explicit review of:

- how the PostgreSQL client is instantiated for Worker requests
- how Hyperdrive bindings are configured in `wrangler.jsonc`
- how local development continues to use a direct local or reviewed remote connection string
- how deployment secrets and smoke tests distinguish direct versus Hyperdrive-backed transport

The remaining work is now primarily operational hardening and credential/exposure cleanup, not transport enablement.

## Current Repository Context

- `src/config/runtime.mjs` and `src/db/client/postgres.mjs` already support explicit `DATABASE_TRANSPORT` selection and Hyperdrive binding resolution
- `wrangler.jsonc` now binds the reviewed Hyperdrive configuration and sets the Worker runtime transport to `hyperdrive`
- operator docs already treat Hyperdrive as a follow-on transport layer rather than a replacement for PostgreSQL TLS, ingress review, or least-privilege credentials
- the reviewed browser-facing baseline remains a single Worker-hosted runtime on `https://sikesrakobar.ahlikoding.com`

## Recommended Implementation Shape

For follow-on maintenance, keep the remaining change minimal and explicit:

1. keep local development and rollback paths working without removing direct `DATABASE_URL` support prematurely
2. keep the generated deploy configuration aligned with the reviewed Hyperdrive binding and transport settings
3. complete the remaining PostgreSQL hardening work around public exposure and credential rotation
4. keep smoke tests, deployment checks, and rollback guidance aligned with the live Hyperdrive baseline

## Operator Prerequisites

- non-interactive Wrangler commands require `CLOUDFLARE_API_TOKEN`
- the deployment operator needs a reviewed reviewed SIKESRA Hyperdrive configuration ID before enabling the binding in `wrangler.jsonc`
- the PostgreSQL origin must accept the reviewed Cloudflare-to-origin connection path before `wrangler hyperdrive create` can succeed
- the Hyperdrive origin hostname must resolve to a reachable PostgreSQL origin path for Cloudflare, not just to Cloudflare edge IPs on a web-proxied hostname
- if account inventory is not readable through the available Cloudflare management path, treat Hyperdrive binding enablement as an operator-side rollout step rather than a repository-only change

Supported operator choices for the origin endpoint:

1. use a reviewed reachable public PostgreSQL origin hostname or IP path that Cloudflare can connect to directly
2. if the database should stay private, use Cloudflare Tunnel and the private-database Hyperdrive path instead of trying to reuse a normal web-proxied hostname

Preferred default for the current environment:

- prefer the private-database Hyperdrive path via Cloudflare Tunnel unless there is a reviewed operator reason to expose a separately reachable PostgreSQL origin endpoint
- treat the reachable public-origin path as historical fallback guidance now that the Tunnel strategy succeeded in the live environment

Private-database Tunnel prerequisites:

1. a reviewed Cloudflare Tunnel that can reach the PostgreSQL origin on port `5432`
2. a reviewed TCP public hostname or equivalent private-database route for the tunnel-backed origin
3. Cloudflare Access/service-token material if the Hyperdrive configuration will authenticate to the tunnel-backed origin through Access
4. explicit tunnel-side and PostgreSQL-side notes showing how the private origin path maps back to the Coolify-managed VPS
5. a `CLOUDFLARE_API_TOKEN` with tunnel permissions, including `Account > Cloudflare Tunnel > Edit`, for non-interactive tunnel provisioning through Wrangler
6. operator access to the Cloudflare dashboard or API for ingress-rule management, because Wrangler-created tunnels are remotely managed and do not expose ingress configuration through the current tunnel CLI surface

For the remaining manual token cleanup tracked in the scoped SIKESRA issue, prefer the smallest replacement `CLOUDFLARE_API_TOKEN` that still supports the reviewed operator workflow. The current minimum practical scope set is:

1. `Cloudflare Tunnel Edit` for remotely managed tunnel changes
2. `Access: Apps and Policies Edit` and `Access: Service Tokens Edit` for private-database Access/service-token management
3. `Zone DNS Edit` only when DNS changes are part of the reviewed operator task
4. `API Tokens Write` on the user resource only if the operator intends to mint replacement API tokens programmatically

After replacing `CLOUDFLARE_API_TOKEN`:

1. update local-only `.env.local`
2. verify non-interactive Wrangler commands still succeed
3. revoke or disable the old token

Reviewed default route name:

- prefer `pg-hyperdrive.ahlikoding.com` for the tunnel-backed private-database route because it is explicit, operator-only, and distinct from the public app hostname
- avoid reusing `sikesrakobar.ahlikoding.com`, `id1.ahlikoding.com`, or any general web-facing hostname for the Hyperdrive route

## Security Implications

- Hyperdrive is a transport and pooling layer, not a replacement for PostgreSQL SSL, restricted ingress, or app-scoped credentials
- the reviewed PostgreSQL hostname, certificate expectations, and operator rollback rules remain relevant even if Hyperdrive is adopted
- secrets and bindings should remain server-only and environment-managed
- least privilege and audited rollout sequencing still apply

## What Would Reopen This Decision

Revisit this decision only if one of the following changes materially:

- Cloudflare changes Hyperdrive guidance for Workers and PostgreSQL
- the current direct PostgreSQL path proves operationally sufficient without meaningful connection pressure or latency cost
- AWCMS Mini SIKESRA moves to a different supported runtime or database transport model

Absent one of those changes, Hyperdrive remains the recommended next-step transport improvement for the Cloudflare-hosted runtime.

## Validation

- docs review against the current repository state
- `pnpm lint`

## Cross-References

- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/postgresql-vps-hardening.md`
- `docs/process/secret-hygiene-coolify-cloudflare-topology-plan-2026.md`
- `docs/architecture/runtime-config.md`
- `README.md`
