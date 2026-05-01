# Deployment Checklist

This is the concise operator checklist for the reviewed SIKESRA workflow:

- local development with Docker Compose
- promotion via Git
- remote deployment on Coolify
- public verification through Cloudflare hostname paths

You can print this sequence quickly with:

```bash
pnpm deploy:checklist
```

For deeper detail, use:

- `docs/process/local-compose-remote-coolify-workflow.md`
- `docs/process/local-docker-development.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/cloudflare-hosted-runtime.md`

## 1) Local Prepare

- Confirm local secrets exist in `.env.local` and are not committed.
- Start local stack when backend/database work is in scope:

```bash
pnpm dev:emdash-core
```

This helper uses `LOCAL_POSTGRES_PORT=15432` by default unless you override it.

Stop helper stack:

```bash
pnpm dev:emdash-core:stop
```

Expected local setup diagnostics:

- `/_emdash/api/setup/status` should respond `200`.
- unauthenticated `/_emdash/api/manifest` requests may return `401` on the setup screen before an admin session exists.

or run API+DB only:

```bash
pnpm docker:local:up
pnpm docker:local:migrate
```

- Run baseline validation:

```bash
pnpm check
docker build -t sikesra-local-test .
```

## 2) Git Promotion

- Commit only reviewed changes.
- Open and review PR.
- Merge to the deployment branch.

Do not use local Coolify as a sync source.

## 3) Remote Coolify Deploy

- Deploy from the reviewed branch/commit.
- Ensure runtime env and locked secrets are present in Coolify:
  - `DATABASE_URL`
  - `DATABASE_MIGRATION_URL` (when needed)
  - `JWT_SECRET`
  - `SESSION_SECRET`
  - `PASSWORD_PEPPER`
  - `TWO_FACTOR_ENCRYPTION_KEY`
  - `TWO_FACTOR_RECOVERY_CODE_PEPPER`
  - `TURNSTILE_SECRET_KEY`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`

- Ensure production URLs are correct:
  - `APP_URL=https://sikesrakobar.ahlikoding.com`
  - `API_BASE_URL=https://sikesrakobar.ahlikoding.com/api`
  - `PUBLIC_API_BASE_URL=https://sikesrakobar.ahlikoding.com/api`

- Ensure DB host path uses internal Docker hostname `postgres`.

## 4) Post-Deploy Verify

- Run redacted readiness and runtime checks:

```bash
node scripts/verify-runtime-readiness.mjs
```

See `docs/process/runtime-smoke-test.md` for the canonical live EmDash verification commands.

- Confirm:
  - public host responds through Cloudflare
  - API health is good
  - PostgreSQL connectivity is healthy
  - Turnstile-protected flows behave correctly when enabled
  - R2 bucket target remains `sikesra`

## 5) Rollback Triggers

Pause rollout and execute incident procedure if any of these occur:

- migration failures or unexplained schema drift
- auth/login regressions for known-valid accounts
- authorization regressions on protected operations
- Cloudflare hostname/admin entry smoke-test failures

Use `docs/process/migration-deployment-checklist.md` and `docs/security/emergency-recovery-runbook.md` for full rollback and recovery steps.

## Hard Rules

- Never commit real credentials or connection strings.
- Keep local-only values in `.env.local` or `.env.<environment>.local`.
- Keep Coolify and Cloudflare operator credentials separate from application runtime credentials.
