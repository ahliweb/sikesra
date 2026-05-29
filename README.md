# AWCMS SIKESRA

Independent SIKESRA implementation based on [AWCMS-Micro](https://github.com/ahliweb/awcms-micro), which itself is built on [EmDash](https://github.com/emdash-cms/emdash).

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server (uses awcms-sikesraTemplate)
pnpm dev

# Sync from upstream (safe, preserves SIKESRA changes)
pnpm sync:upstream

# Preview sync without applying
pnpm sync:dry-run
```

## Architecture

This repository is an **independent downstream maintenance workspace** with:

- **Safe upstream sync** via `scripts/sync-from-awcms-micro.sh`
- **Protected paths** that preserve SIKESRA-specific code during sync
- **Unique naming** for plugins and templates to avoid conflicts

### Directory Structure

```
sikesra/
├── awcmsmicro-dev/          # Downstream implementation workspace
│   ├── packages/plugins/
│   │   └── awcms-sikesra/          # SIKESRA plugin (protected)
│   ├── templates/
│   │   ├── awcms-sikesraTemplate/           # Default template (protected, active)
│   │   └── awcms-sikesraTemplate-cloudflare/ # Cloudflare template (protected)
│   ├── demos/
│   │   └── cloudflare/                     # Demo boundary
│   └── docs/
│       └── awcms-micro/sikesra/            # SIKESRA docs (protected)
├── emdash-latest/           # Clean EmDash upstream reference
├── docs/                    # Root governance docs (protected)
├── scripts/                 # Sync and validation scripts (protected)
└── update-backup/           # Automatic sync backups
```

## Upstream Sync Workflow

### How It Works

```
emdash-cms/emdash ──sync──▶ emdash-latest/ ──sync──▶ awcmsmicro-dev/
     (EmDash)              (clean mirror)         (SIKESRA custom)
```

1. `scripts/update-emdash-latest.sh` refreshes `emdash-latest/` from `emdash-cms/emdash`
2. `scripts/update-awcmsmicro-dev.sh` rebuilds `awcmsmicro-dev/` from `emdash-latest/`
3. Protected SIKESRA paths are preserved during the rebuild

### Sync Commands

```bash
# Preview changes (safe, no modifications)
pnpm sync:dry-run

# Sync with backup and validation (recommended)
pnpm sync:upstream

# Force sync without backup (use with caution)
pnpm sync:force

# Validate protected paths after sync
pnpm validate:boundaries
```

## Protected Paths

The following paths are **never overwritten** during upstream sync:

| Path | Purpose |
| --- | --- |
| `awcmsmicro-dev/packages/plugins/awcms-sikesra/` | SIKESRA plugin |
| `awcmsmicro-dev/templates/awcms-sikesraTemplate/` | Default template (active) |
| `awcmsmicro-dev/templates/awcms-sikesraTemplate-cloudflare/` | Cloudflare template |
| `awcmsmicro-dev/demos/cloudflare/` | Demo boundary |
| `awcmsmicro-dev/docs/awcms-micro/sikesra/` | SIKESRA docs |
| `awcmsmicro-dev/e2e/awcms-micro/sikesra/` | E2E tests |
| `docs/` | Root governance |
| `scripts/` | Sync scripts |

Full list: `scripts/awcms-micro-protected-paths.txt`

## Naming Convention

To avoid conflicts with upstream:

| Upstream Name | This Repo Name |
| --- | --- |
| `awcms-micro-default` | `awcms-sikesraTemplate` |
| `awcms-micro-default-cloudflare` | `awcms-sikesraTemplate-cloudflare` |
| `@awcms-micro/plugin-sikesra` | `@ahliweb/awcms-sikesra` |

**Rule:** Always use `awcms-sikesra` or `awcms-sikesraTemplate` suffix for new plugins/templates.

## Cloudflare Configuration

| Service | Name | ID |
| --- | --- | --- |
| D1 Database | `sikesra` | `e2902bf9-1648-4a46-8971-e4acadfa09ec` |
| R2 Bucket | `sikesra` | — |
| KV Namespace | `sikesra-session` | `29e3fd9bbf2f448fa3b36185b8be299a` |
| Worker | `sikesra` | — |

## Environment Setup

```bash
# Copy example env
cp .env.example .env

# Edit with your tokens (optional)
# GITHUB_TOKEN - for authenticated GitHub API access
# CLOUDFLARE_API_TOKEN - for D1/R2 operations
```

See `.env.example` for available options.

## Development

### Working on SIKESRA Features

1. Make changes in protected paths only
2. Run `pnpm validate:boundaries` before committing
3. Test with `pnpm test`

### Adding New Protected Paths

Edit `scripts/awcms-micro-protected-paths.txt` and add the path:

```
# New plugin
awcmsmicro-dev/packages/plugins/my-new-plugin/

# New template
awcmsmicro-dev/templates/my-template/
```

## Backup and Recovery

Sync automatically creates backups in `update-backup/sync/`:

```bash
# List backups
ls update-backup/sync/

# Restore from a specific backup
cp -a update-backup/sync/20260529-120000/awcmsmicro-dev/packages/plugins/awcms-sikesra/ \
       awcmsmicro-dev/packages/plugins/awcms-sikesra/
```

## Related Repositories

- [emdash-cms/emdash](https://github.com/emdash-cms/emdash) - Core CMS
- [ahliweb/awcms-micro](https://github.com/ahliweb/awcms-micro) - AWCMS-Micro base
- [ahliweb/sikesra](https://github.com/ahliweb/sikesra) - This repository

## License

MIT (root) + package-specific licenses for plugins/templates.

See individual package `LICENSE` files for details.
