# Runtime Configuration

## Purpose

This document defines the base runtime configuration contract for SIKESRA (awcms-mini-sikesra).

## SIKESRA Deployment Identifiers

- Worker: `sikesra-kobar`
- Hostname: `sikesrakobar.ahlikoding.com`
- Database: `sikesrakobar`
- Runtime DB role: `sikesrakobar_runtime`
- Hyperdrive: `sikesra-kobar-postgres-runtime` (ID `27eafcdafb5e4904bf083c4133a54161`)
- R2 bucket: `sikesra` (binding: `MEDIA_BUCKET`)
- SESSION KV: `SESSION` (ID `78cc94b763664d56b5ac9d34f1244304`)

## Current Runtime Settings

### `MINI_RUNTIME_TARGET`

- Supported production baseline: `cloudflare`.
- `node` remains an explicit fallback target during migration and local compatibility work.

### `DATABASE_URL`

- Purpose: PostgreSQL connection string used by the EmDash database adapter.
- Production example: `postgres://sikesrakobar_runtime:<password>@id1.ahlikoding.com:5432/sikesrakobar?sslmode=verify-full`
- VPS IP: `202.10.45.224` (for troubleshooting; prefer `id1.ahlikoding.com` for hostname validation)
- Do not use PostgreSQL superuser credentials for the normal app runtime.

### `DATABASE_TRANSPORT`

- Supported values: `direct`, `hyperdrive`.
- Production baseline: `hyperdrive` with the `HYPERDRIVE` binding.
- Keep `direct` as an explicit local, rollback, or issue-scoped remediation path.

### `DATABASE_CONNECT_TIMEOUT_MS`

- Default fallback: `10000`.

### `HYPERDRIVE_BINDING`

- Default fallback: `HYPERDRIVE`.
- This is a binding name, not a secret or connection string.

### `HEALTHCHECK_EXPECT_DATABASE_TRANSPORT`

- Optional non-secret expectation used by `pnpm healthcheck`.
- Supported values: `direct`, `hyperdrive`.

### `HEALTHCHECK_EXPECT_DATABASE_HOSTNAME`

- Optional non-secret expectation.
- SIKESRA value: `id1.ahlikoding.com`.

### `HEALTHCHECK_EXPECT_DATABASE_SSLMODE`

- Optional non-secret expectation.
- Example: `verify-full`.

### `HEALTHCHECK_EXPECT_HYPERDRIVE_BINDING`

- Default reviewed binding name: `HYPERDRIVE`.

### `MINI_TOTP_ENCRYPTION_KEY`

- Purpose: encryption key for TOTP secret storage.
- Production deployments must set an explicit dedicated value.
- Declared as a required Worker secret in `wrangler.jsonc`.

### `APP_SECRET`

- Purpose: shared application secret.
- Fallback for TOTP secret encryption when `MINI_TOTP_ENCRYPTION_KEY` is not set.
- Do not rely on `APP_SECRET` as the steady-state TOTP key in production.
- Declared as a required Worker secret in `wrangler.jsonc`.

### `SITE_URL`

- SIKESRA value: `https://sikesrakobar.ahlikoding.com`
- Format: absolute URL.

### `ADMIN_SITE_URL`

- Purpose: optional dedicated admin hostname.
- If configured, treats it as an entry hostname for the same EmDash admin surface.

### `ADMIN_ENTRY_PATH`

- Default fallback: `/_emdash/`.

### `TRUSTED_PROXY_MODE`

- SIKESRA production value: `cloudflare`.
- Required for correct `CF-Connecting-IP` trust behavior.

### `TURNSTILE_SITE_KEY`

- Public Cloudflare Turnstile site key.
- Pair with `TURNSTILE_SECRET_KEY`.

### `TURNSTILE_SECRET_KEY`

- Server-side secret for mandatory Turnstile Siteverify validation.
- Declared as a required Worker secret.
- Turnstile enforcement activates when this value is configured.

### `TURNSTILE_EXPECTED_HOSTNAME`

- SIKESRA value: `sikesrakobar.ahlikoding.com`.

### `TURNSTILE_EXPECTED_HOSTNAMES`

- Comma-separated hostnames.
- Falls back to hostnames derived from `SITE_URL` and `ADMIN_SITE_URL` when omitted.

### `R2_MEDIA_BUCKET_BINDING`

- SIKESRA value: `MEDIA_BUCKET`.

### `R2_MEDIA_BUCKET_NAME`

- SIKESRA value: `sikesra`.

### `R2_MAX_UPLOAD_BYTES`

- Default fallback: `5242880` (5 MiB).

### `R2_ALLOWED_CONTENT_TYPES`

- Default fallback: `image/jpeg,image/png,image/webp,application/pdf`.

### `EDGE_API_ALLOWED_ORIGINS`

- Default: no cross-origin browser origins allowed unless explicitly configured.

### `EDGE_API_MAX_BODY_BYTES`

- Default fallback: `16384` bytes.

### `EDGE_API_JWT_SECRET`

- Server-only runtime secret.
- Declared as a required Worker secret.
- Falls back to `APP_SECRET` when omitted.

### `EDGE_API_JWT_ISSUER`

- Falls back to `SITE_URL + /api/v1`.
- SIKESRA value: `https://sikesrakobar.ahlikoding.com/api/v1`.

### `EDGE_API_JWT_AUDIENCE`

- Default fallback: `awcms-mini-edge-api`.

### `EDGE_API_ACCESS_TOKEN_TTL_SECONDS`

- Default fallback: `900` seconds.

### `EDGE_API_REFRESH_TOKEN_TTL_SECONDS`

- Default fallback: `2592000` seconds.

## Source of Truth

- runtime config module: `src/config/runtime.mjs`
- Astro integration wiring: `astro.config.mjs`
- local environment example: `.env.example`
- Cloudflare deployment configuration: `wrangler.jsonc`

## Rules

- keep runtime connection settings isolated in `src/config/`
- do not inline database connection strings across multiple files
- treat `DATABASE_URL` as the canonical PostgreSQL runtime input
- keep `HEALTHCHECK_EXPECT_*` values optional and use them only for non-secret rollout verification
- document security-sensitive secrets explicitly when code depends on them
- keep the Cloudflare Worker required-secret list in `wrangler.jsonc` aligned with the real runtime secret contract
- keep R2 buckets private by default and access them through Cloudflare bindings
- keep object metadata, ownership, and authorization state in PostgreSQL even when object bytes live in R2

## Deployment Baseline

For SIKESRA production, configure at minimum:

- `DATABASE_URL`
- `DATABASE_TRANSPORT=hyperdrive`
- `MINI_RUNTIME_TARGET=cloudflare`
- `SITE_URL=https://sikesrakobar.ahlikoding.com`
- `MINI_TOTP_ENCRYPTION_KEY`
- `TRUSTED_PROXY_MODE=cloudflare`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `R2_MEDIA_BUCKET_BINDING=MEDIA_BUCKET`
- `R2_MEDIA_BUCKET_NAME=sikesra`
- `EDGE_API_JWT_SECRET`
- `APP_SECRET`

See `docs/process/cloudflare-hosted-runtime.md` for the supported hosting model and deployment checks.
