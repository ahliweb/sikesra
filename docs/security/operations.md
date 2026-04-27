# Security Operations

## EmDash Core Vs Mini Overlay

### EmDash Core

EmDash provides the host runtime and baseline auth boundary.

### Mini Overlay

Mini owns the security-hardening layer:

- login security events
- shared lockout counter handling
- TOTP enrollment and verification
- recovery codes
- forced password reset flows
- step-up requirements for high-risk admin actions
- security settings for staged mandatory 2FA rollout
- audit and security-event coverage for privileged recovery paths

## Current Controls

- password login with failure tracking
- temporary lockout enforcement after repeated failed login attempts
- Cloudflare Turnstile enforcement on public login, password-reset request, and invite-activation flows when configured
- lockout response for repeated failures
- mandatory password reset support
- public password-reset requests return a generic acceptance response and do not expose live reset tokens in JSON
- versioned edge API routes under `/api/v1/*` with explicit JSON, CORS, and security-header handling
- `/api/v1/token` password and refresh-token grants for external or mobile clients
- TOTP-based 2FA and recovery codes
- server-side logout revocation backed by hashed JWT session identifiers
- admin-triggered 2FA reset with step-up enforcement
- active session inspection and revocation
- staged mandatory 2FA rollout modes: `none`, `protected_roles`, `custom`

## Deployment Expectations

For the intended deployment model:

- Cloudflare is the public edge.
- Cloudflare hosts the supported application runtime (Worker `sikesra-kobar`).
- PostgreSQL (`sikesrakobar`) runs as a protected remote dependency on VPS `202.10.45.224`.
- Coolify manages the PostgreSQL host lifecycle and related operator environment.
- Hyperdrive (`sikesra-kobar-postgres-runtime`) is the reviewed database transport.

Security operations should treat those as separate trust boundaries.

## Edge And Origin Guidance

- Trust `CF-Connecting-IP` and configure `TRUSTED_PROXY_MODE=cloudflare`.
- Do not treat arbitrary `X-Forwarded-For` values as authoritative.
- Add Cloudflare rate limiting or managed challenge rules for login and other abuse-prone auth endpoints.
- Keep backend login lockout thresholds aligned with env-backed `LOGIN_LOCKOUT_WINDOW_MINUTES` and `LOGIN_LOCKOUT_MAX_FAILURES`.
- Store `TURNSTILE_SECRET_KEY` as a Cloudflare-managed secret.
- For the reviewed SIKESRA hostname, Turnstile hostname validation should allow only `sikesrakobar.ahlikoding.com`.
- Store `EDGE_API_JWT_SECRET` as a Cloudflare-managed secret.
- Keep deployed Worker secrets in Cloudflare-managed secret storage (`wrangler secret put`), not in local `.dev.vars` files or Wrangler `[vars]`.
- Keep local secret files (`.env.local`, `.dev.vars`) untracked.
- Store only hashed session identifiers for logout revocation; never persist raw JWTs, bearer tokens, or TOTP recovery codes.

## PostgreSQL Guidance

- Prefer TLS-enabled PostgreSQL connections for remote app-to-database traffic.
- Restrict database ingress to the application host or private network path.
- Prefer stronger authentication methods such as `scram-sha-256` for application access.
- Avoid using superuser credentials for the application runtime.
- Prefer `hostssl` rules for remote app access on operator-managed PostgreSQL hosts.
- Keep `pg_hba.conf` allow rules narrow and ordered intentionally.

See `docs/process/postgresql-vps-hardening.md` for the supported VPS posture.

## Sensitive Data Handling

The following data categories must be handled with extra care — never logged, never exposed in raw API responses, never committed:

- NIK, KIA, No KK
- Religion fields
- Child data, elderly/vulnerable-person data, disability data
- Contact information, health notes, documents

## Operator Surfaces

Operators currently use:

- user `Security` tab
- user `Sessions` tab
- `Security Settings`
- `Audit Logs`

## Rollout Safety

Mini now supports:

- staged mandatory 2FA rollout controls
- ABAC audit-only rollout flags for selected authorization deny paths

These are rollout tools, not permanent substitutes for full enforcement.

## Cross-References

- `docs/security/coolify-secret-verification-runbook.md`
- `docs/security/emergency-recovery-runbook.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/postgresql-vps-hardening.md`
- `docs/process/sikesra-runtime-security.md`
