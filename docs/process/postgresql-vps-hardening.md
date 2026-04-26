# PostgreSQL VPS Hardening

## Purpose

This runbook defines the supported security posture for AWCMS Mini SIKESRA when PostgreSQL runs on a VPS and the app connects to it remotely.

## Supported Baseline

The supported baseline is:

1. AWCMS Mini SIKESRA runs in the supported Cloudflare-hosted runtime.
2. PostgreSQL runs on a separate protected VPS or equivalent protected host managed through Coolify.
3. The app connects to PostgreSQL over a restricted network path.
4. Remote database traffic is protected with TLS.

Current reviewed operator inventory for this repository:

- PostgreSQL VPS IP: `202.10.45.224`
- reviewed SSL hostname for app connections: `id1.ahlikoding.com`

Current Coolify API-confirmed inventory as of 2026-04-25:

- Coolify version observed through the API: `4.0.0-beta.473`
- database resource UUID: `wc1gg89oorsbvlf4cxbfucma`
- database resource type: `standalone-postgresql`
- database image: `postgres:18-alpine`
- database status: `running:healthy`
- public database exposure reported by Coolify: `is_public=false`
- external database URL reported by Coolify: `null`
- SSL fields reported by Coolify: `enable_ssl=false`, `ssl_mode=require`
- database user reported by Coolify: `postgres`
- server SSH user reported by Coolify: `root`

Sensitive fields returned by the Coolify API, including passwords and connection URLs, must be redacted before being copied into docs, issue comments, logs, or operator notes.

Coolify SSL remediation note:

- Coolify's documented `PATCH /api/v1/databases/{uuid}` endpoint does not currently accept `enable_ssl` or `ssl_mode` in the request body. A minimal API attempt with only those fields returned `422` validation errors.
- Treat the Coolify API as read-only verification for this SSL seam unless Coolify documents an SSL-specific update endpoint.
- Enable or reconcile database SSL through the Coolify dashboard or another reviewed Coolify-supported management path, then rerun `pnpm audit:coolify-postgres`.

## Transport Expectations

- Treat PostgreSQL as a remote protected dependency, not as a localhost-only service.
- Enable PostgreSQL SSL on the server for remote app-to-database traffic.
- Prefer client connections that require TLS.
- Prefer certificate validation for higher-assurance environments.
- If certificate validation is operationally available, prefer `sslmode=verify-full`.
- If full certificate validation is not yet available, use a minimum posture that still requires TLS for remote connections.
- For the reviewed production baseline, prefer app connections through `id1.ahlikoding.com` so `sslmode=verify-full` can validate the expected hostname.

## `DATABASE_URL` Guidance

- Production `DATABASE_URL` should target the remote PostgreSQL host, not a local development default.
- Prefer an application-specific database user, not `postgres` and not a superuser role.
- Prefer a dedicated application database or narrowly scoped ownership pattern over broad cluster-wide privileges.
- Include remote-transport expectations in the connection configuration used by the deployment environment.
- If a Coolify-managed service or helper on the VPS needs database credentials, store them in Coolify Environment Variables as locked runtime secrets rather than copied plaintext notes or reused build arguments.

Example baseline shape:

```text
postgres://sikesrakobar_runtime:<password>@id1.ahlikoding.com:5432/sikesrakobar?sslmode=require
```

Higher-assurance example when certificate validation is available:

```text
postgres://sikesrakobar_runtime:<password>@id1.ahlikoding.com:5432/sikesrakobar?sslmode=verify-full
```

## `postgresql.conf` Expectations

- Enable `ssl = on` for remote deployments.
- Install and manage the PostgreSQL server certificate and private key appropriately for the host.
- Keep listen addresses scoped as tightly as the deployment allows.
- Avoid exposing the database service on unnecessary public interfaces.

## `pg_hba.conf` Expectations

