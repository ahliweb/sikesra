# AWCMS-Micro E2E Boundary

This boundary holds AWCMS-Micro-specific end-to-end validation assets.

## Purpose

Keep AWCMS-Micro-specific browser and smoke validation separate from upstream EmDash test ownership.

## Current Coverage

- `smoke.mjs`: builds and previews the local and Cloudflare example templates, then checks public pages and the public-safe plugin endpoint.

## Run

From `awcmsmicro-dev`:

```bash
node e2e/awcms-micro/smoke.mjs
```

## Boundary Rule

Do not place upstream EmDash E2E overrides here.
