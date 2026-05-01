# Cloudflare And Coolify Origin Hardening

## Purpose

This runbook defines the supported public ingress pattern for AWCMS Mini SIKESRA when Cloudflare is the public edge while the Hono backend API and PostgreSQL run on a Coolify-managed VPS.

The current supported runtime baseline for this repository is the Cloudflare-and-Hono path described in `docs/process/cloudflare-hosted-runtime.md`.

## Current Supported Production Pattern

The supported baseline production path is:

1. Browser to Cloudflare
2. Cloudflare terminates public traffic and applies edge security controls
3. Cloudflare serves the frontend and forwards reviewed API traffic to the Hono backend
4. The Hono backend connects to PostgreSQL on the Coolify-managed VPS through the reviewed direct PostgreSQL path

The application backend now runs in the reviewed Coolify-managed environment together with its protected database dependency.

## Trust Boundary Rules

- Cloudflare is the browser-facing edge for all public and admin traffic.
- The Hono API runs on the Coolify-managed VPS, not on Cloudflare Worker infrastructure.
- PostgreSQL on the Coolify-managed VPS is a private database dependency reachable only through the reviewed runtime path.
- The API must use `TRUSTED_PROXY_MODE=cloudflare` when it sits behind Cloudflare and trusts `CF-Connecting-IP` for client IP extraction.
- The API must not trust raw `X-Forwarded-For` values from arbitrary upstream sources.
- The public origin must be the Cloudflare-served hostname, not a VPS IP, container address, or direct Coolify URL.

## Required Runtime Expectations

- Set the public origin to the same hostname users reach through Cloudflare.
- Set `TRUSTED_PROXY_MODE=cloudflare`.
- Keep security-sensitive secrets configured through the deployment environment, not hardcoded in source.
- Treat the frontend origin, API origin, and PostgreSQL host as separate protected dependencies.

## Origin Exposure Rules

- Keep Cloudflare proxying enabled for the public application hostname.
- Do not publish the Coolify origin IP as a second public application entrypoint.
- Restrict direct origin access so unsolicited public traffic does not bypass Cloudflare.
- If the origin must remain publicly reachable, limit ingress as tightly as the hosting environment allows and keep the public hostname proxied through Cloudflare.
- Do not rely on user-controlled forwarded headers as proof that traffic passed through Cloudflare.
- Do not expose PostgreSQL directly to the public internet.
- If the reviewed private PostgreSQL path becomes non-viable, open a new reviewed issue rather than widening exposure as a workaround.

## Coolify VPS Expectations

- Coolify manages the Hono API service, PostgreSQL VPS environment, and surrounding networking.
- The VPS must not expose PostgreSQL directly to the internet.
- The reviewed VPS recovery path now uses the Coolify-managed SSH key for root access; do not store or use a root password from `.env.local` or scripts.
- Environment variables for the Hono API and PostgreSQL host are kept in operator-controlled secret storage, not in tracked repository files.

## Cloudflare Expectations

- Use proxied DNS for the public application hostname.
- Add edge rate-limiting or managed challenge rules for login, password reset, and other abuse-prone auth endpoints.
- Keep TLS enabled from browser to Cloudflare and from Cloudflare to origin for all traffic paths.
- Review Cloudflare security events when repeated login failures, challenge spikes, or bot traffic are observed.
- Keep Cloudflare-managed secrets and operator credentials out of tracked files.

## Minimum Operator Checks

Before deployment:

- Confirm the public hostname is orange-cloud proxied in Cloudflare.
- Confirm `TRUSTED_PROXY_MODE=cloudflare` is set in the Hono deployment environment when Cloudflare proxies the API path.
- Confirm the deployed Hono and PostgreSQL settings still align with the reviewed direct PostgreSQL origin posture.
- Confirm root SSH recovery works with the reviewed Coolify-managed key path and that password-based root SSH login remains disabled.

After deployment:

- Load the public hostname and confirm the app responds through the reviewed Cloudflare-served frontend path.
- Confirm admin routes load through the same public hostname.
- Confirm auth logging and lockout behavior record the expected client IP source using `CF-Connecting-IP`.
- Use `docs/process/runtime-smoke-test.md` for the canonical combined database posture, EmDash compatibility, and admin/setup smoke seam verification.

## Cross-References

- `docs/process/cloudflare-hosted-runtime.md`
- `docs/architecture/runtime-config.md`
- `docs/security/operations.md`
- `docs/process/migration-deployment-checklist.md`