- Prefer `hostssl` entries for remote app access instead of broad plain `host` entries.
- Restrict the source address to the specific app host or the narrowest private network range available.
- Use `scram-sha-256` for password-based application access.
- Keep rule ordering intentional so narrow allow rules are evaluated before broader patterns.
- Avoid `0.0.0.0/0` allow rules for the application user.

Example shape:

```conf
# TYPE    DATABASE      USER             ADDRESS             METHOD
hostssl   sikesrakobar    sikesrakobar_runtime   10.0.12.34/32       scram-sha-256
```

If the app reaches PostgreSQL through a private subnet instead of a single host, keep the allowed range as small as practical.

## Role And Privilege Expectations

- The application role should not be a PostgreSQL superuser.
- The application role should not own unrelated databases.
- Grant only the database and schema privileges needed for Mini runtime and migration behavior.
- Keep administrative PostgreSQL maintenance credentials separate from the application runtime credentials.
- Use the redacted runtime role audit before and after credential rotation:

  ```bash
  pnpm audit:database-role
  ```

  This command uses the configured `DATABASE_URL` or local Hyperdrive compatibility connection string, reports only role names and privilege booleans, and exits non-zero if the active runtime role is `postgres`, a superuser, or otherwise over-privileged.

## Network Access Expectations

- Restrict PostgreSQL ingress to the app host or private network path.
- Do not treat the database as a public internet-facing service.
- Prefer VPS firewall rules or provider network controls in addition to PostgreSQL configuration.
- Review both the app host egress path and the database host ingress policy during deployment changes.
- If Hyperdrive will be used, confirm the database origin also accepts the reviewed Cloudflare-to-origin connection path; Hyperdrive configuration creation fails if the origin refuses Cloudflare connectivity.
- If Hyperdrive will be used, confirm the chosen hostname resolves to the intended PostgreSQL origin path for Cloudflare rather than a web-proxied Cloudflare edge hostname.

Supported origin patterns for Hyperdrive:

1. a reviewed reachable public PostgreSQL origin hostname or IP path with the required TLS and ingress posture
2. a private-database path fronted by Cloudflare Tunnel when the PostgreSQL origin should not be exposed as a directly reachable public service

Preferred default for the current environment:

- prefer the private-database Cloudflare Tunnel path so PostgreSQL does not need a separately reachable public origin endpoint just for Hyperdrive
- treat the reachable public-origin path as historical fallback guidance unless a future reviewed issue intentionally re-opens it

If the private-database Tunnel path is selected, prepare at least:

1. a `cloudflared` connector or equivalent reviewed tunnel connector path with reachability to the PostgreSQL origin host and port
2. a reviewed TCP hostname or tunnel route that Hyperdrive can target for the private database path; `pg-hyperdrive.ahlikoding.com` is the current reviewed default name
3. any required Cloudflare Access client ID and client secret material if the tunnel-backed origin is protected through Access
4. an operator note showing how tunnel routing, PostgreSQL authentication, and the Coolify-managed host map together
5. operator access to the Cloudflare dashboard or API to configure ingress rules for the remotely managed tunnel after resource creation

## Coolify Operator Sequence

Use this order when rolling the reviewed SSL posture into the Coolify-managed PostgreSQL deployment.

1. Confirm `id1.ahlikoding.com` resolves to the reviewed VPS IP `202.10.45.224`.
2. Confirm the PostgreSQL server certificate presented by the host covers `id1.ahlikoding.com`.
3. Run the read-only Coolify API posture audit and keep its redacted output with the issue notes:

   ```bash
   pnpm audit:coolify-postgres
   ```

