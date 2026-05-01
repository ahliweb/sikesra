# Runtime Smoke Test

## Purpose

This document is the canonical baseline smoke-test path for the current scaffold.

## Validation Path

Use the CLI runtime validation path:

```bash
pnpm healthcheck
```

The command reports:

- runtime validation execution
- database connectivity
- non-secret database transport posture for rollout verification
- optional expected-posture assertions for rollout verification
- timestamped status output

Optional assertion inputs:

- `HEALTHCHECK_EXPECT_DATABASE_TRANSPORT`
- `HEALTHCHECK_EXPECT_DATABASE_HOSTNAME`
- `HEALTHCHECK_EXPECT_DATABASE_SSLMODE`

When one or more of these values is set, `pnpm healthcheck` fails if the live non-secret posture does not match the expected rollout target.

## Manual Smoke Test

1. Start a PostgreSQL database reachable by `DATABASE_URL`.
2. Use the reviewed PostgreSQL path for the current Hono deployment.
3. Set `DATABASE_CONNECT_TIMEOUT_MS` to a reviewed fail-fast value such as `10000` when validating remote or operator-managed PostgreSQL targets.
4. Use the reviewed hostname `id1.ahlikoding.com` with `sslmode=verify-full` when certificate validation is available.
5. Set `SITE_URL` to the browser-facing hostname for the environment when validating a deployed-style build.
6. If split hostnames are enabled, set `ADMIN_SITE_URL` to the dedicated admin hostname.
7. Set `TRUSTED_PROXY_MODE` for the expected request path.
8. Build the app with `pnpm build`.
9. Run `pnpm healthcheck`.
10. Confirm:

- `ok` is `true`
- `checks.app.ok` is `true`
- `checks.database.ok` is `true`
- `checks.database.posture.transport` matches the intended deployment path
- `checks.database.posture.hostname`, `port`, `database`, and `sslmode` match the reviewed environment without exposing credentials

Direct-path remediation example:

```bash
HEALTHCHECK_EXPECT_DATABASE_TRANSPORT=direct \
HEALTHCHECK_EXPECT_DATABASE_HOSTNAME=id1.ahlikoding.com \
HEALTHCHECK_EXPECT_DATABASE_SSLMODE=verify-full \
pnpm healthcheck
```

## Cloudflare Automation Smoke Test

Use these checks after Cloudflare hostname, Turnstile, or R2 automation changes.

Combined reviewed live-baseline path:

```bash
pnpm verify:live-runtime -- https://sikesrakobar.ahlikoding.com
```

This command reuses the current repo-owned verification steps in order:

- `pnpm smoke:deployed-runtime-health -- <base-url>`
- `pnpm smoke:cloudflare-admin`

The deployed runtime health step reads `/_emdash/api/setup/status` from the live deployment and checks the embedded `runtimeHealth` payload for:

- deployed database reachability
- non-secret deployed database posture

This avoids depending on workstation-level direct reachability to the private PostgreSQL origin during deployed-runtime verification.

Focused automation path:

```bash
pnpm smoke:deployed-runtime-health -- https://sikesrakobar.ahlikoding.com
pnpm smoke:cloudflare-admin
```

The script uses, in order:

1. an explicit base URL passed as the first argument
2. `SMOKE_TEST_BASE_URL` when set
3. `SITE_URL` as the default target

Example explicit target:

```bash
pnpm smoke:cloudflare-admin -- https://sikesrakobar.ahlikoding.com
```

The smoke result reports separate checks for:

- `adminEntry` for the reviewed `/_emdash/` redirect into `/_emdash/admin`
- `setupShell` for the reviewed `/_emdash/admin/setup` shell render path
- `setupStatus` as a diagnostic seam so setup-shell failures are easier to distinguish from broader runtime or database initialization failures

1. Load the public hostname and confirm it responds through the active reviewed deployment.
2. Load `https://sikesrakobar.ahlikoding.com/_emdash/` and confirm it redirects to `/_emdash/admin` on the same host.
3. If `ADMIN_SITE_URL` is still enabled for compatibility, load the admin hostname root and confirm it redirects to the configured admin entry path.
4. Exercise at least one Turnstile-protected public flow and confirm:
   - a valid solve succeeds
   - an invalid or missing token fails server-side
   - hostname validation matches the reviewed hostname set for the environment
5. Confirm the deployed runtime still has the `MEDIA_BUCKET` binding for `sikesra`.
6. Re-run `pnpm healthcheck` or the target-environment equivalent after Cloudflare-side changes complete.
7. When issue the scoped SIKESRA issue or related EmDash compatibility work is in scope, run `pnpm db:migrate` first so `034_emdash_compatibility_support_tables` can backfill any missing reviewed support tables and seed the canonical EmDash prefix on empty ledgers.
8. Then run `pnpm db:migrate:emdash:status` against the target database and confirm the reported state is `compatible` before removing any temporary setup-path fallback.
9. Run `pnpm db:migrate:emdash:verify` so the release window fails fast unless the ledger is already deploy-safe.

## Failure Modes

- if the runtime build is broken, `pnpm build` fails
- if the database is unreachable, `pnpm healthcheck` exits non-zero
- database failures return a classified `kind` plus a non-secret `reason` to make startup issues easier to identify
- if the runtime is pointed at the wrong reviewed transport target, `pnpm healthcheck` exits non-zero when expectation variables are set
- if hostname automation is only partially applied, the public or admin hostname smoke tests fail
- if Turnstile hostname configuration is wrong, valid solves fail server-side with hostname mismatch behavior
- if the reviewed R2 configuration is missing, runtime storage paths fail with `R2_BUCKET_NOT_CONFIGURED`

Common database `reason` values and next checks:

- `connection_timeout`: confirm the target PostgreSQL path is reachable from the operator or runtime environment and that firewall or private-network routing is allowing the connection
- `credential_format`: confirm the effective `DATABASE_URL` parses into a valid PostgreSQL username/password pair and that local env loading did not leave the password unset or malformed
- `dns`: confirm the reviewed hostname resolves from the current environment and that the configured origin hostname is correct
- `refused`: confirm PostgreSQL is listening on the intended interface/port and that Coolify, host firewall, or private-network routing is not rejecting the connection
- `tls`: confirm the reviewed certificate, hostname, and `sslmode` posture match the configured connection string

## Validation

- `node --test tests/unit/cloudflare-admin-smoke.test.mjs`
- `pnpm typecheck`
- `pnpm build`
- `pnpm healthcheck`
