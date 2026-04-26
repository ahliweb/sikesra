# Cloudflare Hosted Runtime

## Purpose

This runbook defines the supported hosting baseline for AWCMS Mini SIKESRA when the application runtime is hosted on Cloudflare and PostgreSQL remains on a protected VPS managed through Coolify.

## Supported Baseline

The supported baseline production path is:

1. Browser to Cloudflare
2. Cloudflare-hosted AWCMS Mini SIKESRA runtime serves the public hostname
3. Mini connects to PostgreSQL on the protected VPS
4. Coolify manages the PostgreSQL host lifecycle and related operator configuration

## Runtime Expectations

- `MINI_RUNTIME_TARGET=cloudflare`
- `SITE_URL` matches the browser-facing Cloudflare hostname
- the reviewed single-host admin browser entry is `https://sikesrakobar.ahlikoding.com/_emdash/`
- optional `ADMIN_SITE_URL` remains a compatibility-only entry host when an operator still needs a dedicated admin hostname
- `TRUSTED_PROXY_MODE=cloudflare`
- `DATABASE_URL` points to the intended remote PostgreSQL instance
- `DATABASE_TRANSPORT=hyperdrive` is the reviewed production default for the current live Cloudflare deployment
- `wrangler.jsonc` or equivalent deployment config defines the Worker, assets, observability, and required bindings
- `TURNSTILE_SECRET_KEY` is stored as a server-only secret when Turnstile protection is enabled
- `TURNSTILE_EXPECTED_HOSTNAMES` should be set or derived correctly for the reviewed hostname set in the environment
- `EDGE_API_JWT_SECRET` is stored as a server-only secret when edge API token issuance is enabled
- `R2_MEDIA_BUCKET_BINDING=MEDIA_BUCKET` maps to the private R2 bucket `sikesra` when object storage is enabled
- `EDGE_API_ALLOWED_ORIGINS` stays empty unless an approved cross-origin external client needs browser access

## Cloudflare Expectations

- Use the Astro Cloudflare adapter for the supported runtime build
- Treat the reviewed Wrangler/operator deployment path as the production source of truth; the earlier Cloudflare Git-integrated Workers Builds path has been intentionally retired for this Worker
- Use the route-safe Wrangler flow for reviewed production deploys: `wrangler versions upload` followed by `wrangler versions deploy`
- Keep production secrets in Cloudflare-managed Worker secrets such as `wrangler secret put`; do not treat local `.dev.vars` files or Wrangler `[vars]` as the deployed secret store
- Keep the reviewed required runtime secrets declared in `wrangler.jsonc` so local/dev and deploy flows fail clearly when the Worker secret contract is incomplete. The shared local Astro wrapper now enforces the same required-secret list before `astro dev`, `astro check`, or `astro build` starts.
- Keep Worker compatibility flags aligned with the runtime needs of the current codebase
- Keep observability enabled for production deployment
- Prefer the Worker custom domain for `sikesrakobar.ahlikoding.com` as the reviewed single-host baseline because the Worker is the origin for this deployment model
- Ensure the adapter's default `SESSION` KV binding or an explicit equivalent binding is available
- Keep `/_emdash/` as the reviewed browser entry alias and redirect it into EmDash's current `/_emdash/admin` surface on the same host
- Keep the setup shell under `/_emdash/admin/setup` database-lazy in repository middleware so transport/bootstrap reconciliation does not turn into a blanket Worker exception before the EmDash setup flow can render
- Keep the reviewed Hyperdrive binding active in Worker config for the current live deployment, while local Astro validation derives the required local connection string from env-managed `DATABASE_URL`
- If split hostnames are still used for compatibility, keep the admin hostname pointed at the same Worker deployment and treat it as an entry host for the configured admin entry path
- Add edge protections such as rate limiting, managed challenge, or Turnstile on abuse-prone routes as those features land
- The current Turnstile-covered public flows are login, password-reset request, and invite activation when the Turnstile secret is configured
- Keep Turnstile hostname expectations aligned with `SITE_URL`, optional `ADMIN_SITE_URL`, or an explicit `TURNSTILE_EXPECTED_HOSTNAMES` allowlist
- Keep `/api/v1/token` behind Cloudflare rate limiting or equivalent abuse controls before broad external-client rollout
- Keep R2 buckets private by default and expose downloads through controlled application paths as upload features land
- Keep the Worker R2 binding aligned with `sikesra` unless an explicit reviewed bucket migration occurs
- Keep versioned external-client APIs under `/api/v1/*` and do not expose `/_emdash/api/*` as the mobile/external API surface

## PostgreSQL Expectations

