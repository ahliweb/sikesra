# SIKESRA Cloudflare Worker Deploy Checklist

## Purpose

This checklist supports:

- `ahliweb/sikesra#11` Worker runtime, domain, secret, and R2 binding setup
- `ahliweb/sikesra#12` Hyperdrive creation and binding replacement

It keeps the rollout aligned with the current AWCMS Mini EmDash-first Cloudflare baseline, PostgreSQL on a Coolify-managed VPS, and OWASP-oriented secret handling.

## Current Repository State

- `wrangler.jsonc` exists for Worker `sikesra-kobar`.
- Custom domain route is set to `sikesrakobar.ahlikoding.com`.
- Cloudflare Worker Custom Domain `sikesrakobar.ahlikoding.com` is attached to Worker `sikesra-kobar`.
- Private R2 bucket binding is set to `MEDIA_BUCKET` -> `sikesra`.
- Required Worker secrets are declared in `wrangler.jsonc`.
- The Hyperdrive binding uses the least-privilege-backed SIKESRA Hyperdrive ID for `sikesra-kobar-postgres-runtime`.
- Temporary smoke Worker deployment is active until the full AWCMS Mini/EmDash build artifact is deployed.

## Required Pre-Deploy Checks

- Confirm Coolify PostgreSQL resource `sikesrakobar-postgres` remains `running:healthy`.
- Confirm the SIKESRA database name remains `sikesrakobar`.
- Confirm local-only Hyperdrive fallback connection variables, if present, target `sikesrakobar` rather than an upstream AWCMS Mini database.
- Confirm readiness reports redact hostnames, tokens, passwords, private URLs, connection strings, and raw management-plane responses.
- Confirm the app-scoped database user remains least-privilege.
- Confirm the R2 bucket `sikesra` remains private.
- Confirm there are no real secrets in tracked files.

## Hyperdrive Checklist

- Run `node scripts/create-sikesra-hyperdrive.mjs` to create or reuse the SIKESRA-specific Hyperdrive config and replace the placeholder ID when Cloudflare validates the origin.
- Create a Cloudflare Hyperdrive configuration for the Coolify-managed `sikesrakobar` PostgreSQL database.
- Do not commit the database password or full connection string.
- Keep the non-secret SIKESRA Hyperdrive ID in `wrangler.jsonc` aligned with the Cloudflare config named `sikesra-kobar-postgres-runtime`.
- Keep `DATABASE_TRANSPORT=hyperdrive` and `HYPERDRIVE_BINDING=HYPERDRIVE` aligned with the deployed Worker runtime.

## Hyperdrive Attempt Status

- Direct Hyperdrive creation against `id1.ahlikoding.com:5432` was attempted and refused by the origin, which is consistent with the desired private PostgreSQL posture.
- Access-protected Hyperdrive creation through the existing `pg-hyperdrive.ahlikoding.com` tunnel reached the protected origin, but Cloudflare rejected the SIKESRA credentials as invalid for that origin.
- Automated SIKESRA-only Hyperdrive creation was attempted with `scripts/create-sikesra-hyperdrive.mjs`; Cloudflare still rejected the direct private origin and the existing protected origin still does not accept the SIKESRA database credentials.
- A SIKESRA-specific protected Tunnel hostname, `pg-sikesra-hyperdrive.ahlikoding.com`, was configured to reach the `sikesrakobar-postgres` private origin through Cloudflare Access.
- Local ignored database credentials were synchronized from Coolify for `sikesrakobar-postgres`; a redacted `psql` smoke test through the protected Tunnel returned database `sikesrakobar`.
- Hyperdrive creation now reaches the SIKESRA database but is blocked because the Coolify PostgreSQL resource has SSL/TLS disabled; Cloudflare Hyperdrive requires PostgreSQL SSL/TLS support.
- PostgreSQL SSL/TLS was enabled through the private database path and the SIKESRA Hyperdrive config was rotated to least-privilege-backed `sikesra-kobar-postgres-runtime`.
- The existing AWCMS Mini Hyperdrive configuration points at `pg-hyperdrive.ahlikoding.com` for database `awcms_mini`, which indicates the current tunnel is attached to the existing AWCMS Mini PostgreSQL service rather than the newly-created standalone `sikesrakobar-postgres` Coolify resource.
- `wrangler.jsonc` no longer contains `REPLACE_WITH_SIKESRA_HYPERDRIVE_ID`.

