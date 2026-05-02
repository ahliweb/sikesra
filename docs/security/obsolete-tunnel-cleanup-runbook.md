# Obsolete Cloudflare Tunnel Cleanup Runbook

## Purpose

This runbook defines the operator-only closure path for `ahliweb/sikesra#82`.

Use it to remove the retired PostgreSQL Cloudflare Tunnel path after the architecture baseline has moved to direct reviewed Hono-to-PostgreSQL connectivity.

## Scope

This runbook covers:

- stopping the obsolete `cloudflared` process/service or container
- deleting the retired Cloudflare tunnel resource
- confirming no active runtime still depends on Tunnel for PostgreSQL

This runbook does not perform remote process control by itself. It documents the reviewed operator sequence.

## Canonical Baseline

- Active architecture: Cloudflare browser-facing edge + Hono backend on Coolify + PostgreSQL on the same VPS.
- Database path: no Cloudflare Tunnel in the active runtime path.
- References:
  - `docs/process/cloudflare-hosted-runtime.md`
  - `docs/process/postgresql-vps-hardening.md`

## Target Tunnel

- Tunnel name: `awcms-mini-postgres`
- Tunnel ID: `f2646d88-0ca1-4ea2-9397-04a1e6ae436e`

## Operator Sequence

### 1. Confirm no repository/runtime dependency remains

- Verify current docs and runtime config still define the no-Tunnel posture.
- Confirm active env/runtime configuration does not route PostgreSQL via Cloudflare Tunnel.

### 2. Stop all cloudflared replicas for the obsolete tunnel

On the host/control plane that still runs the tunnel:

- stop the `cloudflared` service, container, or process bound to the obsolete tunnel token
- disable automatic restart for that obsolete path

Examples (use only what matches the real runtime):

```bash
systemctl stop cloudflared
systemctl disable cloudflared
docker ps --format '{{.ID}} {{.Image}} {{.Names}}' | grep cloudflared
docker stop <cloudflared-container-id>
```

Do not paste tunnel tokens, credentials, or private config values into issue comments.

### 3. Delete the obsolete tunnel from Cloudflare

After all active connections are stopped:

```bash
cloudflared tunnel delete f2646d88-0ca1-4ea2-9397-04a1e6ae436e
```

If using API-based deletion, keep output redacted and do not print account tokens.

### 4. Verify cleanup

- Tunnel ID no longer appears in Cloudflare tunnel inventory.
- No host process/container remains for the obsolete tunnel path.
- Runtime smoke tests still pass without Tunnel assumptions:

```bash
pnpm check:secret-hygiene
pnpm healthcheck
```

See `docs/process/runtime-smoke-test.md` for the canonical live EmDash verification commands.

### 5. Record redacted operator evidence

Record only:

- cleanup timestamp
- operator owner
- tunnel ID deleted
- verification commands executed

Do not store tokens, private URLs, or copied tunnel credentials.

## Closure Criteria For #82

`#82` is ready to close only when all are true:

- obsolete `cloudflared` process/container is stopped and disabled
- tunnel `f2646d88-0ca1-4ea2-9397-04a1e6ae436e` is deleted successfully
- no active runtime path depends on Cloudflare Tunnel for PostgreSQL
- post-cleanup smoke checks pass and evidence is logged in redacted form

## Current Session Caveat

In this AI session, Cloudflare account credentials were not present in environment variables and remote host process control was not available.

Because of that, this runbook is the smallest repository-side atomic step to advance `#82` without claiming unperformed operator actions.
