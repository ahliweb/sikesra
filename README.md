# AWCMS-Micro SIKESRA

Independent SIKESRA implementation based on [AWCMS-Micro](https://github.com/ahliweb/awcms-micro), which itself is built on [EmDash](https://github.com/emdash-cms/emdash).

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Sync from upstream (safe, preserves SIKESRA changes)
pnpm sync:upstream

# Preview sync without applying
pnpm sync:dry-run
```

## Architecture

This repository is an **independent downstream fork** of `awcms-micro` with:

- **Safe upstream sync** via `scripts/sync-from-awcms-micro.sh`
- **Protected paths** that preserve SIKESRA-specific code during sync
- **Unique naming** for plugins and templates to avoid conflicts

### Directory Structure

```
sikesra/
├── awcmsmicro-dev/          # Downstream implementation workspace
│   ├── packages/plugins/
│   │   ├── awcms-micro-sikesra/    # SIKESRA plugin (protected)
│   │   └── sikesra/                # Compatibility shim (protected)
│   ├── templates/
│   │   ├── awcms-micro-sikesraTemplate/           # Default template (protected)
│   │   └── awcms-micro-sikesraTemplate-cloudflare/ # Cloudflare template (protected)
│   ├── demos/
│   │   └── awcms-micro-sikesra-cloudflare/        # Demo boundary (protected)
│   └── docs/
│       └── awcms-micro/sikesra/                   # SIKESRA docs (protected)
├── emdash-latest/           # Clean EmDash upstream reference
├── docs/                    # Root governance docs (protected)
├── scripts/                 # Sync and validation scripts (protected)
└── update-backup/           # Automatic sync backups
```

## Upstream Sync Workflow

### How It Works

```
emdash-cms/emdash ──sync──▶ ahliweb/awcms-micro ──sync──▶ ahliweb/sikesra
     (EmDash)              (AWCMS-Micro base)        (SIKESRA custom)
```

1. `awcms-micro` syncs from `emdash-cms/emdash`
2. This repo syncs from `awcms-micro` while preserving SIKESRA paths

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

### Manual Sync

```bash
# Full sync with all options
bash scripts/sync-from-awcms-micro.sh --validate

# Dry run to see what would change
bash scripts/sync-from-awcms-micro.sh --dry-run

# Skip backup (faster, but no rollback)
bash scripts/sync-from-awcms-micro.sh --no-backup
```

## Protected Paths

The following paths are **never overwritten** during upstream sync:

| Path | Purpose |
| --- | --- |
| `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/` | SIKESRA plugin |
| `awcmsmicro-dev/templates/awcms-micro-sikesraTemplate/` | Default template |
| `awcmsmicro-dev/templates/awcms-micro-sikesraTemplate-cloudflare/` | Cloudflare template |
| `awcmsmicro-dev/demos/awcms-micro-sikesra-cloudflare/` | Demo boundary |
| `awcmsmicro-dev/docs/awcms-micro/sikesra/` | SIKESRA docs |
| `awcmsmicro-dev/e2e/awcms-micro/sikesra/` | E2E tests |
| `awcmsmicro-dev/packages/plugins/sikesra/` | Compatibility shim |
| `docs/` | Root governance |
| `scripts/` | Sync scripts |

Full list: `scripts/awcms-micro-protected-paths.txt`

## Naming Convention

To avoid conflicts with upstream:

| Upstream Name | This Repo Name |
| --- | --- |
| `awcms-micro-default` | `awcms-micro-sikesraTemplate` |
| `awcms-micro-default-cloudflare` | `awcms-micro-sikesraTemplate-cloudflare` |
| `@ahliweb/awcms-micro-sikesra` | `@ahliweb/awcms-micro-sikesra` (unique) |

**Rule:** Always use `sikesra` or `sikesraTemplate` suffix for new plugins/templates.

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
cp -a update-backup/sync/20260529-120000/awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/ \
       awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/
```

## Troubleshooting

### Sync Conflicts

If sync has conflicts:

1. Review conflicted files: `git diff`
2. Resolve manually, then `git add <file>`
3. Protected paths are auto-restored
4. Commit when ready: `git commit`

### Missing Protected Paths

```bash
# Check what's missing
pnpm validate:boundaries

# Restore from latest backup
ls update-backup/sync/
```

### Reset to Upstream

```bash
# WARNING: This removes all SIKESRA changes
git reset --hard awcms-micro/main
```

## Related Repositories

- [emdash-cms/emdash](https://github.com/emdash-cms/emdash) - Core CMS
- [ahliweb/awcms-micro](https://github.com/ahliweb/awcms-micro) - AWCMS-Micro base
- [ahliweb/sikesra](https://github.com/ahliweb/sikesra) - This repository

## License

MIT (root) + package-specific licenses for plugins/templates.

See individual package `LICENSE` files for details.
