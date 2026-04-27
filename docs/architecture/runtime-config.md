# Runtime Configuration

## Purpose

This document defines the base runtime configuration contract for SIKESRA (awcms-mini-sikesra).

## Target Runtime

The production runtime is a Hono-based Node.js API service managed by Coolify on a VPS. Cloudflare Pages serves the frontend. PostgreSQL runs as a Docker service on the same VPS.

See `docs/architecture/overview.md` for the full target stack.

## SIKESRA Deployment Identifiers

| Component            | Value                                          |
|----------------------|------------------------------------------------|
| Frontend host        | `sikesrakobar.ahlikoding.com`                  |
| Admin entry alias    | `/_emdash/`                                    |
| Hono API service     | `awcms-mini-api` (Coolify service name)        |
| PostgreSQL service   | `awcms-mini-postgres` (Coolify service name)   |
| PostgreSQL database  | `sikesrakobar`                                 |
| Internal DB hostname | `postgres` (Docker internal network)           |
| R2 bucket            | `sikesra`                                      |
| R2 Worker binding    | `MEDIA_BUCKET` (retained for R2 access)        |

## Backend Environment Variables

The Hono backend reads the following variables at startup. Set them in Coolify environment variables or in `.env.local` for local development. Do not commit real values.

### Core

| Variable          | Purpose                                        |
|-------------------|------------------------------------------------|
| `NODE_ENV`        | `production` or `development`                  |
| `PORT`            | Port the Hono service listens on (default: `3000`) |
| `APP_URL`         | Public frontend URL (`https://sikesrakobar.ahlikoding.com`) |
| `API_BASE_URL`    | Public API base URL                            |

### Database

| Variable                 | Purpose                                           |
|--------------------------|---------------------------------------------------|
| `DATABASE_URL`           | PostgreSQL connection string (internal Docker network) |
| `DATABASE_MIGRATION_URL` | Optional migration-only override when operator migration environment differs from runtime |

Production template:
```
DATABASE_URL=postgresql://app_user:<password>@postgres:5432/sikesrakobar
```

### Auth and Session

| Variable              | Purpose                                           |
|-----------------------|---------------------------------------------------|
| `JWT_SECRET`          | JWT signing secret                                |
| `SESSION_SECRET`      | Session signing secret                            |
| `PASSWORD_PEPPER`     | Password hash pepper                              |

### Cloudflare R2

| Variable               | Purpose                           |
|------------------------|-----------------------------------|
| `CLOUDFLARE_ACCOUNT_ID`| Cloudflare account ID             |
| `R2_ACCESS_KEY_ID`     | R2 access key                     |
| `R2_SECRET_ACCESS_KEY` | R2 secret key                     |
| `R2_BUCKET_NAME`       | Bucket name (`sikesra`)           |
| `R2_PUBLIC_BASE_URL`   | Public base URL for public assets |

### CORS

| Variable               | Purpose                                                  |
|------------------------|----------------------------------------------------------|
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins (e.g., the Pages domain) |

### Cloudflare Turnstile

| Variable                | Purpose                                                       |
|-------------------------|---------------------------------------------------------------|
| `TURNSTILE_SITE_KEY`    | Public site key (safe to expose to frontend)                  |
| `TURNSTILE_SECRET_KEY`  | Server-side secret for Siteverify (backend only)              |
| `TURNSTILE_VERIFY_URL`  | `https://challenges.cloudflare.com/turnstile/v0/siteverify`   |

### Two-Factor Authentication

| Variable                         | Purpose                                 |
|----------------------------------|-----------------------------------------|
| `TWO_FACTOR_ISSUER`              | TOTP issuer name shown in authenticator apps |
| `TWO_FACTOR_ENCRYPTION_KEY`      | Key used to encrypt stored TOTP secrets |
| `TWO_FACTOR_RECOVERY_CODE_PEPPER`| Pepper for recovery code hashing        |

### OpenAPI / Swagger

| Variable            | Purpose                                             |
|---------------------|-----------------------------------------------------|
| `OPENAPI_ENABLED`   | `true` to serve `/openapi.json`                     |
| `OPENAPI_JSON_PATH` | Path for OpenAPI JSON (default: `/openapi.json`)    |
| `SWAGGER_UI_ENABLED`| `true` to serve Swagger UI                          |
| `SWAGGER_UI_PATH`   | Path for Swagger UI (default: `/docs`)              |

Disable Swagger UI in production if the deployment policy requires private API documentation.

### Mailketing Email API

