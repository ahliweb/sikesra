# Cloudflare Deployment

## Current Runtime

The current Cloudflare-facing implementation lives in `demos/cloudflare/` and consumes the SIKESRA plugin from the workspace.

The canonical target layout is scaffolded at:

- `templates/awcms-micro-sikesra-cloudflare/`
- `demos/awcms-micro-sikesra-cloudflare/`

## Required Bindings

Use these binding names unless deployment-specific constraints require a documented change:

- `DB`
- `SIKESRA_DB`
- `MEDIA`
- `SIKESRA_DOCUMENTS`
- `SESSION`
- `LOADER`

## Current Gap

The dedicated template and demo paths now exist as scaffolds, but the active deployment path remains `demos/cloudflare/` until the full runtime move is completed.

## Verification

- `pnpm --filter @emdash-cms/demo-cloudflare typecheck`
- `pnpm sikesra:smoke-admin`
- run deployment smoke checks after the dedicated template exists
