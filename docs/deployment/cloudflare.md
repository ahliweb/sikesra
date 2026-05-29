# Cloudflare Deployment

## D1 Database Configuration

This repository uses the **`sikesra`** D1 database as its primary data store.

| Property | Value |
| --- | --- |
| Database Name | `sikesra` |
| Database ID | `e2902bf9-1648-4a46-8971-e4acadfa09ec` |
| Region | APAC |
| Tables | 84 (including EmDash system tables) |
| Size | ~3.84 MB |

## R2 Bucket Configuration

| Property | Value |
| --- | --- |
| Bucket Name | `sikesra` |
| Purpose | Media storage and document uploads |

## Worker Configuration

### Primary Demo (`awcmsmicro-dev/demos/cloudflare/`)

- Worker name: `sikesra`
- D1 binding: `DB` → `sikesra`
- R2 binding: `MEDIA` → `sikesra`
- Worker Loader: `LOADER` (for plugin sandboxing)

### Cloudflare Template (`awcmsmicro-dev/templates/awcms-micro-sikesraTemplate-cloudflare/`)

- Worker name: `sikesra`
- D1 binding: `DB` → `sikesra`
- R2 binding: `MEDIA` → `sikesra`
- Worker Loader: `LOADER` (for plugin sandboxing)

## Deployment Commands

```bash
# Deploy demo worker
cd awcmsmicro-dev/demos/cloudflare
npx wrangler deploy

# Deploy template worker
cd awcmsmicro-dev/templates/awcms-micro-sikesraTemplate-cloudflare
npx wrangler deploy

# Run migrations
npx wrangler d1 migrations apply sikesra --remote
```

## Environment Variables

Set these in `.env` or via `wrangler secret put`:

| Variable | Purpose |
| --- | --- |
| `D1_DATABASE_NAME` | `sikesra` |
| `D1_DATABASE_ID` | `e2902bf9-1648-4a46-8971-e4acadfa09ec` |
| `R2_MEDIA_BUCKET_NAME` | `sikesra` |
| `CLOUDFLARE_API_TOKEN` | API token with D1/R2/Workers permissions |
| `CLOUDFLARE_ACCOUNT_ID` | `5255727b7269584897c8c97ebdd3347f` |

## Verification

```bash
# Check D1 connection
npx wrangler d1 info sikesra

# Query database
npx wrangler d1 execute sikesra --command "SELECT count(*) FROM _emdash_collections"

# Check R2 bucket
npx wrangler r2 bucket info sikesra
```

## Downstream Cloudflare Surfaces

- `awcmsmicro-dev/templates/awcms-micro-sikesraTemplate-cloudflare/`
- `awcmsmicro-dev/demos/cloudflare/`

## Guidance

- Keep Cloudflare runtime wiring in downstream template and demo boundaries
- Keep root docs focused on operator workflow and deployment governance
- Record any platform-specific divergence from upstream EmDash in `docs/divergence-log.md`
