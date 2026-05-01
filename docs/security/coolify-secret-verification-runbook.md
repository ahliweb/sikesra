# Coolify Secret Verification Runbook

## Purpose

This runbook defines the operator-only verification and rotation sequence for `ahliweb/sikesra#67`.

Use it when the repository-side secret hygiene and auth hardening work is complete but the live Coolify-managed runtime secrets still need verification through operator control planes.

This document is intentionally operational. It must not contain real secret values, raw connection strings, private keys, or copied token material.

## Authority And Scope

Use this runbook together with:

- `docs/security/operations.md`
- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/postgresql-vps-hardening.md`

This runbook covers:

- Coolify-managed runtime secret inventory verification
- Cloudflare-managed secret and operator-credential verification
- PostgreSQL runtime and migration credential posture checks
- redacted operator-note expectations for rotation evidence

This runbook does not change secrets by itself. It defines the reviewed operator steps required before `#67` can be closed.

## Required Secret Inventory

Verify the current live deployment stores these values only in reviewed secret stores:

### Coolify-managed runtime secrets

- `DATABASE_URL`
- `DATABASE_MIGRATION_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `PASSWORD_PEPPER`
- `TWO_FACTOR_ENCRYPTION_KEY`
- `TWO_FACTOR_RECOVERY_CODE_PEPPER`
- provider API keys used by the running app

### Cloudflare-managed secrets and operator credentials

- `TURNSTILE_SECRET_KEY`
- `EDGE_API_JWT_SECRET`
- Cloudflare API or Access credentials only when a reviewed automation path explicitly needs them

### Browser-exposed non-secret values

- Turnstile site key only

Do not treat `.env.example`, `.env.local`, `.dev.vars`, shell history, build args, image labels, issue comments, or ad hoc command snippets as approved production secret stores.

## Operator Verification Sequence

### 1. Confirm repository baseline first

- Run `pnpm check:secret-hygiene`
- Confirm no tracked scripts or docs currently contain live credentials
- Confirm the repo is only documenting redacted secret posture, not values

### 2. Verify Coolify secret storage

In the Coolify dashboard or another reviewed Coolify-supported management path:

- confirm app/runtime secrets are stored as locked environment variables
- confirm build-time exposure is disabled unless a reviewed build secret is explicitly needed
- confirm sensitive values are not duplicated into plain build arguments, preview logs, or copied notes
- confirm the current runtime uses a dedicated application database credential rather than `postgres`
- confirm migration credentials are separate from the runtime credential when `DATABASE_MIGRATION_URL` is present

Record only redacted operator notes such as:

- secret name
- storage surface: `coolify_runtime_locked`, `coolify_build_secret`, or `cloudflare_worker_secret`
- last rotation date
- rotation owner
- whether the value was newly rotated during the verification pass

### 3. Verify PostgreSQL credential posture

Use the reviewed PostgreSQL posture guidance in `docs/process/postgresql-vps-hardening.md`.

Minimum checks:

- runtime credential is not `postgres`
- runtime credential is not a superuser
- migration credential is separate from runtime where applicable
- remote traffic uses the intended TLS posture
- `pg_hba.conf` and firewall policy remain narrowly scoped
- if `sslmode=verify-full` is expected, hostname coverage for `id1.ahlikoding.com` is still valid

Recommended redacted commands:

```bash
pnpm audit:database-role
pnpm db:migrate:probe
pnpm healthcheck
```

### 4. Verify Cloudflare-side secret posture

In the Cloudflare dashboard, Wrangler, or another reviewed Cloudflare management path:

- confirm required Cloudflare-managed secrets and operator credentials exist only in approved secret storage
- confirm the reviewed R2 bucket and Turnstile configuration still match the active architecture
- confirm Turnstile secret material is not stored in client-visible config
- confirm only the public Turnstile site key is exposed to the browser

If the current MCP session cannot read live Worker inventory, record that caveat explicitly and use the reviewed smoke tests instead of guessing.

### 5. Rotate if any exposure is suspected

Rotate a secret immediately if it was ever found in:

- a script or tracked file
- copied command history
- logs
- issue comments
- pasted connection strings or notes outside approved secret stores

For each rotated secret:

- generate a new value with adequate entropy
- update only the approved secret store
- redeploy or restart the affected runtime if required
- invalidate the old credential or token
- record the redacted rotation note and date

### 6. Re-verify live deployment after rotation

Run the reviewed validation path after any secret change:

```bash
pnpm check:secret-hygiene
pnpm healthcheck
```

See `docs/process/runtime-smoke-test.md` for the canonical live EmDash verification commands.

Then confirm:

- login still works for a known good test account
- Turnstile-protected flows still validate correctly
- the Hono backend still reaches PostgreSQL through the intended transport
- the deployed runtime still exposes the expected non-secret posture only

## Closure Notes For #67

`#67` is ready to close only when all of the following are true:

- Coolify live secret inventory has been reviewed without copying values into GitHub
- any exposed or script-stored credentials were rotated and invalidated
- runtime and migration database roles are distinct and least-privilege
- Cloudflare-side secret storage and reviewed platform configuration were rechecked
- redacted operator notes include secret locations and rotation dates
- `pnpm check:secret-hygiene` still passes after the verification pass

## Current Tooling Caveat

In the current AI tool session:

- GitHub issue management is available
- Cloudflare inventory calls may return no visible Worker/domain/secret inventory
- no Coolify MCP/control surface is available

Because of that, this runbook is the smallest honest repository-side step that advances `#67` without claiming unperformed live operator work.
