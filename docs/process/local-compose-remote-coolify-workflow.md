# Local Compose And Remote Coolify Workflow

## Purpose

This runbook defines the recommended development and deployment workflow for SIKESRA:

- local-only Docker Compose for PostgreSQL and the Hono backend API
- remote Coolify for the deployed Hono API and PostgreSQL runtime
- Cloudflare as the browser-facing frontend and edge layer

This is the reviewed alternative to maintaining a local Coolify mirror.

## Recommended Source Of Truth

Use these as the only durable sources of truth:

- Git for code, Docker build logic, and tracked config templates
- `.env.example` for the runtime env contract
- `.env.local` or `.env.<environment>.local` for local-only secrets
- Coolify locked runtime secrets for remote deployment secrets
- Cloudflare-managed configuration for Pages, Turnstile, and R2-facing edge settings

Do not treat a local Coolify instance as a sync target or configuration source.

## Workflow Summary

```text
Local development
  -> local Docker Compose
  -> local migrations and tests
  -> git commit / PR
  -> remote Coolify deploy
  -> Cloudflare-facing smoke tests
```

## Local Development

Use local Docker Compose only for runtime dependencies you need on the workstation:

- PostgreSQL
- Hono API

Current local command set:

```bash
pnpm docker:local:up
pnpm docker:local:migrate
pnpm docker:local:logs
pnpm docker:local:down
```

Local expectations:

- the API container uses `postgres` as the internal database hostname
- local browser or frontend dev tooling calls the API through `PUBLIC_API_BASE_URL`
- local secrets stay in `.env.local`
- operator tokens such as `COOLIFY_ACCESS_TOKEN` and `CLOUDFLARE_API_TOKEN` remain local-only and are not broadly injected into containers

## Remote Coolify Deployment

Use Coolify only for the deployed environment, not for local mirroring.

Remote Coolify owns:

- image build and release deployment
- runtime environment variables and locked secrets
- Hono API service lifecycle
- PostgreSQL Docker service lifecycle
- internal Docker networking between API and PostgreSQL

Remote Coolify should keep using the same production-shape contract:

- Hono API service name: `awcms-mini-api`
- PostgreSQL service name: `awcms-mini-postgres`
- internal database hostname: `postgres`
- database name: `sikesrakobar`

## Promotion Path

### 1. Develop locally

- change code in Git
- run local Compose when backend or database work is needed
- keep Cloudflare and Coolify secrets in ignored env files only

### 2. Validate locally

Use the smallest relevant command set before promotion:

```bash
pnpm check
docker build -t sikesra-local-test .
```

If the change touches the database path or migrations, also run:

```bash
pnpm docker:local:migrate
pnpm db:migrate:status
```

### 3. Promote through Git

- open the reviewed PR
- merge after review
- let remote Coolify deploy from the tracked branch or commit

Do not promote by manually editing runtime code or compose logic directly in Coolify unless incident response requires it.

### 4. Configure remote runtime in Coolify

Keep these values in Coolify environment variables or locked secrets:

- `DATABASE_URL`
- `DATABASE_MIGRATION_URL` when needed
- `JWT_SECRET`
- `SESSION_SECRET`
- `PASSWORD_PEPPER`
- `TWO_FACTOR_ENCRYPTION_KEY`
- `TWO_FACTOR_RECOVERY_CODE_PEPPER`
- `TURNSTILE_SECRET_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- provider API keys

Keep browser-facing non-secrets aligned with the Cloudflare deployment:

- `APP_URL=https://sikesrakobar.ahlikoding.com`
- `API_BASE_URL=https://sikesrakobar.ahlikoding.com/api`
- `PUBLIC_API_BASE_URL=https://sikesrakobar.ahlikoding.com/api`
- `R2_BUCKET_NAME=sikesra`

Use `postgres` as the internal hostname in the remote `DATABASE_URL`.

### 5. Verify remote posture

For operator-side readiness and posture checks:

```bash
node scripts/verify-runtime-readiness.mjs
pnpm db:migrate:probe
```

For live deployment smoke checks:

```bash
pnpm verify:live-runtime -- https://sikesrakobar.ahlikoding.com
```

Confirm:

- the public hostname still serves through Cloudflare
- the API is healthy
- the runtime still reaches PostgreSQL
- Turnstile-protected flows still work when enabled
- R2 access still targets bucket `sikesra`

For local EmDash setup flows, treat `200` from `/_emdash/api/setup/status` as the primary readiness signal. An unauthenticated `401` from `/_emdash/api/manifest` on the setup screen is expected before login and is not by itself a setup failure.

## Separation Rules

Keep these concerns separate:

- local development runtime: Docker Compose
- deployed runtime management: Coolify
- public host and edge controls: Cloudflare
- code promotion: Git
- secrets: local ignored env files or deployment-managed secret stores

Avoid these anti-patterns:

- local Coolify as a pseudo-sync source for cloud Coolify
- hand-maintained duplicate app definitions across local and remote control planes
- copying production secrets into local compose files
- injecting all local operator env into development containers
- using Coolify administrative tokens as runtime application credentials

## When To Touch Coolify Locally

Do not install local Coolify for normal development.

Only consider local Coolify for short-lived experiments such as:

- reproducing a Coolify-specific build issue
- checking Coolify proxy or healthcheck behavior
- investigating a Coolify compose-rendering quirk

Even then, treat the local Coolify instance as disposable and non-authoritative.

## Operator Notes

- Keep Coolify administrative credentials local-only.
- Keep Cloudflare operator credentials local-only.
- Keep production database data and secrets out of local environments unless a reviewed incident path requires a sanitized copy.
- Prefer documented redacted verification over copied management-plane payloads.

## Cross-References

- `docs/process/local-docker-development.md`
- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/coolify-mcp-secret-handling.md`
- `docs/security/coolify-secret-verification-runbook.md`
