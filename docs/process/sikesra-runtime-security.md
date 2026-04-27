# SIKESRA Runtime And Security Configuration

## Purpose

This document records the project-specific runtime and secret-handling baseline for SIKESRA Kobar. It follows the AWCMS Mini issue-driven workflow from `docs/process/ai-workflow-planning-templates.md` in the upstream AWCMS Mini repository and keeps the SIKESRA project aligned with EmDash-first AWCMS Mini, Cloudflare-hosted runtime, PostgreSQL on a Coolify-managed VPS, and private R2 document storage.

## Runtime Baseline

- Base web domain: `sikesrakobar.ahlikoding.com`.
- Base URL: `https://sikesrakobar.ahlikoding.com`.
- PostgreSQL server: `id1.ahlikoding.com`.
- PostgreSQL database: `sikesrakobar`.
- PostgreSQL management surface: Coolify-managed PostgreSQL on the VPS.
- R2 bucket: `sikesra`.
- Application architecture: AWCMS Mini remains EmDash-first and single-tenant for this SIKESRA deployment.
- Hosting baseline: Cloudflare-hosted Worker runtime with PostgreSQL transport configured through the reviewed AWCMS Mini deployment path.

## Secret Storage Rules

- Do not commit `.env`, `.env.local`, `.dev.vars`, connection strings, access keys, tokens, passwords, or private keys.
- Keep local-only values in `.env.local`, `.env.<environment>.local`, or another ignored env file.
- Keep Cloudflare Worker production secrets in Cloudflare Worker secrets, not in `wrangler` config values.
- Keep local script secrets in `.env.local` or the inherited process environment. The maintained scripts share `scripts/_local-env.mjs` and must not parse or source env files ad hoc.
- Keep the reviewed Worker secret contract centralized in `wrangler.jsonc`; operator scripts should read that contract rather than duplicating required secret names in multiple files.
- Keep Coolify-managed resource secrets in Coolify locked environment variables with runtime-only scope by default.
- Use Docker Build Secrets for build-time sensitive inputs if Coolify build-time secrets are unavoidable.
- Keep PostgreSQL credentials least-privilege and application-scoped; do not use PostgreSQL superuser credentials for the app runtime.
- Keep the SIKESRA runtime on the least-privilege PostgreSQL role and rotate the Hyperdrive config if database credentials are rotated again.
- Treat Coolify API responses as management-plane data and redact credentials, tokens, private URLs, and connection strings before copying output into issues or docs.
- Treat readiness output as operator-facing evidence: print only booleans, resource names, non-secret IDs, status codes, and expected database names; never print raw credentials, tokens, connection strings, hostnames from private URLs, or raw API payloads.

## Required Environment Values

The non-secret project identifiers are represented in `.env.example`:

- `SIKESRA_DATABASE_NAME=sikesrakobar`
- `SIKESRA_DATABASE_HOST=id1.ahlikoding.com`
- `SIKESRA_BASE_DOMAIN=sikesrakobar.ahlikoding.com`
- `SIKESRA_BASE_URL=https://sikesrakobar.ahlikoding.com`
- `SIKESRA_R2_BUCKET=sikesra`

Secret-bearing values must be supplied through local ignored env files, Cloudflare secrets, or Coolify locked secrets:

- `DATABASE_URL`
- PostgreSQL username and password if split variables are used
- R2 access key and secret key
- Cloudflare API token
- Coolify base URL and access token, using `COOLIFY_BASE_URL` and `COOLIFY_ACCESS_TOKEN` for compatibility with the AWCMS Mini Coolify MCP wrapper and audit scripts
- Turnstile secret key
- session/JWT secrets

When local operator workflows need environment-specific separation, the shared helper now loads env files in this order:

1. `.env.<SIKESRA_ENV>.local` or `.env.<NODE_ENV>.local`
2. `.env.local`
3. `.env.<SIKESRA_ENV>` or `.env.<NODE_ENV>`
4. `.env`

