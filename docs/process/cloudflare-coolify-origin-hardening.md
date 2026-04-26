# Cloudflare And Coolify Origin Hardening

## Purpose

This runbook defines the supported public ingress pattern for AWCMS Mini SIKESRA when deployed as a Cloudflare-hosted Worker with PostgreSQL on a Coolify-managed VPS.

The current supported runtime baseline for this repository is the Cloudflare-hosted Worker described in `docs/process/cloudflare-hosted-runtime.md`. The historical Coolify-hosted application path — where the Mini app ran inside a Coolify-managed container — is preserved as a reference and origin-hardening complement but is no longer the primary runtime model.

## Current Supported Production Pattern

The supported baseline production path is:

1. Browser to Cloudflare
2. Cloudflare terminates public traffic and applies edge security controls
3. Cloudflare-hosted Worker runtime serves the Mini application
4. The Worker connects to PostgreSQL on the Coolify-managed VPS through Cloudflare Hyperdrive over the reviewed private-database Cloudflare Tunnel path

The Mini application itself does not run inside a Coolify-managed container in this baseline. Coolify manages only the PostgreSQL host and its surrounding VPS environment.

## Historical Coolify-Hosted Application Path

A previous deployment pattern ran the Mini app as a Coolify-managed container behind a Coolify reverse proxy, with Cloudflare providing edge proxying to the Coolify origin. That path is no longer the reviewed runtime baseline. If an operator ever needs to restore or evaluate it, all trust-boundary and origin-exposure rules below remain applicable and a new reviewed issue should be opened rather than reverting runtime assumptions ad hoc.

## Trust Boundary Rules

- Cloudflare is the browser-facing edge for all public and admin traffic.
- The Mini Worker runs on Cloudflare infrastructure, not on the VPS.
- PostgreSQL on the Coolify-managed VPS is a private database dependency, not a co-located runtime peer.
- The Worker must use `TRUSTED_PROXY_MODE=cloudflare` to trust `CF-Connecting-IP` for client IP extraction.
- The Worker must not trust raw `X-Forwarded-For` values from arbitrary upstream sources.
- The public origin must be the Cloudflare-served hostname, not a VPS IP, container address, or direct Coolify URL.

## Required Runtime Expectations

- Set the public origin to the same hostname users reach through Cloudflare.
- Set `TRUSTED_PROXY_MODE=cloudflare`.
- Keep security-sensitive secrets configured through the deployment environment, not hardcoded in source.
- Treat the application origin and the PostgreSQL host as separate protected dependencies.

## Origin Exposure Rules

- Keep Cloudflare proxying enabled for the public application hostname.
- Do not publish the Coolify origin IP as a second public application entrypoint.
- Restrict direct origin access so unsolicited public traffic does not bypass Cloudflare.
- If the origin must remain publicly reachable, limit ingress as tightly as the hosting environment allows and keep the public hostname proxied through Cloudflare.
- Do not rely on user-controlled forwarded headers as proof that traffic passed through Cloudflare.
- Keep the Cloudflare Tunnel connector and Hyperdrive configuration private; do not expose PostgreSQL directly to the public internet.
- If the reviewed private-database Hyperdrive path becomes non-viable, open a new reviewed issue rather than widening PostgreSQL exposure as a workaround.

## Coolify VPS Expectations

- Coolify manages the PostgreSQL VPS environment and its surrounding networking.
- The VPS must not expose PostgreSQL directly to the internet when the Cloudflare Tunnel path is the reviewed configuration.
- The `cloudflared` connector must remain active on the VPS for the Hyperdrive private-database path to function.
- The reviewed VPS recovery path now uses the Coolify-managed SSH key for root access; do not store or use a root password from `.env.local` or scripts.
- Environment variables for the PostgreSQL host are kept in operator-controlled secret storage, not in tracked repository files.

## Cloudflare Expectations

- Use proxied DNS for the public application hostname.
- Add edge rate-limiting or managed challenge rules for login, password reset, and other abuse-prone auth endpoints.
- Keep TLS enabled from browser to Cloudflare and from Cloudflare to origin for all traffic paths.
- Review Cloudflare security events when repeated login failures, challenge spikes, or bot traffic are observed.
- Keep Cloudflare Access service token credentials for Worker-to-origin paths in Cloudflare-managed Worker secrets or CI/CD-managed storage.

## Minimum Operator Checks

Before deployment:

- Confirm the public hostname is orange-cloud proxied in Cloudflare.
- Confirm `TRUSTED_PROXY_MODE=cloudflare` is set in the Worker deployment environment.
- Confirm the Hyperdrive binding is configured in `wrangler.jsonc` and points to the intended PostgreSQL origin.
- Confirm the `cloudflared` connector is active on the VPS and service logs do not show repeated reconnect failures.
- Confirm root SSH recovery works with the reviewed Coolify-managed key path and that password-based root SSH login remains disabled.

After deployment:

- Load the public hostname and confirm the app responds through the Cloudflare-hosted Worker.
- Confirm admin routes load through the same public hostname.
- Confirm auth logging and lockout behavior record the expected client IP source using `CF-Connecting-IP`.
- Run `pnpm verify:live-runtime -- https://sikesrakobar.ahlikoding.com` to confirm the combined database posture, EmDash compatibility, and admin/setup smoke seam.

## Cross-References

- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/cloudflare-tunnel-private-db-connector-runbook.md`
- `docs/process/hyperdrive-rollout-operator-handoff.md`
- `docs/architecture/runtime-config.md`
- `docs/security/operations.md`
- `docs/process/migration-deployment-checklist.md`
