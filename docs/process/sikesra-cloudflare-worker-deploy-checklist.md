# SIKESRA Cloudflare Worker Deploy Checklist

## Purpose

This checklist supports:

- `ahliweb/sikesra#11` Worker runtime, domain, secret, and R2 binding setup
- `ahliweb/sikesra#12` Hyperdrive creation and binding replacement

It keeps the rollout aligned with the current AWCMS Mini EmDash-first Cloudflare baseline, PostgreSQL on a Coolify-managed VPS, and OWASP-oriented secret handling.

## Current Repository State

- `wrangler.jsonc` exists for Worker `sikesra-kobar`.
- Custom domain route is set to `sikesrakobar.ahlikoding.com`.
- Private R2 bucket binding is set to `MEDIA_BUCKET` -> `sikesra`.
- Required Worker secrets are declared in `wrangler.jsonc`.
- The Hyperdrive binding still uses `REPLACE_WITH_SIKESRA_HYPERDRIVE_ID` and blocks deploy.

## Required Pre-Deploy Checks

- Confirm Coolify PostgreSQL resource `sikesrakobar-postgres` remains `running:healthy`.
- Confirm the SIKESRA database name remains `sikesrakobar`.
- Confirm the app-scoped database user remains least-privilege.
- Confirm the R2 bucket `sikesra` remains private.
- Confirm there are no real secrets in tracked files.

## Hyperdrive Checklist

- Create a Cloudflare Hyperdrive configuration for the Coolify-managed `sikesrakobar` PostgreSQL database.
- Do not commit the database password or full connection string.
- Replace `REPLACE_WITH_SIKESRA_HYPERDRIVE_ID` in `wrangler.jsonc` with the resulting non-secret Hyperdrive ID.
- Keep `DATABASE_TRANSPORT=hyperdrive` and `HYPERDRIVE_BINDING=HYPERDRIVE` aligned with the deployed Worker runtime.

## Hyperdrive Attempt Status

- Direct Hyperdrive creation against `id1.ahlikoding.com:5432` was attempted and refused by the origin, which is consistent with the desired private PostgreSQL posture.
- Access-protected Hyperdrive creation through the existing `pg-hyperdrive.ahlikoding.com` tunnel reached the protected origin, but Cloudflare rejected the SIKESRA credentials as invalid for that origin.
- The existing AWCMS Mini Hyperdrive configuration points at `pg-hyperdrive.ahlikoding.com` for database `awcms_mini`, which indicates the current tunnel is attached to the existing AWCMS Mini PostgreSQL service rather than the newly-created standalone `sikesrakobar-postgres` Coolify resource.
- Do not deploy `wrangler.jsonc` while it still contains `REPLACE_WITH_SIKESRA_HYPERDRIVE_ID`.

## Hyperdrive Resolution Options

- Preferred if using the existing protected PostgreSQL tunnel: create database `sikesrakobar` and a least-privilege runtime role on the PostgreSQL service behind `pg-hyperdrive.ahlikoding.com`, then create Hyperdrive with that role.
- Preferred if keeping the new standalone Coolify PostgreSQL resource: provision a separate Cloudflare Tunnel or Workers VPC Service path to `sikesrakobar-postgres`, then create Hyperdrive against that private origin.
- Do not make the database public just to satisfy Hyperdrive creation unless an explicit reviewed exception is approved.

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

- Worker deploy succeeds with `wrangler.jsonc`.
- Base URL loads: `https://sikesrakobar.ahlikoding.com`.
- EmDash admin entry loads: `https://sikesrakobar.ahlikoding.com/_emdash/`.
- Health endpoint returns success when implemented.
- Database-backed runtime paths succeed through Hyperdrive.
- R2-backed non-sensitive smoke object write/read/delete succeeds.

## Security Notes

- Treat Coolify API responses as management-plane data and redact passwords, tokens, connection strings, and private URLs.
- Keep host-only secure cookies unless a reviewed workflow requires broader scope.
- Keep religion, child, elderly/vulnerable-person, disability, and document-sensitive data out of public-safe views.
- Keep export and reveal actions permission-aware and audit-friendly.