Use tracked `.env.example` only for placeholders and non-secret defaults. Keep live values in ignored local env files, Cloudflare Worker secrets, Coolify locked runtime secrets, or an external password manager.

## Cloudflare Recommendations

- Declare required Worker secret names in Wrangler configuration when this repository adds Worker config.
- Store secret values through `wrangler secret put` or the Cloudflare dashboard.
- Use `node scripts/sync-worker-secrets.mjs` after the Worker exists to populate the required Cloudflare Worker secrets from ignored env values without printing secret values.
- `scripts/sync-worker-secrets.mjs` and `scripts/verify-runtime-readiness.mjs` should derive required secret names from `wrangler.jsonc` so the local operator workflow stays aligned with reviewed EmDash/runtime changes.
- Bind R2 as a private bucket and serve documents only through permission-aware, audited application flows.
- Keep Turnstile hostname allowlists aligned with `sikesrakobar.ahlikoding.com` when login, reset, or invite flows are enabled.
- Prefer host-only secure cookies unless a reviewed operator workflow requires cross-host sharing.
- Keep the Worker aligned with the AWCMS Mini EmDash-first Cloudflare baseline: `@astrojs/cloudflare/entrypoints/server`, `nodejs_compat`, `global_fetch_strictly_public`, `/_emdash/` admin entry, required Worker secrets, R2 binding `MEDIA_BUCKET`, and Hyperdrive binding `HYPERDRIVE`.
- Replace `REPLACE_WITH_SIKESRA_HYPERDRIVE_ID` in `wrangler.jsonc` only after a SIKESRA-specific Hyperdrive configuration is created for the Coolify-managed PostgreSQL database.
- Context7 Cloudflare Workers documentation confirms the Worker should bind Hyperdrive through Wrangler using `nodejs_compat` and a non-secret Hyperdrive ID, while database credentials belong in the Hyperdrive configuration or Worker secrets rather than committed files.

## Coolify Recommendations

- Provision the `sikesrakobar` PostgreSQL database through Coolify or the Coolify API.
- Store runtime secrets in Coolify locked environment variables.
- Disable build-time exposure for runtime-only secrets.
- Use required-variable guards such as `${DATABASE_URL:?}` in Docker Compose only when this project introduces compose-managed services.
- Use Context7 canonical Coolify documentation `/coollabsio/coolify-docs` for API and secret-management references.
- Context7 Coolify documentation distinguishes runtime variables from build variables and recommends disabling build exposure for runtime-only API keys, database URLs, and passwords; Docker Build Secrets are only for unavoidable build-time sensitive inputs.

## Provisioning Status

- Coolify API access is available locally through ignored `.env.local` values `COOLIFY_BASE_URL` and `COOLIFY_ACCESS_TOKEN`.
- Coolify target server identified for the database: `server database id1.ahlikoding`.
- Coolify target project identified for database resources: `awcms dev`.
- Coolify target environment identified for database resources: `id1.ahlikoding.com database`.
- Managed PostgreSQL resource created for SIKESRA Kobar: `sikesrakobar-postgres`.
- PostgreSQL resource status verified through the Coolify API: `running:healthy`.
- PostgreSQL database name verified: `sikesrakobar`.
- PostgreSQL application user verified: `sikesrakobar_runtime`.
- PostgreSQL public exposure verified through Coolify API: `is_public=false`.
- SIKESRA-specific protected Tunnel hostname configured for Hyperdrive origin access: `pg-sikesra-hyperdrive.ahlikoding.com`.
- Redacted `psql` smoke test through Cloudflare Access and Tunnel verified connectivity to database `sikesrakobar` after synchronizing ignored local credentials from Coolify.
- PostgreSQL SSL/TLS was enabled through the private database path and the original SIKESRA Hyperdrive config was later rotated to least-privilege-backed Hyperdrive config `sikesra-kobar-postgres-runtime` for database `sikesrakobar`.
- Coolify currently reports no application or service resource for this repository, so application runtime secrets cannot yet be stored in a Coolify application scope.
- Cloudflare MCP can access the R2 bucket `sikesra`; a non-sensitive smoke object was written, read, and deleted through the MCP.
- The local Cloudflare API token returned HTTP 403 for direct R2 bucket REST operations, so direct API automation needs either a token scope update or continued use of the Cloudflare MCP.
- Repository-side Cloudflare Worker configuration now exists in `wrangler.jsonc` for Worker `sikesra-kobar`, custom domain `sikesrakobar.ahlikoding.com`, R2 binding `MEDIA_BUCKET` to bucket `sikesra`, and the AWCMS Mini required Worker secret contract.
- `wrangler.jsonc` now contains the non-secret SIKESRA Hyperdrive ID for `sikesra-kobar-postgres-runtime`; do not replace it with the existing AWCMS Mini Hyperdrive ID.
- Cloudflare Worker `sikesra-kobar` is now deployed with the full AWCMS Mini/EmDash Worker build, required Worker secrets, R2 binding, Hyperdrive binding, SESSION KV binding, and Worker Custom Domain `sikesrakobar.ahlikoding.com`.
- Public smoke tests passed for base URL, `/_emdash/` admin entry redirect, setup shell, Hyperdrive binding presence, and R2 binding readiness.