- Treat PostgreSQL as a private remote dependency
- Use TLS for database traffic
- Keep `DATABASE_TRANSPORT=hyperdrive` for the current live Cloudflare deployment unless a reviewed rollback intentionally returns the Worker to direct PostgreSQL transport
- Prefer `DATABASE_URL` values that connect through `id1.ahlikoding.com` for hostname validation in the reviewed production baseline
- Prefer `sslmode=verify-full` when certificate validation is available, and treat weaker modes such as `require` as explicitly documented interim posture only
- Keep firewall and `pg_hba.conf` rules scoped narrowly
- Use non-superuser runtime credentials
- If Hyperdrive is enabled, treat it as the preferred pooling and transport layer from the Cloudflare-hosted runtime rather than a replacement for PostgreSQL hardening

## Minimum Operator Checks

Before deployment:

- Confirm `pnpm build` produces the Cloudflare Worker bundle successfully
- Confirm the reviewed build flow does not leave `dist/server/.dev.vars*` artifacts behind after local packaging
- Confirm non-interactive Cloudflare automation has `CLOUDFLARE_API_TOKEN` available before relying on Wrangler-managed binding changes
- Confirm `wrangler.jsonc` matches the intended Worker name and bindings
- Confirm `wrangler.jsonc` declares the reviewed public custom-domain route for `sikesrakobar.ahlikoding.com`
- Confirm the `MEDIA_BUCKET` binding targets `sikesra`
- Confirm `MINI_RUNTIME_TARGET=cloudflare` in the deployment environment
- Confirm `SITE_URL`, `TRUSTED_PROXY_MODE`, and security secrets are set correctly
- Confirm the required Worker secrets declared in `wrangler.jsonc` are present in Cloudflare-managed secrets or the reviewed local env-managed development files before deploy
- Confirm `ADMIN_ENTRY_PATH=/_emdash/` for the reviewed single-host baseline
- Confirm `ADMIN_SITE_URL` only if a dedicated admin hostname is still enabled for compatibility
- Confirm `TURNSTILE_EXPECTED_HOSTNAMES` or its derived fallback matches the reviewed hostname set when Turnstile is enabled
- Confirm `EDGE_API_JWT_SECRET` and any non-default `EDGE_API_JWT_*` settings are set correctly when `/api/v1/token` is enabled
- Confirm `DATABASE_TRANSPORT` matches the intended deployment path
- Confirm `DATABASE_URL` or approved database transport configuration points to the intended PostgreSQL target
- Confirm the reviewed PostgreSQL SSL hostname `id1.ahlikoding.com` remains the intended origin posture behind the active Hyperdrive path
- Confirm the `HYPERDRIVE` binding exists when `DATABASE_TRANSPORT=hyperdrive`

After deployment:

- Confirm the public hostname responds through the Cloudflare-hosted runtime
- Confirm `https://sikesrakobar.ahlikoding.com/_emdash/` redirects to `/_emdash/admin` on the same host
- Confirm `https://sikesrakobar.ahlikoding.com/_emdash/admin/setup` renders the EmDash setup shell instead of a Worker exception during transport/bootstrap reconciliation
- Confirm `https://sikesrakobar.ahlikoding.com/_emdash/api/setup/status` no longer returns `NOT_CONFIGURED` on the live Worker
- Confirm admin routes load through the public hostname and, if still configured, the dedicated admin hostname compatibility path
- Confirm auth logging and lockout behavior reflect the expected Cloudflare client IP source
- Confirm the runtime can see the `MEDIA_BUCKET` binding for `sikesra`
- Confirm the app can reach PostgreSQL and complete health or smoke tests for the selected environment
- Confirm the deployed runtime still uses the reviewed transport posture for PostgreSQL connectivity after the rollout

## Cloudflare Automation Smoke Tests

Run these in order after a deployment or after Cloudflare-side automation changes.

### 1. Public Hostname

- Request `https://sikesrakobar.ahlikoding.com/` and confirm the public site responds through the current Worker deployment.
- Confirm the response is served through Cloudflare-managed TLS.
- Confirm the public hostname remains the canonical browser-facing site URL.
- Confirm the hostname is attached through the Worker custom-domain path rather than an unrelated legacy route.

### 2. Admin Entry

- Request `https://sikesrakobar.ahlikoding.com/_emdash/`.
- Confirm the alias redirects to `/_emdash/admin` on the same host.
- Confirm the EmDash admin surface loads there without introducing a second admin shell or alternate API surface.
- If `ADMIN_SITE_URL` is still configured for compatibility, confirm the hostname root redirects to the configured admin entry path on the same Worker deployment.
- Prefer `pnpm verify:live-runtime -- https://sikesrakobar.ahlikoding.com` when the deploy window needs the reviewed combined verification path for deployed database posture and the admin/setup smoke seam. The command now asserts the reviewed Hyperdrive transport and binding by default unless an operator explicitly overrides the expectation inputs.
- Prefer `pnpm smoke:cloudflare-admin` as the focused regression check for the reviewed admin-entry alias and setup-shell path.
- Prefer `pnpm smoke:deployed-runtime-health -- https://sikesrakobar.ahlikoding.com` when operators need the deployed Worker to report its non-secret database posture without depending on workstation-level direct reachability to the private PostgreSQL origin.

### 3. Turnstile-Protected Flows