4. Reconcile the Coolify API SSL fields before marking the transport posture complete; `enable_ssl=false` with `ssl_mode=require` is a live configuration gap until the operator verifies and corrects the effective PostgreSQL SSL state.
5. Use the Coolify dashboard or another reviewed Coolify-supported management path for SSL enablement; the documented database PATCH endpoint does not accept SSL fields.
6. In the Coolify-managed PostgreSQL service, verify the server is configured for SSL and that `postgresql.conf` keeps `ssl = on`.
7. Review `pg_hba.conf` so remote Mini access uses `hostssl` with the narrowest practical source range and `scram-sha-256`.
8. Confirm the deployed AWCMS Mini SIKESRA runtime uses an application-scoped non-superuser role; if the app still uses the API-reported `postgres` role, create and rotate to a dedicated runtime credential before signoff.
9. If Hyperdrive rollout is planned, choose one reviewed origin pattern before changing app deployment config. Prefer the private-database route via Cloudflare Tunnel; use a reachable public PostgreSQL origin endpoint only as the fallback path.
10. If the private-database Tunnel path is selected, confirm the tunnel connector can reach the PostgreSQL origin host and port and that any Access/service-token prerequisites are ready.
11. If Hyperdrive rollout is planned, confirm the database/firewall policy allows the reviewed Cloudflare-to-origin connection path needed for Hyperdrive configuration creation and runtime use.
12. Keep the application role non-superuser and separate from maintenance credentials.
13. Update the Cloudflare-hosted app runtime secret so `DATABASE_URL` uses `id1.ahlikoding.com` with `sslmode=verify-full` when certificate validation is ready.
14. If certificate validation is not ready yet, use a reviewed interim `sslmode=require` value temporarily and record the follow-on hardening step explicitly.
15. Run `pnpm healthcheck` and the reviewed smoke tests after the deployment update.
16. If Coolify-managed services on the VPS need matching database credentials, store them as Coolify locked runtime secrets and avoid exposing them as ordinary build variables unless a reviewed build-time workflow explicitly requires that.

Reviewed direct-posture assertion example:

```bash
HEALTHCHECK_EXPECT_DATABASE_TRANSPORT=direct \
HEALTHCHECK_EXPECT_DATABASE_HOSTNAME=id1.ahlikoding.com \
HEALTHCHECK_EXPECT_DATABASE_SSLMODE=verify-full \
pnpm healthcheck
```

17. Record the effective certificate/hostname posture and any temporary exceptions in the deployment notes.

## Current Live Remediation Focus

Use this when reconciling currently observed Coolify/PostgreSQL drift during issue-scoped operator remediation.

1. Record the currently exposed PostgreSQL endpoint shape, external port exposure, and any public connection URL shown in the management plane before making changes.
2. Record whether Coolify currently reports SSL enabled or disabled for the PostgreSQL resource.
3. Record whether the runtime credential is a dedicated application user or the API-reported maintenance/bootstrap user.
4. Bring the live database posture back to the reviewed target shape first:
   - remove or narrow public exposure unless there is an explicit reviewed exception
   - ensure PostgreSQL SSL remains enabled for remote transport
   - ensure `pg_hba.conf` keeps remote Mini access on `hostssl` with the narrowest practical source range and `scram-sha-256`
5. After the live posture is back under control, rotate any application credential that may have been exposed through management-plane inspection, copied connection strings, or public resource metadata.
6. Update the deployed `DATABASE_URL` secret only after the new credential and reviewed hostname/TLS posture are ready.
7. Verify the old credential no longer works and record the rotation owner and timestamp in operator notes.

Treat credential rotation as required when either of these conditions is true:

- a management-plane response exposed a current database password or a reusable connection string
- the live PostgreSQL resource was broadly publicly reachable and there is no high-confidence evidence the credential remained private

## Minimum Operator Checks

Before deployment:

- Run `pnpm audit:coolify-postgres` and confirm only redacted posture fields are printed.
- Run `pnpm audit:database-role` against the intended runtime `DATABASE_URL` and confirm the app is not using `postgres` or a superuser role.
- Confirm `DATABASE_URL` points to the intended remote PostgreSQL host.
- Confirm the reviewed app-side hostname is `id1.ahlikoding.com` when hostname validation is expected.
- Confirm TLS expectations for the target environment are documented and enabled.
- Confirm the runtime user is not a superuser.
- Confirm Coolify API or dashboard state does not report `enable_ssl=false` for a production database path that is documented as TLS-enabled.
- Confirm `pg_hba.conf` allows only the intended app host or narrow private range.
- If Hyperdrive is planned, confirm the reviewed Cloudflare-to-origin connection path is allowed before attempting `wrangler hyperdrive create`.
- If Hyperdrive is planned, confirm the reviewed Hyperdrive origin hostname resolves to a direct/reachable PostgreSQL origin path instead of Cloudflare edge IPs.
- Confirm host firewall rules restrict database ingress accordingly.
- Confirm the VPS IP `202.10.45.224` is treated as operator inventory and troubleshooting data, not the preferred application hostname when `verify-full` is required.
- If management-plane inspection revealed live database credentials or externally routable connection strings, treat credential rotation as part of the remediation plan rather than only tightening network controls.
- If the current live Coolify resource is publicly exposed, decide explicitly whether that exposure is being removed now or temporarily retained under an auditable exception.

After deployment:

- Confirm the app can connect and complete `pnpm healthcheck`.
- Re-run `pnpm audit:database-role` after any credential rotation and keep only the redacted result in operator notes.
- Prefer the reviewed direct-posture assertion variables during remediation signoff so the check fails fast if the deployment still points at the wrong hostname, SSL mode, or transport target.
- Confirm migrations run successfully against the intended database.
- Confirm no unexpected direct access path to PostgreSQL was introduced.
- Confirm the deployed runtime is not using maintenance credentials.
- Confirm the API-reported `postgres` user is not the deployed AWCMS Mini SIKESRA runtime role, or record the issue-scoped rotation plan if it is.
- Confirm the effective `DATABASE_URL` in the deployment matches the reviewed hostname and SSL mode for the environment.
- Confirm the previous database credential no longer authenticates if credential rotation was part of the remediation.
- Confirm no stale public connection URL remains in Coolify metadata, copied operator notes, or deployment secrets.

## Recovery Notes

- If connectivity fails after a database-host change, verify DNS or host routing before widening `pg_hba.conf` or firewall rules.
- If TLS negotiation fails, fix the certificate or client configuration rather than disabling TLS requirements broadly.
- If `verify-full` fails, verify that `id1.ahlikoding.com` resolves to the intended VPS and that the PostgreSQL certificate covers that hostname before falling back to a weaker mode.
- If Hyperdrive configuration creation fails with a connection-refused error, fix origin reachability for the reviewed Cloudflare path before retrying the Hyperdrive rollout.
- If the reviewed Hyperdrive origin hostname resolves to Cloudflare edge IPs instead of the intended PostgreSQL origin path, switch to a reviewed reachable origin hostname or direct origin path before retrying Hyperdrive creation.
- If a management-plane API response exposed current database passwords or public connection URLs during incident review, rotate the affected credentials after the live posture is brought back under control.
- If the app user lacks permissions, grant the smallest missing privilege instead of switching to a superuser credential.

## Rollback Order

If the reviewed SSL rollout causes production connectivity loss, use the smallest rollback that restores the previous known-good posture.

1. Capture the failing `DATABASE_URL` posture, current certificate state, and the latest Coolify/PostgreSQL config change.
2. Verify DNS and certificate coverage for `id1.ahlikoding.com` before changing PostgreSQL access rules.
3. If the certificate or hostname validation is the only failing seam, temporarily roll back to the last reviewed TLS-required mode such as `sslmode=require` instead of disabling TLS entirely.
4. If server-side SSL configuration changed unexpectedly, restore the last known good PostgreSQL SSL configuration in Coolify before widening client access.
5. Re-run `pnpm healthcheck` and the deployment smoke tests after the rollback step completes. Use the reviewed direct-posture assertion variables if the target rollback state is known.
6. Record the incident and keep the follow-on hardening task explicit.

## Cross-References

- `docs/architecture/runtime-config.md`
- `docs/security/operations.md`
- `docs/process/migration-deployment-checklist.md`