## Remaining Runtime Secret Work

- Run the EmDash first-run setup at `https://sikesrakobar.ahlikoding.com/_emdash/admin/setup` before treating the live app as operator-ready.
- Keep the SIKESRA-specific Cloudflare Hyperdrive configuration for the Coolify-managed PostgreSQL resource aligned with `wrangler.jsonc`.
- Keep Worker runtime secrets synchronized in Cloudflare secrets with `scripts/sync-worker-secrets.mjs` after each secret rotation.
- If a Coolify application is later introduced, store runtime-only secrets as Coolify locked environment variables and keep them out of build scope.
- Keep database passwords, generated connection strings, R2 access keys, and API tokens out of GitHub issues and committed files.

## OWASP-Aligned Controls

- Validate all operator input server-side, including fields also validated in UI.
- Enforce RBAC/ABAC and region scope in the service layer, not only in UI controls.
- Mask NIK/KIA, child data, disability data, and sensitive document metadata by default.
- Audit privileged actions including credential rotation, document preview/download, sensitive field reveal, export, verification, and ID correction.
- Avoid sensitive data in logs, analytics, issue comments, screenshots, seed data, and test fixtures.
- Use least privilege for database, R2, Cloudflare, and Coolify credentials.

## Credential Migration Checklist

- Search scripts and configs before each deployment-affecting change for hardcoded credentials.
- Move any discovered credential values into `.env.local`, Cloudflare Worker secrets, or Coolify locked secrets.
- Replace scripts with environment variable reads and fail closed when required values are missing.
- Update `.env.example` with placeholder keys only.
- Run `node scripts/check-secret-hygiene.mjs` before committing.

## Current Repository State

This SIKESRA repository now includes `scripts/verify-runtime-readiness.mjs`, `scripts/create-sikesra-hyperdrive.mjs`, `scripts/deploy-smoke-worker.mjs`, `scripts/sync-worker-secrets.mjs`, `scripts/_local-env.mjs`, `scripts/_wrangler-config.mjs`, and `scripts/check-secret-hygiene.mjs`. The scripts read secrets only from ignored env files or process environment, support environment-specific local overrides through the shared loader, derive the reviewed Worker secret contract from `wrangler.jsonc`, print redacted reports, and fail closed when required infrastructure is missing.

No tracked scripts currently contain hardcoded credential values; local-only connection values remain in ignored env files.

## Tracking Issues

- Worker replacement follow-on: ahliweb/sikesra#44.
- Planning index: ahliweb/sikesra#40.
- Document upload/R2 UI: ahliweb/sikesra#28.
- Reports/export sensitive data flow: ahliweb/sikesra#32.
- Implementation documentation: ahliweb/sikesra#39.
