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
- Keep local-only values in `.env.local` or another ignored env file.
- Keep Cloudflare Worker production secrets in Cloudflare Worker secrets, not in `wrangler` config values.
- Keep Coolify-managed resource secrets in Coolify locked environment variables with runtime-only scope by default.
- Use Docker Build Secrets for build-time sensitive inputs if Coolify build-time secrets are unavoidable.
- Keep PostgreSQL credentials least-privilege and application-scoped; do not use PostgreSQL superuser credentials for the app runtime.
- Treat Coolify API responses as management-plane data and redact credentials, tokens, private URLs, and connection strings before copying output into issues or docs.

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

## Cloudflare Recommendations

- Declare required Worker secret names in Wrangler configuration when this repository adds Worker config.
- Store secret values through `wrangler secret put` or the Cloudflare dashboard.
- Bind R2 as a private bucket and serve documents only through permission-aware, audited application flows.
- Keep Turnstile hostname allowlists aligned with `sikesrakobar.ahlikoding.com` when login, reset, or invite flows are enabled.
- Prefer host-only secure cookies unless a reviewed operator workflow requires cross-host sharing.

## Coolify Recommendations

- Provision the `sikesrakobar` PostgreSQL database through Coolify or the Coolify API.
- Store runtime secrets in Coolify locked environment variables.
- Disable build-time exposure for runtime-only secrets.
- Use required-variable guards such as `${DATABASE_URL:?}` in Docker Compose only when this project introduces compose-managed services.
- Use Context7 canonical Coolify documentation `/coollabsio/coolify-docs` for API and secret-management references.

## Provisioning Status

- Coolify API access is available locally through ignored `.env.local` values `COOLIFY_BASE_URL` and `COOLIFY_ACCESS_TOKEN`.
- Coolify target server identified for the database: `server database id1.ahlikoding`.
- Coolify target project identified for database resources: `awcms dev`.
- Coolify target environment identified for database resources: `id1.ahlikoding.com database`.
- Managed PostgreSQL resource created for SIKESRA Kobar: `sikesrakobar-postgres`.
- PostgreSQL resource status verified through the Coolify API: `running:healthy`.
- PostgreSQL database name verified: `sikesrakobar`.
- PostgreSQL application user verified: `sikesrakobar_app`.
- PostgreSQL public exposure verified through Coolify API: `is_public=false`.
- Coolify currently reports no application or service resource for this repository, so application runtime secrets cannot yet be stored in a Coolify application scope.
- Cloudflare MCP can access the R2 bucket `sikesra`; a non-sensitive smoke object was written, read, and deleted through the MCP.
- The local Cloudflare API token returned HTTP 403 for direct R2 bucket REST operations, so direct API automation needs either a token scope update or continued use of the Cloudflare MCP.

## Remaining Runtime Secret Work

- Create or identify the Cloudflare Worker/application deployment resource for `sikesrakobar.ahlikoding.com`.
- Store Worker runtime secrets in Cloudflare secrets once the Worker resource exists.
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
- Run focused secret-hygiene checks before committing.

## Current Repository State

This SIKESRA repository currently contains PRD documents, local env configuration, and runtime/security planning docs. No script files are currently present in this repository, so there are no repository-local script credentials to migrate in this step.

## Tracking Issues

- Runtime provisioning and environment synchronization: ahliweb/awcms-mini#243.
- Planning index: ahliweb/awcms-mini#242.
- Document upload/R2 UI: ahliweb/awcms-mini#230.
- Reports/export sensitive data flow: ahliweb/awcms-mini#234.
- Implementation documentation: ahliweb/awcms-mini#241.
