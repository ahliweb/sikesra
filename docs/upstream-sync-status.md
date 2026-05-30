# Upstream Sync Status

## Baseline

- Upstream source of truth: `https://github.com/ahliweb/awcms-micro`
- Local EmDash baseline: `emdash-latest/`
- Local downstream workspace: `awcmsmicro-dev/`

## Current State

- The repository is arranged as a parent maintenance workspace.
- Downstream SIKESRA paths are preserved through the protected-path policy.
- The canonical non-Cloudflare template path is `awcmsmicro-dev/templates/awcms-sikesraTemplate/`.
- The canonical Cloudflare template path is `awcmsmicro-dev/templates/awcms-sikesraTemplate-cloudflare/`.

## Update Procedure

1. Run `bash scripts/sync-from-awcms-micro.sh`.
2. Run `bash scripts/validate-after-sync.sh`.
3. Record any divergence in `docs/divergence-log.md`.