## Hyperdrive Resolution Options

- Preferred if using the existing protected PostgreSQL tunnel: create database `sikesrakobar` and a least-privilege runtime role on the PostgreSQL service behind `pg-hyperdrive.ahlikoding.com`, then create Hyperdrive with that role.
- Preferred if keeping the new standalone Coolify PostgreSQL resource: provision a separate Cloudflare Tunnel or Workers VPC Service path to `sikesrakobar-postgres`, then create Hyperdrive against that private origin.
- Do not make the database public just to satisfy Hyperdrive creation unless an explicit reviewed exception is approved.
- Keep SSL/TLS enabled for `sikesrakobar-postgres`; use Coolify database SSL settings for future certificate rotation rather than exposing PostgreSQL publicly.

## Secret Checklist

Store production values in Cloudflare Worker secrets, not in `wrangler.jsonc`:

- `APP_SECRET`
- `MINI_TOTP_ENCRYPTION_KEY`
- `TURNSTILE_SECRET_KEY`
- `EDGE_API_JWT_SECRET`

Optional local-only secret development file:

- `.dev.vars` based on `.dev.vars.example`

Operator rules:

- Do not paste secret values into GitHub issues.
- Do not store runtime secrets as build-time variables unless explicitly required.
- Prefer Cloudflare Worker secrets for the Worker runtime and Coolify locked secrets for database/resource management.
- After the Worker script exists in Cloudflare, run `node scripts/sync-worker-secrets.mjs` to sync required Worker secrets from ignored local env values without printing secret values.
- The secret sync script fails closed if `sikesra-kobar` does not exist yet, so it is safe to run before deployment as a readiness check.

## R2 Checklist

- Keep `MEDIA_BUCKET` bound to bucket `sikesra`.
- Keep document access permission-aware and audit-friendly.
- Avoid public bucket exposure for sensitive document flows.
- Use non-sensitive smoke objects for verification only.

## Domain Checklist

- Confirm `sikesrakobar.ahlikoding.com` is the Worker custom domain target.
- Keep `SITE_URL` aligned with `https://sikesrakobar.ahlikoding.com`.
- Keep admin entry expectations aligned with EmDash under `/_emdash/`.

## Smoke Tests

Run or verify the following after Hyperdrive and secrets are ready:

- Local redacted readiness check: `node scripts/verify-runtime-readiness.mjs`.
- Temporary Worker smoke deploy, if the full AWCMS Mini build output is not present yet: `node scripts/deploy-smoke-worker.mjs`.
- Worker secret sync/readiness check: `node scripts/sync-worker-secrets.mjs` after Worker deployment.
- Worker deploy succeeds with `wrangler.jsonc`.
- Base URL loads: `https://sikesrakobar.ahlikoding.com`.
- EmDash admin smoke entry loads: `https://sikesrakobar.ahlikoding.com/_emdash/`.
- Health endpoint returns success when implemented.
- Hyperdrive binding smoke succeeds: `https://sikesrakobar.ahlikoding.com/__smoke/db`.
- R2-backed non-sensitive smoke object write/read/delete succeeds: `https://sikesrakobar.ahlikoding.com/__smoke/r2`.
- Runtime database credentials should stay on the least-privilege role; if credentials are rotated again, rerun `node scripts/create-sikesra-hyperdrive.mjs`, redeploy the Worker, and rerun the smoke checks.

## Security Notes

- Treat Coolify API responses as management-plane data and redact passwords, tokens, connection strings, and private URLs.
- Keep host-only secure cookies unless a reviewed workflow requires broader scope.
- Keep religion, child, elderly/vulnerable-person, disability, and document-sensitive data out of public-safe views.
- Keep export and reveal actions permission-aware and audit-friendly.
