# Cloudflare Edge And Hono Runtime

## Purpose

This runbook defines the supported hosting baseline for AWCMS Mini SIKESRA when Cloudflare serves the public frontend and edge layer while the Hono backend API runs on a Coolify-managed VPS with PostgreSQL on the same VPS.

## Supported Baseline

The supported baseline production path is:

1. Browser to Cloudflare
2. Cloudflare serves the public frontend and applies reviewed edge controls
3. Hono backend API on Coolify handles auth, database access, file access, and provider integrations
4. PostgreSQL remains on the protected VPS and is reachable from Hono through the reviewed runtime path

For local development, the reviewed equivalent is a Docker Compose stack where the Hono API reaches PostgreSQL through the same internal hostname pattern (`postgres`) while Cloudflare-managed services such as Pages, R2, and Turnstile remain external and env-driven.

Use `docs/process/local-compose-remote-coolify-workflow.md` as the recommended promotion path from local development into the remote Coolify-managed runtime.

## Runtime Expectations

- `APP_URL` matches the browser-facing hostname
- `API_BASE_URL` and `PUBLIC_API_BASE_URL` point to the reviewed Hono API origin
- the reviewed single-host admin browser entry is `https://sikesrakobar.ahlikoding.com/_emdash/`
- `TRUSTED_PROXY_MODE=cloudflare` is set when the API sits behind Cloudflare proxying
- `DATABASE_URL` points to the intended PostgreSQL target for the Hono runtime
- `DATABASE_MIGRATION_URL` is used only when the operator migration path differs from the runtime path
- `TURNSTILE_SECRET_KEY` is stored as a server-only backend secret when Turnstile protection is enabled
- `TURNSTILE_EXPECTED_HOSTNAMES` should be set or derived correctly for the reviewed hostname set in the environment
- `EDGE_API_JWT_SECRET` is stored as a server-only backend secret when edge API token issuance is enabled
- `R2_BUCKET_NAME=sikesra` and the reviewed backend R2 credentials are configured when object storage is enabled
- `CORS_ALLOWED_ORIGINS` is limited to the reviewed frontend origin set

## Cloudflare Expectations

- Keep Cloudflare as the browser-facing TLS and edge security layer for the public hostname
- Use Cloudflare Pages or another reviewed Cloudflare frontend surface for the public and admin UI when that surface is active
- Keep `/_emdash/` as the reviewed browser entry alias and redirect it into EmDash's current `/_emdash/admin` surface on the same host
- Keep Turnstile, rate limiting, managed challenge, and related edge protections aligned with the reviewed public hostname set
- Keep R2 buckets private by default and expose downloads through reviewed application paths
- Do not treat a Cloudflare Worker as the active application runtime or PostgreSQL transport layer in this repository baseline
- Keep versioned external-client APIs under `/api/v1/*` and do not expose `/_emdash/api/*` as the mobile or external API surface

## PostgreSQL Expectations

- Treat PostgreSQL as a private runtime dependency
- Use TLS for database traffic when the path leaves the private runtime network
- Prefer the internal Docker hostname for the Hono runtime when it is available on the Coolify-managed VPS
- Prefer `DATABASE_MIGRATION_URL` values that connect through a reviewed external hostname only when an operator migration environment needs that path
- Prefer `sslmode=verify-full` when certificate validation is available, and treat weaker modes such as `require` as explicitly documented interim posture only
- Keep firewall and `pg_hba.conf` rules scoped narrowly
- Use non-superuser runtime credentials

## Minimum Operator Checks

Before deployment:

- Confirm the reviewed frontend deployment and Hono API deployment both target the intended environment
- Confirm non-interactive Cloudflare automation has `CLOUDFLARE_API_TOKEN` available before relying on Cloudflare-managed DNS, R2, or Turnstile changes
- Confirm `APP_URL`, `API_BASE_URL`, `PUBLIC_API_BASE_URL`, `CORS_ALLOWED_ORIGINS`, and security secrets are set correctly
- Confirm the reviewed backend R2 configuration still targets bucket `sikesra`
- Confirm `ADMIN_ENTRY_PATH=/_emdash/` for the reviewed single-host baseline if the host runtime still uses it
- Confirm `TURNSTILE_EXPECTED_HOSTNAMES` or its derived fallback matches the reviewed hostname set when Turnstile is enabled
- Confirm `EDGE_API_JWT_SECRET` and any non-default `EDGE_API_JWT_*` settings are set correctly when `/api/v1/token` is enabled
- Confirm `DATABASE_URL` or approved database transport configuration points to the intended PostgreSQL target
- Confirm the reviewed PostgreSQL runtime and migration paths match the intended Docker-network or operator path for the release window

After deployment:

- Confirm the public hostname responds through the reviewed Cloudflare frontend path
- Confirm `https://sikesrakobar.ahlikoding.com/_emdash/` redirects to `/_emdash/admin` on the same host
- Confirm `https://sikesrakobar.ahlikoding.com/_emdash/admin/setup` renders the EmDash setup shell instead of a generic backend initialization failure
- Confirm `https://sikesrakobar.ahlikoding.com/_emdash/api/setup/status` returns `200` from the Hono-backed PostgreSQL setup seam; on a fresh site, `needsSetup: true` is expected until the first admin is created
- Confirm admin routes load through the public hostname
- Confirm auth logging and lockout behavior reflect the expected Cloudflare client IP source
- Confirm the Hono runtime can reach R2 for `sikesra`
- Confirm the app can reach PostgreSQL and complete health or smoke tests for the selected environment
- Confirm the deployed runtime still uses the reviewed Hono-to-PostgreSQL transport posture after the rollout

