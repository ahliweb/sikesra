# Migration And Deployment Validation Checklist

This checklist standardizes pre-deploy and post-deploy validation for AWCMS Mini SIKESRA.

Use it for any deployment that changes schema, authentication, authorization, governance data, admin behavior, or plugin contract behavior.

## Pre-Deploy

Complete these checks before applying migrations or releasing a new build.

### Code Validation

- [ ] `pnpm check` passes for the current branch when the scoped change fits the baseline validation path
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:unit` passes
- [ ] `pnpm lint` passes for the maintained docs/config surface when documentation or workflow files changed
- [ ] Any issue-specific validation commands for the current release are complete

### Runtime Validation

- [ ] `pnpm build` passes
- [ ] `pnpm healthcheck` passes against the target environment or an equivalent pre-production environment
- [ ] If the reviewed target posture is known for the release, `pnpm healthcheck` is run with the non-secret expectation variables needed to fail fast on the wrong transport target
- [ ] `docs/process/runtime-smoke-test.md` is the canonical deployed-runtime verification path for database posture and the admin/setup smoke seam when live deployment verification is in scope
- [ ] `DATABASE_URL` points to the intended PostgreSQL instance
- [ ] `DATABASE_CONNECT_TIMEOUT_MS` is set to a reviewed fail-fast value for the target environment
- [ ] `APP_URL`, `API_BASE_URL`, and `PUBLIC_API_BASE_URL` match the reviewed frontend and API origins
- [ ] Required security secrets are present for the target environment
- [ ] When secret rotation or runtime secret verification is part of the release, follow `docs/security/coolify-secret-verification-runbook.md` and record only redacted operator notes

### Schema Readiness

- [ ] If operator migrations should use the reviewed private PostgreSQL route, `DATABASE_MIGRATION_URL` is set in ignored local env or another reviewed secret store
- [ ] Review pending migrations with `pnpm db:migrate:status`
- [ ] When issue the scoped SIKESRA issue or another EmDash migration-compatibility change is in scope, confirm the branch includes `034_emdash_compatibility_support_tables` or a reviewed equivalent before the deploy window
- [ ] When issue the scoped SIKESRA issue or another EmDash migration-compatibility change is in scope, run `pnpm db:migrate:emdash:status` and record whether the ledger is `compatible`, `repairable`, `unsafe`, or `empty`
- [ ] A fresh setup response with `needsSetup: true` is treated as first-run bootstrap state, not as a ledger repair failure
- [ ] Confirm the release does not rely on ad hoc schema edits outside Kysely migrations
- [ ] Confirm rollback impact for the newest migration is understood before deployment

### Rollout Safety

- [ ] Record the currently deployed git commit
- [ ] Record whether ABAC audit-only flags are enabled
- [ ] Record the current mandatory 2FA rollout mode: `none`, `protected_roles`, or `custom`
- [ ] Record the effective mandatory 2FA role ids before the release

### Incident Preparedness

- [ ] Keep `docs/security/emergency-recovery-runbook.md` available during the deploy window
- [ ] Confirm at least one operator performing the deploy can complete admin step-up authentication if rollback or recovery actions are required

### Edge And Origin Readiness

- [ ] Cloudflare DNS for the public hostname is configured for the Cloudflare-hosted application path
- [ ] The reviewed frontend and API ingress configuration point at the intended deployment surfaces
- [ ] Non-interactive Cloudflare rollout automation has `CLOUDFLARE_API_TOKEN` available if Cloudflare-managed DNS, Turnstile, or R2 changes are part of the release
- [ ] The reviewed runtime R2 configuration points at the intended bucket `sikesra`
- [ ] `TRUSTED_PROXY_MODE=cloudflare` is configured when the API is behind Cloudflare proxying

### PostgreSQL Readiness

- [ ] Run `pnpm db:migrate:probe` and record the redacted reachability result before the migration window
- [ ] If the probe times out, verify `DATABASE_MIGRATION_URL` points at the reviewed private PostgreSQL route instead of the general app `DATABASE_URL`
- [ ] PostgreSQL access is restricted to the intended application host or private network path
- [ ] PostgreSQL transport security expectations are confirmed for the target environment
- [ ] `id1.ahlikoding.com` resolves to the reviewed PostgreSQL VPS and the certificate covers that hostname when `sslmode=verify-full` is expected
- [ ] The remote PostgreSQL access rule uses the narrowest practical source range for the app host or private subnet
- [ ] `pg_hba.conf` and server config require the intended remote authentication and TLS posture
- [ ] The application user does not rely on superuser credentials
- [ ] If live management-plane inspection exposed a current database password, reusable connection string, or broad public database endpoint, the release notes include a credential-rotation decision and owner

## Migration Window

Perform these steps during the release window.

1. Run `pnpm db:migrate`
2. Run `pnpm db:migrate:status`
3. When issue the scoped SIKESRA issue or another EmDash migration-compatibility change is in scope, run `pnpm db:migrate:emdash:status`
4. If the EmDash ledger state is `empty` after `pnpm db:migrate`, stop the release and investigate the compatibility bootstrap path instead of forcing manual ledger edits; do not confuse that with a fresh setup response that still reports `needsSetup: true`
5. If the EmDash ledger state is `repairable`, run `pnpm db:migrate:emdash:repair`
6. Re-run `pnpm db:migrate:emdash:status` and confirm the ledger state is `compatible`
7. Run `pnpm db:migrate:emdash:verify` so the release fails fast unless the ledger is deploy-safe
8. Confirm no unexpected pending migrations remain
9. Deploy the application build
10. Run `pnpm healthcheck`
11. Prefer the canonical flow in `docs/process/runtime-smoke-test.md` as the combined post-deploy deployed-runtime verification path when live deployment verification is in scope

Use expectation variables when the release has a reviewed target posture.

Direct-path remediation example:

```bash
HEALTHCHECK_EXPECT_DATABASE_TRANSPORT=direct \
HEALTHCHECK_EXPECT_DATABASE_HOSTNAME=id1.ahlikoding.com \
HEALTHCHECK_EXPECT_DATABASE_SSLMODE=verify-full \
pnpm healthcheck
```

If a migration fails:

- Stop the release
- Capture the failing migration name and error output
- Run `pnpm db:migrate:probe` to separate PostgreSQL reachability/auth/TLS blockers from repository migration logic
- Re-run `pnpm db:migrate` only after the root cause is fixed; the reviewed migration path is atomic, so a failed attempt should not leave a partially applied repository-owned batch behind
- If the probe still reports timeout, verify the reviewed private-route hostname, `DATABASE_MIGRATION_URL` selection, and connector status before retrying
- Use the recovery runbook before attempting manual intervention
- Only run `pnpm db:migrate:down` if the migration and operational impact have been reviewed for safe rollback

If `pnpm db:migrate:emdash:status` reports `unsafe`:

- Stop the release
- Capture the reported unexpected or out-of-scope migration names
- Do not run `pnpm db:migrate:emdash:repair`
- Treat the ledger state as issue-scoped investigation work, not routine deploy cleanup

## Post-Deploy Validation

Validate the live system in this order.

### Schema

- [ ] `pnpm db:migrate:status` shows the expected applied migration state
- [ ] No unexpected migration drift is present between environments
- [ ] When the release touched EmDash runtime compatibility, `pnpm db:migrate:emdash:status` reports `compatible`
- [ ] When the release touched EmDash runtime compatibility, `_emdash_migrations` is not left `empty` after the reviewed compatibility bootstrap migration path
- [ ] A live `/_emdash/api/setup/status` response that returns `needsSetup: true` is documented as expected only during first-run bootstrap
- [ ] The Hono setup route can reach PostgreSQL directly through the reviewed backend database connection during first-run bootstrap

### Auth

- [ ] Standard password login still succeeds for a known valid account
- [ ] Invalid password attempts still fail correctly
- [ ] Lockout behavior still returns the expected blocked response after repeated failures where applicable
- [ ] Password reset request and consume flows still behave correctly for test users
- [ ] Client IP logging and lockout behavior reflect the intended proxied request path
- [ ] When Turnstile is enabled, valid solves succeed and invalid or missing tokens fail for the protected public flows
- [ ] When split hostnames are enabled, Turnstile hostname validation accepts only the reviewed public/admin hostname set

### RBAC

- [ ] Admin routes still require the expected permissions
- [ ] A user with baseline RBAC permission can still access intended routes
- [ ] A user without the baseline permission still receives the expected denial path

### ABAC And Rollout Flags

- [ ] Protected-target rules still deny by default when rollout flags are disabled
- [ ] If ABAC audit-only flags are enabled intentionally, verify requests return `ALLOW_ABAC_AUDIT_ONLY` instead of silently bypassing policy
- [ ] Confirm audit-only mode is limited to the intended rollout scope and not left broadly enabled by mistake

### Regions

- [ ] Logical region admin routes still load and authorize correctly
- [ ] Administrative region admin routes still load and authorize correctly
- [ ] User detail views still show logical and administrative region assignments
- [ ] Region-scoped authorization still behaves correctly for in-scope and out-of-scope targets

### Two-Factor Authentication

- [ ] Security settings page loads
- [ ] Mandatory 2FA rollout mode is the expected value after deployment
- [ ] If rollout mode is `protected_roles`, verify protected roles resolve as the effective mandatory 2FA set
- [ ] If rollout mode is `custom`, verify the selected role ids match expectation
- [ ] Admin 2FA reset still requires step-up authentication

### Audit And Security Events

- [ ] Recovery and security-sensitive actions still append audit entries
- [ ] Security event flows still append the expected security-event records for relevant paths
- [ ] Audit log admin screen still loads and filters correctly

### Plugin Contract

- [ ] Plugin permission manifests still normalize correctly
- [ ] Declarative plugin route authorization still works for protected routes
- [ ] Plugin service authorization helpers still evaluate declared permissions correctly
- [ ] Plugin audit helper still appends plugin-tagged audit entries
- [ ] Plugin region-awareness helper still resolves scope ids for user-targeted resources
- [ ] The internal governance sample plugin contract test still passes in CI or pre-release validation

## Suggested Manual Validation Targets

Use these focused checks when the release touches governance or security surfaces.

### Admin Plugin

- [ ] `/_emdash/` redirects to `/_emdash/admin`
- [ ] `/_emdash/admin` loads
- [ ] User detail tabs load: `Overview`, `Roles`, `Jobs`, `Logical Regions`, `Administrative Regions`, `Sessions`, `Security`
- [ ] Protected action confirmations still appear for high-risk user-detail actions
- [ ] Admin routes load correctly through the Cloudflare public hostname

### Cloudflare Automation

- [ ] `https://sikesrakobar.ahlikoding.com/` responds through the current reviewed deployment path
- [ ] `https://sikesrakobar.ahlikoding.com/_emdash/` redirects to `/_emdash/admin` on the same host
- [ ] `https://sikesrakobar.ahlikoding.com/_emdash/api/setup/status` returns `200`; on a fresh site, `needsSetup: true` is expected until the first admin is created
- [ ] Turnstile-protected public flows behave correctly for the reviewed hostname set
- [ ] The deployed runtime can still reach bucket `sikesra` through the reviewed backend configuration
- [ ] The deployed runtime secret for `DATABASE_URL` matches the reviewed PostgreSQL hostname and SSL mode for the environment
- [ ] Cloudflare-side hostname, Turnstile, and R2 configuration changes are reflected in the current operator notes before release signoff
- [ ] When issue the scoped SIKESRA issue or related EmDash compatibility work is in scope, `https://sikesrakobar.ahlikoding.com/_emdash/api/setup/status` still returns success after the release window

