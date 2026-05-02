# AWCMS Mini SIKESRA

SIKESRA runs with Cloudflare as the browser-facing layer and a Hono API plus PostgreSQL on a Coolify-managed VPS.

## Quick Deploy

### 1. Local Validate

```bash
pnpm docker:local:up
pnpm docker:local:migrate
pnpm check
pnpm build
docker build -t sikesra-local-test .
```

### 2. Promote

- Open PR from reviewed changes.
- Merge to the deployment branch.
- Deploy the merged commit from remote Coolify.

### 3. Remote Verify

```bash
node scripts/verify-runtime-readiness.mjs
```

See `docs/process/runtime-smoke-test.md` for the canonical live EmDash verification commands.

## Core Docs

- `DEPLOYMENT.md`
- `docs/process/local-compose-remote-coolify-workflow.md`
- `docs/process/local-docker-development.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/cloudflare-hosted-runtime.md`

## Helper Command

Print the quick deploy checklist at any time:

```bash
pnpm deploy:checklist
```

Run local SIKESRA API+DB and EmDash/Astro core together:

```bash
pnpm dev:emdash-core
```

If local `5432` is occupied, this command defaults to `LOCAL_POSTGRES_PORT=15432`.

Stop both local API+DB and EmDash/Astro core:

```bash
pnpm dev:emdash-core:stop
```

Expected local setup behavior:

- `/_emdash/api/setup/status` should return `200` before the first admin is created.
- On a fresh site, `needsSetup: true` is expected and is not the same as a failed migration banner.
- `/_emdash/api/manifest` may return `401 Not authenticated` on the setup page before login. That is expected and not the setup blocker.

## Security Basics

- Never commit real credentials, tokens, private keys, or connection strings.
- Keep local-only values in `.env.local` or `.env.<environment>.local`.
- Keep Coolify and Cloudflare operator credentials separate from app runtime secrets.
