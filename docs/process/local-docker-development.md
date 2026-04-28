# Local Docker Development

## Purpose

This runbook defines the reviewed local development path for PostgreSQL and the Hono backend API using Docker while preserving the production Cloudflare Pages plus Coolify architecture.

For the full dev-to-deploy promotion sequence, see `docs/process/local-compose-remote-coolify-workflow.md`.

## Supported Local Baseline

Local development uses:

- `docker compose -f compose.local.yaml` for PostgreSQL and the Hono API
- Cloudflare Pages as the browser-facing frontend deployment target and runtime contract reference
- the same backend environment variable contract as production
- the same Cloudflare-managed external services where available: R2, Turnstile, Mailketing, and Starsender

Local development does not replace Cloudflare Pages with another production path. It only provides a reviewed local backend and database path that is compatible with the Coolify-managed production layout.

## Service Map

```text
Local browser or local frontend dev server
        |
        v
Hono API container        http://localhost:3000
        |
        +--> PostgreSQL container   postgres:5432
        |
        +--> Cloudflare R2          external
        +--> Cloudflare Turnstile   external
        +--> Mailketing             external
        +--> Starsender             external
```

## Why This Merges Cleanly To Coolify

- The API still uses `DATABASE_URL` and `DATABASE_INTERNAL_URL` with the internal hostname `postgres`.
- Production can keep using the same image build and the same `postgres` Docker-network hostname on Coolify.
- Cloudflare-facing values such as `APP_URL`, `API_BASE_URL`, `PUBLIC_API_BASE_URL`, Turnstile keys, and R2 credentials remain environment-driven instead of being hard-coded for local-only behavior.
- The frontend contract stays unchanged: Cloudflare Pages or a local frontend dev server talks to the Hono API through `PUBLIC_API_BASE_URL`.

## Files

- `compose.local.yaml`: local PostgreSQL and Hono API stack
- `Dockerfile`: shared image build for local development and Coolify deployment
- `.env.local`: local-only secrets and overrides, never committed

`docker compose` reads `.env.local` on the workstation only for variable substitution. The compose file passes a reviewed allowlist of runtime variables into the API container instead of forwarding the whole local env file.

The `pnpm docker:local:*` commands include `--env-file .env.local`, so local placeholders and overrides are loaded consistently.

## Local Setup

1. Copy `.env.example` into `.env.local` if you do not already have one.
2. Fill local-safe secrets for auth values such as `JWT_SECRET`, `SESSION_SECRET`, and `PASSWORD_PEPPER`.
3. Add real Cloudflare R2 and Turnstile values only if you want those integrations to work locally.
4. Keep `.env.local` untracked.

Minimum local values:

```dotenv
NODE_ENV=development
LOCAL_POSTGRES_PASSWORD=<set-local-dev-password>
LOCAL_POSTGRES_USER=sikesra
LOCAL_POSTGRES_DB=sikesrakobar
LOCAL_POSTGRES_PORT=5432
JWT_SECRET=<set-at-least-32-characters>
SESSION_SECRET=<set-at-least-32-characters>
PASSWORD_PEPPER=<set-at-least-16-characters>
TWO_FACTOR_ENCRYPTION_KEY=<set-at-least-32-characters>
TWO_FACTOR_RECOVERY_CODE_PEPPER=<set-at-least-16-characters>
```

Optional local Cloudflare-backed values:

```dotenv
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=sikesra
R2_PUBLIC_BASE_URL=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
PUBLIC_TURNSTILE_SITE_KEY=
```

## Commands

Start the local stack:

```bash
pnpm docker:local:up
```

Apply migrations inside the API container:

```bash
pnpm docker:local:migrate
```

Follow logs:

```bash
pnpm docker:local:logs
```

Connect to PostgreSQL:

```bash
pnpm docker:local:psql
```

Stop the stack:

```bash
pnpm docker:local:down
```

## Runtime Notes

- The local API container listens on `http://localhost:3000`.
- The compose file sets `APP_URL=http://localhost:4321` as the default assumption for a local frontend dev server.
- `CORS_ALLOWED_ORIGINS` includes common local frontend origins and can still be overridden from `.env.local`.
- PostgreSQL is published on `127.0.0.1:5432` for local operator tooling, but the API container itself uses the internal hostname `postgres`.
- If local port `5432` is already used by another service, set `LOCAL_POSTGRES_PORT` (for example `15432`) in `.env.local` and restart the stack.

## Coolify Mapping

For production on Coolify:

- keep using the same Docker image build
- keep the Hono API as the application service
- keep PostgreSQL as a sibling Docker service on the internal network
- set `DATABASE_URL` or `DATABASE_INTERNAL_URL` to `postgresql://<role>:<password>@postgres:5432/sikesrakobar`
- set public URLs back to `https://sikesrakobar.ahlikoding.com`
- keep R2, Turnstile, and provider credentials in Coolify-managed secrets

Do not commit local passwords, Cloudflare secrets, or provider credentials into compose files, tracked env files, or Coolify build arguments.