### PostgreSQL Posture

- [ ] The live PostgreSQL resource is not left broadly publicly exposed unless there is a reviewed operator exception
- [ ] The live PostgreSQL service still reports the intended SSL posture after the release
- [ ] If credential rotation was triggered by live exposure or management-plane disclosure, the old credential no longer works and the new secret is stored only in reviewed deployment-managed locations
- [ ] During direct-path remediation, `pnpm healthcheck` is re-run with the reviewed direct hostname and `sslmode` assertion variables
- [ ] The canonical flow in `docs/process/runtime-smoke-test.md` or `pnpm healthcheck` is re-run after credential rotation or direct-posture remediation

### Security Settings

- [ ] `Security Settings` can switch between `none`, `protected_roles`, and `custom`
- [ ] Security policy survives an app restart or instance replacement
- [ ] Saving the security policy appends the expected audit entry
- [ ] Security-sensitive admin actions do not depend on client-supplied authorization headers

### Sessions And Recovery

- [ ] Per-session revoke still works
- [ ] Revoke-all sessions still works
- [ ] Forced password reset still revokes sessions and clears lockout counters on successful reset consumption

## Rollback Triggers

Roll back or pause the release if any of these occur:

- Migration failure or schema drift cannot be explained immediately
- Auth login breaks for known valid accounts
- Protected users can no longer be recovered with the documented flows
- RBAC or ABAC checks unexpectedly allow high-risk actions
- Audit entries stop appearing for plugin-managed or security-sensitive actions
- Mandatory 2FA rollout applies to the wrong role set
- Cloudflare automation leaves hostname routing, Turnstile validation, or R2 state partially applied and the smoke tests no longer pass

## Explicitly Avoid

- Manual schema edits during a standard deployment window
- Direct SQL updates to recover auth state unless an approved incident path requires it
- Disabling authorization logic in code as a deploy shortcut
- Skipping migration status checks after applying migrations
- Treating audit-only rollout mode as a permanent steady-state configuration

## Minimum Command Set

```bash
pnpm typecheck
pnpm test:unit
pnpm build
pnpm healthcheck
```

For the canonical deployed-runtime verification flow, see `docs/process/runtime-smoke-test.md`.

For the reviewed EmDash compatibility checks, see `docs/process/emdash-ledger-repair-runbook.md` and `docs/process/runtime-smoke-test.md`.