| Variable                    | Purpose                                                   |
|-----------------------------|-----------------------------------------------------------|
| `MAILKETING_ENABLED`        | `true` to enable Mailketing integration                   |
| `MAILKETING_API_BASE_URL`   | Mailketing API base URL                                   |
| `MAILKETING_API_KEY`        | Mailketing API key (backend secret only)                  |
| `MAILKETING_SENDER_EMAIL`   | Sender email address                                      |
| `MAILKETING_SENDER_NAME`    | Sender display name                                       |
| `MAILKETING_WEBHOOK_SECRET` | Webhook signature secret if supported                     |
| `MAILKETING_TIMEOUT_MS`     | Request timeout in milliseconds (default: `10000`)        |
| `MAILKETING_MAX_RETRIES`    | Maximum retry attempts (default: `3`)                     |

### Starsender WhatsApp API

| Variable                      | Purpose                                                   |
|-------------------------------|-----------------------------------------------------------|
| `STARSENDER_ENABLED`          | `true` to enable Starsender integration                   |
| `STARSENDER_API_BASE_URL`     | Starsender API base URL                                   |
| `STARSENDER_API_KEY`          | Starsender API key (backend secret only)                  |
| `STARSENDER_DEVICE_ID`        | Device ID if required by provider                         |
| `STARSENDER_DEFAULT_COUNTRY_CODE` | Default country code prefix (default: `62`)           |
| `STARSENDER_WEBHOOK_SECRET`   | Webhook signature secret if supported                     |
| `STARSENDER_TIMEOUT_MS`       | Request timeout in milliseconds (default: `10000`)        |
| `STARSENDER_MAX_RETRIES`      | Maximum retry attempts (default: `3`)                     |

### Notification Defaults

| Variable                              | Purpose                                             |
|---------------------------------------|-----------------------------------------------------|
| `NOTIFICATION_RATE_LIMIT_PER_MINUTE`  | Rate limit for outbound messages (default: `60`)    |
| `NOTIFICATION_RETRY_ENABLED`          | `true` to enable retry on failed sends              |
| `NOTIFICATION_DEFAULT_PROVIDER_EMAIL` | Default email provider (`mailketing`)               |
| `NOTIFICATION_DEFAULT_PROVIDER_WHATSAPP` | Default WhatsApp provider (`starsender`)         |

## Frontend Environment Variables (Cloudflare Pages)

These are safe to expose to the browser. Never include database credentials, R2 keys, Turnstile secret keys, or provider API keys here.

| Variable                  | Purpose                                                    |
|---------------------------|------------------------------------------------------------|
| `PUBLIC_API_BASE_URL`     | Hono API base URL called by the frontend                   |
| `PUBLIC_SITE_CODE`        | Site code identifier (`main`)                              |
| `PUBLIC_APP_ENV`          | `production` or `staging`                                  |
| `PUBLIC_TURNSTILE_SITE_KEY` | Public Turnstile site key for rendering widgets          |

## No-Hyperdrive Note

Cloudflare Hyperdrive is not part of the active SIKESRA repository architecture. Use `DATABASE_URL` and `DATABASE_MIGRATION_URL` for reviewed PostgreSQL connectivity instead. See `docs/architecture/no-hyperdrive-adr.md`.

## Rules

- Keep runtime connection settings isolated in `src/config/` (or `apps/api/src/config/` once the Hono scaffold lands).
- Do not inline database connection strings across multiple files.
- Treat `DATABASE_URL` as the canonical PostgreSQL runtime input.
- Keep provider API keys (Mailketing, Starsender) in Coolify secrets only; never expose them to the frontend.
- Keep `TURNSTILE_SECRET_KEY` and `TWO_FACTOR_ENCRYPTION_KEY` as backend-only secrets.
- Keep R2 secret access keys as backend-only secrets; public assets may use public R2 URLs only if explicitly marked public.

## Source of Truth

- Backend env contract: `.env.example`
- Runtime config module: `src/config/runtime.mjs` (current); `apps/api/src/config/env.ts` (target Hono scaffold)
- Cloudflare Pages config: Cloudflare Pages dashboard or `wrangler.toml` for Pages if used
- Coolify service config: Coolify environment variables for the `awcms-mini-api` service

## Cross-References

- `docs/architecture/overview.md`
- `docs/architecture/no-hyperdrive-adr.md`
- `docs/architecture/database-access.md`
- `docs/process/cloudflare-coolify-origin-hardening.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/sikesra-runtime-security.md`
