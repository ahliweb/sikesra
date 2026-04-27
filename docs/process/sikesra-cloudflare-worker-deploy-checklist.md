# SIKESRA Cloudflare Worker Deploy Checklist

## Purpose

This checklist supports:

- `ahliweb/sikesra#11` Worker runtime, domain, secret, and R2 binding setup

It keeps the rollout aligned with the current AWCMS Mini EmDash-first Cloudflare baseline, PostgreSQL on a Coolify-managed VPS, and OWASP-oriented secret handling.

## Current Repository State

- `wrangler.jsonc` exists for Worker `sikesra-kobar`.
- Custom domain route is set to `sikesrakobar.ahlikoding.com`.
- Cloudflare Worker Custom Domain `sikesrakobar.ahlikoding.com` is attached to Worker `sikesra-kobar`.
- Private R2 bucket binding is set to `MEDIA_BUCKET` -> `sikesra`.
- Required Worker secrets are declared in `wrangler.jsonc`.
- Temporary smoke Worker deployment is active until the full AWCMS Mini/EmDash build artifact is deployed.

## Required Pre-Deploy Checks

- Confirm Coolify PostgreSQL resource `sikesrakobar-postgres` remains `running:healthy`.
- Confirm the SIKESRA database name remains `sikesrakobar`.
- Confirm readiness reports redact hostnames, tokens, passwords, private URLs, connection strings, and raw management-plane responses.
- Confirm the app-scoped database user remains least-privilege.
- Confirm the R2 bucket `sikesra` remains private.
- Confirm there are no real secrets in tracked files.

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

Run or verify the following after secrets and direct PostgreSQL posture are ready:

- Local redacted readiness check: `node scripts/verify-runtime-readiness.mjs`.
- Temporary Worker smoke deploy, if the full AWCMS Mini build output is not present yet: `node scripts/deploy-smoke-worker.mjs`.
- Worker secret sync/readiness check: `node scripts/sync-worker-secrets.mjs` after Worker deployment.
- Worker deploy succeeds with `wrangler.jsonc`.
- Base URL loads: `https://sikesrakobar.ahlikoding.com`.
- EmDash admin smoke entry loads: `https://sikesrakobar.ahlikoding.com/_emdash/`.
- Health endpoint returns success when implemented.
- Worker binding smoke succeeds: `https://sikesrakobar.ahlikoding.com/__smoke/db`.
- R2-backed non-sensitive smoke object write/read/delete succeeds: `https://sikesrakobar.ahlikoding.com/__smoke/r2`.
- Runtime database credentials should stay on the least-privilege role; if credentials are rotated again, redeploy the Worker if needed and rerun the smoke checks.

## Security Notes

- Treat Coolify API responses as management-plane data and redact passwords, tokens, connection strings, and private URLs.
- Keep host-only secure cookies unless a reviewed workflow requires broader scope.
- Keep religion, child, elderly/vulnerable-person, disability, and document-sensitive data out of public-safe views.
- Keep export and reveal actions permission-aware and audit-friendly.
