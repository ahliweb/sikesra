# Hyperdrive Rollout Operator Handoff

## Purpose

This handoff condenses the remaining live operator-side rollout path for AWCMS Mini SIKESRA.

Use it when understanding the completed rollout sequence and the remaining follow-up work:

- the scoped SIKESRA issue VPS-side `cloudflared` connector activation completed
- the scoped SIKESRA issue Hyperdrive binding rollout completed
- the remaining operator follow-up is now posture hardening and rotation maintenance rather than Hyperdrive enablement itself

This document is a short execution aid, not a replacement for the detailed runbooks.

## Current Baseline

- AWCMS Mini SIKESRA remains EmDash-first and Cloudflare-hosted.
- PostgreSQL remains on a Coolify-managed VPS.
- The repo already supports `DATABASE_TRANSPORT=direct|hyperdrive`.
- Live Hyperdrive enablement is complete and is the current reviewed Worker baseline.
- The current preferred path is private-database routing through Cloudflare Tunnel rather than broad public PostgreSQL exposure.

## Step Order

1. the scoped SIKESRA issue completed so the reviewed `cloudflared` connector is active from the VPS environment that can reach PostgreSQL.
2. the scoped SIKESRA issue completed so the Cloudflare-hosted Worker runtime now uses Hyperdrive successfully.
3. Continue with operator hardening tasks only after the live Hyperdrive and tunnel path is already healthy.

Fallback decision gate:

- stay on the preferred tunnel path unless operators conclude that the VPS-side connector path is not viable in the target environment within the reviewed rollout window
- the scoped SIKESRA issue is now a historical fallback only because the private-database tunnel strategy succeeded and Hyperdrive is live
- if operators ever re-open a public-origin fallback in the future, keep PostgreSQL TLS, narrow ingress, least-privilege credentials, and explicit audit notes in place; the fallback path does not relax those controls

## the scoped SIKESRA issue Connector Activation

Run the reviewed host-service checks:

```bash
sudo systemctl status cloudflared-sikesra-postgres.service
sudo journalctl -u cloudflared-sikesra-postgres.service -n 50 --no-pager
```

Then run the reviewed runtime verification:

```bash
HEALTHCHECK_EXPECT_DATABASE_TRANSPORT=hyperdrive \
HEALTHCHECK_EXPECT_HYPERDRIVE_BINDING=HYPERDRIVE \
pnpm healthcheck
```

Sign off only when:

- the tunnel is active
- service logs do not show repeated reconnect or origin-reachability failures
- the runtime verification matches the reviewed Hyperdrive transport target

If the tunnel token may have leaked through logs, copied files, shell history, or issue comments, rotate it before retrying.

If the connector path ever becomes non-viable in a future rollout or recovery event, open a new reviewed fallback issue rather than widening public PostgreSQL exposure as an ad hoc workaround.

## PostgreSQL Posture Reconciliation

Confirm the live PostgreSQL origin posture behind the reviewed Hyperdrive path matches the intended private, TLS-protected, least-privilege configuration before treating the remediation as complete.

Run the reviewed runtime verification:

```bash
HEALTHCHECK_EXPECT_DATABASE_TRANSPORT=hyperdrive \
HEALTHCHECK_EXPECT_HYPERDRIVE_BINDING=HYPERDRIVE \
pnpm healthcheck
```

If operators intentionally fall back to direct-path remediation during investigation, use:

```bash
HEALTHCHECK_EXPECT_DATABASE_TRANSPORT=direct \
HEALTHCHECK_EXPECT_DATABASE_HOSTNAME=id1.ahlikoding.com \
HEALTHCHECK_EXPECT_DATABASE_SSLMODE=verify-full \
pnpm healthcheck
```

Sign off only when:

- public exposure is removed or explicitly justified
- SSL posture is enabled as reviewed
- old credentials no longer work if credential rotation was triggered
- the runtime verification matches the reviewed Hyperdrive transport target, and any temporary direct remediation path has been verified separately before being retired

Treat credential rotation as required when a current password or reusable connection string was exposed through the management plane, or when the database was broadly publicly reachable without high-confidence containment.

## the scoped SIKESRA issue Final Hyperdrive Verification

Use this only as historical sequencing context. The live Hyperdrive rollout is already complete.

Before enabling the live binding:

- confirm the reviewed reviewed SIKESRA Hyperdrive configuration ID exists in the target Cloudflare account
- confirm the reviewed origin path is reachable for Cloudflare and not just a web-proxied hostname
- confirm the deployment still keeps PostgreSQL TLS, narrow ingress, and non-superuser credentials

After enabling the binding, re-run:

```bash
HEALTHCHECK_EXPECT_DATABASE_TRANSPORT=hyperdrive \
HEALTHCHECK_EXPECT_HYPERDRIVE_BINDING=HYPERDRIVE \
pnpm healthcheck
```

## Security Notes

- keep all live credentials and tokens in `.env.local`, server-managed secret files, Wrangler-managed secrets, or CI/CD secret storage only
- keep healthcheck expectation variables non-secret; they are safe for rollout assertions but should not replace secret storage
- keep Cloudflare, Coolify, and PostgreSQL credentials separated by purpose and privilege
- prefer the smallest rollback that restores the reviewed posture rather than widening exposure during incident response

## Detailed References

- `docs/process/cloudflare-tunnel-private-db-connector-runbook.md`
- `docs/process/postgresql-vps-hardening.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/runtime-smoke-test.md`
- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/cloudflare-hyperdrive-decision.md`
