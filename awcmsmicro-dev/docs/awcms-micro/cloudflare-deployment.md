# AWCMS-Micro Cloudflare Deployment

## Purpose

This document explains how to deploy the AWCMS-Micro example template at `awcms-micro.ahlikoding.com` without modifying EmDash core and without committing Cloudflare secrets.

The target template is:

- `templates/awcms-micro-default-cloudflare/`

## Deployment Scope

This deployment flow assumes:

- public site domain: `awcms-micro.ahlikoding.com`
- media/public storage domain: `awcms-micro-s3.ahlikoding.com`
- D1 database name: `awcms-micro-d1`
- R2 binding: `MEDIA`
- Worker Loader binding: `LOADER`
- session KV binding: `SESSION`
- Cloudflare Images binding: `IMAGES`

## Files To Review

- `templates/awcms-micro-default-cloudflare/wrangler.jsonc`
- `templates/awcms-micro-default-cloudflare/.dev.vars.example`
- `templates/awcms-micro-default-cloudflare/.env.example`
- `templates/awcms-micro-default-cloudflare/README.md`
- `templates/awcms-micro-default-cloudflare/scripts/validate-cloudflare-env.sh`

## Required Secrets And Runtime Values

Set these outside git:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `AWCMS_MICRO_D1_DATABASE_ID`
- `AWCMS_MICRO_SESSION_NAMESPACE_ID`

Set these as non-secret deployment values or local overrides when needed:

- `AWCMS_MICRO_SITE_URL=https://awcms-micro.ahlikoding.com`
- `AWCMS_MICRO_STORAGE_PUBLIC_BASE_URL=https://awcms-micro-s3.ahlikoding.com`

## Local Setup

1. Copy `templates/awcms-micro-default-cloudflare/.dev.vars.example` to `.dev.vars` in the same folder.
2. Fill in the real local or CI values without committing them.
3. Export the same variables into your current shell if you want to run the validation script directly.

Example:

```bash
export AWCMS_MICRO_SITE_URL="https://awcms-micro.ahlikoding.com"
export AWCMS_MICRO_STORAGE_PUBLIC_BASE_URL="https://awcms-micro-s3.ahlikoding.com"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export AWCMS_MICRO_D1_DATABASE_ID="your-d1-database-id"
export AWCMS_MICRO_SESSION_NAMESPACE_ID="your-session-kv-namespace-id"
```

## Validate Environment

Run:

```bash
bash templates/awcms-micro-default-cloudflare/scripts/validate-cloudflare-env.sh
```

The script checks:

- required environment variables are present
- environment variables do not still use placeholder values
- `wrangler.jsonc` still contains the expected AWCMS-Micro bindings, route, and non-placeholder resource IDs

## Template Validation

From `awcmsmicro-dev` root:

```bash
pnpm --dir awcmsmicro-dev typecheck
pnpm --dir awcmsmicro-dev lint:quick
pnpm --dir awcmsmicro-dev test
pnpm --dir awcmsmicro-dev build
```

From the template directory:

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
```

## Cloudflare Resource Preparation

1. Create or confirm the D1 database named `awcms-micro-d1`.
2. Create or confirm the R2 bucket referenced by `MEDIA`.
3. Create or confirm the KV namespace referenced by `SESSION`.
4. Confirm the Worker Loader binding is available in the account where sandboxing is needed.
5. Confirm the custom domain route for `awcms-micro.ahlikoding.com` is correct.

## Dry Run And Deploy

From `templates/awcms-micro-default-cloudflare/`:

```bash
pnpm build
wrangler deploy --dry-run
wrangler deploy
```

Run deploy commands only after the environment validation passes and real secrets are loaded from local shell state or CI secrets.

## CI Guidance

Store these in GitHub Actions secrets or environment-protected deployment variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `AWCMS_MICRO_D1_DATABASE_ID`
- `AWCMS_MICRO_SESSION_NAMESPACE_ID`

Do not commit these values into:

- `.env.example`
- `.dev.vars.example`
- repository docs

The checked-in `wrangler.jsonc` may still contain non-secret operational binding IDs for the reference deployment target. Review them before deploy rather than treating them as placeholders.

## Smoke Tests

After deploy:

1. `GET /` returns HTTP 200.
2. `GET /posts` returns HTTP 200.
3. `GET /news` returns HTTP 200.
4. `GET /aggregate` returns HTTP 200 and stays public-safe.
5. `GET /about` returns HTTP 200.
6. `GET /_emdash/admin` is reachable and protected by EmDash auth.
7. `GET /_emdash/api/plugins/awcms-micro-sikesra/public/status` returns the public-safe plugin payload.
8. `POST /_emdash/api/plugins/awcms-micro-sikesra/overview/summary` is not publicly accessible without admin context.
9. Media upload and retrieval work through the configured R2 binding.
10. D1-backed content and settings are available.
11. Worker Loader binding exists when sandboxed plugin support is enabled later.

## Rollback

1. Re-deploy the last known-good Worker build.
2. Restore the previous `wrangler.jsonc` route or binding values if the incident is infrastructure-related.
3. Revert the last template or deployment commit if the problem is application-level.
4. If the issue is database-related, switch to a replacement D1 database or restore from a known-good backup after review.
5. Re-run the smoke tests before reopening traffic.