## Cloudflare Automation Smoke Tests

Run these in order after a deployment or after Cloudflare-side automation changes.

### 1. Public Hostname

- Request `https://sikesrakobar.ahlikoding.com/` and confirm the public site responds through the current reviewed Cloudflare frontend deployment.
- Confirm the response is served through Cloudflare-managed TLS.
- Confirm the public hostname remains the canonical browser-facing site URL.
- Confirm the hostname is attached through the reviewed frontend and proxy configuration rather than an unrelated legacy route.

### 2. Admin Entry

- Request `https://sikesrakobar.ahlikoding.com/_emdash/`.
- Confirm the alias redirects to `/_emdash/admin` on the same host.
- Confirm the EmDash admin surface loads there without introducing a second admin shell or alternate API surface.
- Use `docs/process/runtime-smoke-test.md` for the canonical live verification flow and the focused smoke commands that cover this alias and setup shell.

### 3. Turnstile-Protected Flows

- Confirm the login screen renders the Turnstile widget when Turnstile is enabled.
- Confirm a valid Turnstile solve allows the protected flow to continue.
- Confirm an invalid or missing token fails server-side.
- Confirm Siteverify hostname handling accepts only the reviewed hostname set from `TURNSTILE_EXPECTED_HOSTNAMES` or the derived `APP_URL` fallback.
- Review Turnstile analytics for unexpected hostname, action, or challenge anomalies after rollout.

### 4. R2 Access

- Confirm the reviewed runtime configuration still targets bucket `sikesra`.
- Confirm the runtime can resolve the reviewed R2 configuration without throwing `R2_BUCKET_NOT_CONFIGURED`.
- If an upload-capable flow is enabled in the environment, confirm the app can write and read an approved private object through the application path.

### 5. PostgreSQL Reachability

- Run `pnpm healthcheck` or the environment-equivalent health path.
- Confirm the app can still reach PostgreSQL on the Coolify-managed VPS.
- Confirm the reviewed runtime path and TLS posture still match the intended deployment configuration.
- Confirm the deployed `DATABASE_URL` or `DATABASE_MIGRATION_URL` secret matches the reviewed hostname and SSL mode rather than an outdated direct-IP value.
- When the reviewed rollout target is known, prefer the non-secret `pnpm healthcheck` assertion variables so runtime verification fails fast on the wrong transport, hostname, SSL mode, or binding.
- Confirm no Cloudflare-side automation change accidentally altered the database path assumptions.
- Confirm any local-only env copy used for troubleshooting remains untracked and is not being treated as production secret storage.

## Focused Admin Smoke Script

Use `pnpm smoke:cloudflare-admin` after reviewed Cloudflare-side changes that could affect the admin entry alias or setup shell.

For the canonical command sequence and the combined live verification wrapper, see `docs/process/runtime-smoke-test.md`.

The script checks:

- `/_emdash/` returns the reviewed same-host redirect into `/_emdash/admin`
- `/_emdash/admin/setup` returns HTML without the reviewed runtime error markers that previously surfaced blanket startup failures
- `/_emdash/api/setup/status` as the Hono-backed PostgreSQL diagnostic seam so setup-shell failures are easier to distinguish from broader runtime or database initialization failures
- `needsSetup: true` on a fresh bootstrap is an expected readiness state, not a migration repair condition

Target selection order:

1. explicit base URL argument
2. `SMOKE_TEST_BASE_URL`
3. `APP_URL`

Example:

```bash
pnpm smoke:cloudflare-admin -- https://sikesrakobar.ahlikoding.com
```

## Partial Provisioning Rollback

If Cloudflare automation only partially succeeds, use the smallest rollback that restores a coherent deployment state.

Rollback order:

1. Record the currently deployed git commit and the active frontend and API release identifiers.
2. Record which Cloudflare-side resources changed: hostname routing, Turnstile widget settings, frontend deployment, or R2 configuration.
3. If the frontend deployment is the problem, roll back that deployment before changing backend code.
4. If an API deployment is the problem, roll back the Hono service deployment through the reviewed Coolify or operator path before changing Cloudflare settings.
5. If Turnstile blocks valid traffic, restore the previous reviewed hostname set or secret configuration rather than disabling all server-side validation blindly.
6. If the reviewed R2 configuration is missing or incorrect, restore the last known good runtime configuration before changing application storage logic.
7. Re-run the smoke tests in this document after the rollback step completes.

Do not mix partial Cloudflare rollback, unreviewed runtime edits, and direct database changes in the same recovery step unless the incident has been escalated and the operator has captured the full state first.

## Current Account Visibility Caveat

During the current implementation pass, the Cloudflare MCP session did not return complete zone, DNS, or frontend inventory for the reviewed Cloudflare account.

Current consequence:

- operators should still record the live `ahlikoding.com` zone ID and confirm the deployed frontend and API targets are the reviewed public surfaces during environment rollout
- the smoke tests in this document remain the required verification step until account inventory is readable through the available Cloudflare management path
- the same caveat applies to other Cloudflare-side rollout work when the available Cloudflare management path cannot read the live account inventory non-interactively

## Cross-References

- `docs/architecture/runtime-config.md`
- `docs/security/operations.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/postgresql-vps-hardening.md`
