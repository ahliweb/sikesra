# SIKESRA Runtime And Security Configuration

## Purpose

This document records the project-specific runtime and secret-handling baseline for SIKESRA Kobar. It follows the AWCMS Mini issue-driven workflow from `docs/process/ai-workflow-planning-templates.md` in the upstream AWCMS Mini repository and keeps the SIKESRA project aligned with EmDash-first AWCMS Mini, Cloudflare-served frontend delivery, a Hono backend API on a Coolify-managed VPS, PostgreSQL on the same VPS, and private R2 document storage.

## Runtime Baseline

- Base web domain: `sikesrakobar.ahlikoding.com`.
- Base URL: `https://sikesrakobar.ahlikoding.com`.
- PostgreSQL server: `id1.ahlikoding.com`.
- PostgreSQL database: `sikesrakobar`.
- PostgreSQL management surface: Coolify-managed PostgreSQL on the VPS.
- R2 bucket: `sikesra`.
- Application architecture: AWCMS Mini remains EmDash-first and single-tenant for this SIKESRA deployment.
- Hosting baseline: Cloudflare edge and frontend with the Hono backend API deployed on the Coolify-managed VPS.

## Secret Storage Rules

- Do not commit `.env`, `.env.local`, `.dev.vars`, connection strings, access keys, tokens, passwords, or private keys.
- Keep local-only values in `.env.local`, `.env.<environment>.local`, or another ignored env file.
- Keep local script secrets in `.env.local` or the inherited process environment. The maintained scripts share `scripts/_local-env.mjs` and must not parse or source env files ad hoc.
- Keep production backend secrets in reviewed deployment-managed secret storage rather than tracked config files.
- Keep Coolify-managed resource secrets in Coolify locked environment variables with runtime-only scope by default.
- Use Docker Build Secrets for build-time sensitive inputs if Coolify build-time secrets are unavoidable.
- Keep PostgreSQL credentials least-privilege and application-scoped; do not use PostgreSQL superuser credentials for the app runtime.
- Keep the SIKESRA runtime on the least-privilege PostgreSQL role and rotate direct runtime credentials through reviewed secret stores when database credentials change.
- Treat Coolify API responses as management-plane data and redact credentials, tokens, private URLs, and connection strings before copying output into issues or docs.
- Treat readiness output as operator-facing evidence: print only booleans, resource names, non-secret IDs, status codes, and expected database names; never print raw credentials, tokens, connection strings, hostnames from private URLs, or raw API payloads.

## Required Environment Values

The non-secret project identifiers are represented in `.env.example`:

- `SIKESRA_DATABASE_NAME=sikesrakobar`
- `SIKESRA_DATABASE_HOST=id1.ahlikoding.com`
- `SIKESRA_BASE_DOMAIN=sikesrakobar.ahlikoding.com`
- `SIKESRA_BASE_URL=https://sikesrakobar.ahlikoding.com`
- `SIKESRA_R2_BUCKET=sikesra`

Secret-bearing values must be supplied through local ignored env files, Cloudflare-managed operator storage, or Coolify locked secrets:

- `DATABASE_URL`
- `DATABASE_MIGRATION_URL` when operator migration access needs a reviewed private PostgreSQL route that differs from the general runtime path
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

Use tracked `.env.example` only for placeholders and non-secret defaults. Keep live values in ignored local env files, Coolify locked runtime secrets, or an external password manager.

For the current migration workflow, prefer `DATABASE_MIGRATION_URL` in ignored local env files when repository-owned migration commands must target a reviewed private PostgreSQL route that differs from the general runtime `DATABASE_URL` posture.

## Cloudflare Recommendations

- Keep Cloudflare as the browser-facing frontend and edge security layer, not the application runtime.
- Store Cloudflare operator credentials only in ignored local env files or another reviewed operator secret store.
- Keep R2 bucket configuration and Turnstile settings aligned with the reviewed public hostname.
- Bind R2 as a private bucket and serve documents only through permission-aware, audited application flows.
- Keep Turnstile hostname allowlists aligned with `sikesrakobar.ahlikoding.com` when login, reset, or invite flows are enabled.
- Prefer host-only secure cookies unless a reviewed operator workflow requires cross-host sharing.

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
- Redacted `psql` smoke test verified connectivity to database `sikesrakobar` after synchronizing ignored local credentials from Coolify.
- PostgreSQL SSL/TLS was enabled through the reviewed private database path for database `sikesrakobar`.
- Coolify is the reviewed management plane for the Hono backend API and PostgreSQL runtime secrets.
- Cloudflare MCP can access the R2 bucket `sikesra`; a non-sensitive smoke object was written, read, and deleted through the MCP.
- The local Cloudflare API token returned HTTP 403 for direct R2 bucket REST operations, so direct API automation needs either a token scope update or continued use of the Cloudflare MCP.
- Public smoke tests passed for base URL, `/_emdash/` admin entry redirect, setup shell, and R2 binding readiness.
- Repository migration tooling now supports `DATABASE_MIGRATION_URL` when operator migrations need the reviewed private PostgreSQL route while the general app runtime keeps its existing `DATABASE_URL` posture.

## Remaining Runtime Secret Work

- Run the EmDash first-run setup at `https://sikesrakobar.ahlikoding.com/_emdash/admin/setup` before treating the live app as operator-ready.
- If a Coolify application is later introduced, store runtime-only secrets as Coolify locked environment variables and keep them out of build scope.
- Keep database passwords, generated connection strings, R2 access keys, and API tokens out of GitHub issues and committed files.
- If `pnpm db:migrate:probe` still returns a redacted timeout after setting `DATABASE_MIGRATION_URL`, treat the blocker as operator-side private-route readiness and verify the reviewed Hono/PostgreSQL network path before retrying migrations.

## OWASP-Aligned Controls

- Validate all operator input server-side, including fields also validated in UI.
- Enforce RBAC/ABAC and region scope in the service layer, not only in UI controls.
- Mask NIK/KIA, child data, disability data, and sensitive document metadata by default.
- Audit privileged actions including credential rotation, document preview/download, sensitive field reveal, export, verification, and ID correction.
- Avoid sensitive data in logs, analytics, issue comments, screenshots, seed data, and test fixtures.
- Use least privilege for database, R2, Cloudflare, and Coolify credentials.

## Credential Migration Checklist

- Search scripts and configs before each deployment-affecting change for hardcoded credentials.
- Move any discovered credential values into `.env.local` or reviewed deployment-managed secret storage.
- Replace scripts with environment variable reads and fail closed when required values are missing.
- Update `.env.example` with placeholder keys only.
- Run `node scripts/check-secret-hygiene.mjs` before committing.

## Current Repository State

This SIKESRA repository now includes `scripts/verify-runtime-readiness.mjs`, `scripts/_local-env.mjs`, and `scripts/check-secret-hygiene.mjs`. The scripts read secrets only from ignored env files or process environment, support environment-specific local overrides through the shared loader, print redacted reports, and fail closed when required infrastructure is missing.

No tracked scripts currently contain hardcoded credential values; local-only connection values remain in ignored env files.

## Tracking Issues

- Worker replacement follow-on: ahliweb/sikesra#44.
- Planning index: ahliweb/sikesra#40.
- Document upload/R2 UI: ahliweb/sikesra#28.
- Reports/export sensitive data flow: ahliweb/sikesra#32.
- Implementation documentation: ahliweb/sikesra#39.
