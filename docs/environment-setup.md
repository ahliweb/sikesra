# Environment Setup

## Quick Start

```bash
# Copy the template
cp .env.example .env

# Edit with your values
nano .env  # or your preferred editor
```

## Required Variables

### Minimum for Development

No variables required for local development with SQLite.

### Minimum for Cloudflare Deployment

| Variable | Purpose | Where to Get |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | API access | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Account identifier | Workers dashboard URL |

### For Upstream Sync (Optional)

| Variable | Purpose | Default |
| --- | --- | --- |
| `GITHUB_TOKEN` | Authenticated API access | [GitHub Settings](https://github.com/settings/tokens) |
| `AWCSM_UPSTREAM_URL` | Upstream repo URL | `https://github.com/ahliweb/awcms-micro.git` |

## Cloudflare Token Permissions

Create a token with these permissions:

- **Account**: Cloudflare API Token (Read)
- **D1**: Edit
- **R2**: Edit
- **Workers**: Edit
- **Zones**: Read (if using custom domains)

## Security Notes

- `.env` is gitignored - never commit it
- `.env.example` is the template - safe to commit
- Use `wrangler secret put` for Worker secrets (not `.env`)
- `.dev.vars` is for local wrangler dev only (also gitignored)

## Backup Scripts

If using backup/mirror workflows:

| Variable | Purpose |
| --- | --- |
| `GITLAB_PAT` | GitLab Personal Access Token |
| `GITLAB_MIRROR_URL` | GitLab mirror repository URL |

These allow operator-only values to stay outside committed config.