- Confirm the login screen renders the Turnstile widget when Turnstile is enabled.
- Confirm a valid Turnstile solve allows the protected flow to continue.
- Confirm an invalid or missing token fails server-side.
- Confirm Siteverify hostname handling accepts only the reviewed hostname set from `TURNSTILE_EXPECTED_HOSTNAMES` or the derived `SITE_URL` and optional `ADMIN_SITE_URL` fallback.
- Review Turnstile analytics for unexpected hostname, action, or challenge anomalies after rollout.

### 4. R2 Binding

- Confirm `wrangler.jsonc` and the deployed Worker configuration still bind `MEDIA_BUCKET` to `sikesra`.
- Confirm the runtime can resolve the `MEDIA_BUCKET` binding without throwing `R2_BUCKET_NOT_CONFIGURED`.
- If an upload-capable flow is enabled in the environment, confirm the app can write and read an approved private object through the application path.

### 5. PostgreSQL Reachability

- Run `pnpm healthcheck` or the environment-equivalent health path.
- Confirm the app can still reach PostgreSQL on the Coolify-managed VPS.
- Confirm the reviewed application hostname `id1.ahlikoding.com` and TLS posture still match the intended deployment configuration when `DATABASE_TRANSPORT=direct`.
- Confirm the deployed `DATABASE_URL` secret matches the reviewed hostname and SSL mode rather than an outdated direct-IP value when `DATABASE_TRANSPORT=direct`.
- Confirm the `HYPERDRIVE` binding resolves correctly when `DATABASE_TRANSPORT=hyperdrive`.
- When the reviewed rollout target is known, prefer the non-secret `pnpm healthcheck` assertion variables so runtime verification fails fast on the wrong transport, hostname, SSL mode, or binding.
- Confirm no Cloudflare-side automation change accidentally altered the database path assumptions.
- Confirm any local-only `.dev.vars` copy used for troubleshooting remains untracked and is not being treated as production secret storage.

## Focused Admin Smoke Script

Use `pnpm smoke:cloudflare-admin` after reviewed Cloudflare-side changes that could affect the admin entry alias or setup shell.

The script checks:

- `/_emdash/` returns the reviewed same-host redirect into `/_emdash/admin`
- `/_emdash/admin/setup` returns HTML without the reviewed runtime error markers that previously surfaced blanket Worker failures
- `/_emdash/api/setup/status` as a diagnostic seam so setup-shell failures are easier to distinguish from broader runtime or database initialization failures

Target selection order:

1. explicit base URL argument
2. `SMOKE_TEST_BASE_URL`
3. `SITE_URL`

Example:

```bash
pnpm smoke:cloudflare-admin -- https://sikesrakobar.ahlikoding.com
```

## Builds Note

Cloudflare Git-integrated `Workers Builds` has been intentionally retired for `awcms-mini-sikesra`.

Current reviewed expectation:

1. production deploys happen through Wrangler/operator workflows using `wrangler versions upload` and `wrangler versions deploy`
2. GitHub Actions remains the repository-side validation surface
3. a future return to Git-integrated Workers Builds should happen only through a new reviewed issue with the appropriate Builds permissions and trigger configuration

## Partial Provisioning Rollback

If Cloudflare automation only partially succeeds, use the smallest rollback that restores a coherent deployment state.

Rollback order:

1. Record the currently deployed git commit and the active Worker version.
2. Record which Cloudflare-side resources changed: hostname routing, Turnstile widget settings, Worker bindings, or R2 bucket configuration.
3. If the Worker code deployment is the problem, roll back the Worker with `wrangler rollback` to the last known good version.
4. If a hostname mapping is wrong, remove or correct the custom-domain or route change before changing app code.
5. If Turnstile blocks valid traffic, restore the previous reviewed hostname set or secret configuration rather than disabling all server-side validation blindly.
6. If the `MEDIA_BUCKET` binding is missing or incorrect, restore the last known good Worker binding configuration before changing application storage logic.
7. Re-run the smoke tests in this document after the rollback step completes.

Do not mix partial Cloudflare rollback, unreviewed runtime edits, and direct database changes in the same recovery step unless the incident has been escalated and the operator has captured the full state first.

## Current Account Visibility Caveat

During the current implementation pass, the Cloudflare MCP session did not return visible zone, Worker, or custom-domain inventory for the reviewed Cloudflare account.

Current consequence:

- the repository now declares the intended custom-domain automation baseline in `wrangler.jsonc`
- operators should still record the live `ahlikoding.com` zone ID and confirm the deployed Worker is the target of the reviewed public custom domain during environment rollout
- the smoke tests in this document remain the required verification step until account inventory is readable through the available Cloudflare management path
- the same caveat applies to Hyperdrive rollout work when Wrangler or the available Cloudflare management path cannot read the live account inventory non-interactively

## Cross-References

- `docs/architecture/runtime-config.md`
- `docs/security/operations.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/postgresql-vps-hardening.md`
