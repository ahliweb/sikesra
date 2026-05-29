# Upstream Sync Status

## Baseline

- Upstream source of truth: `https://github.com/emdash-cms/emdash`
- Local upstream mirror: `emdash-latest/`
- Local downstream workspace: `awcmsmicro-dev/`

## Current State

- The repository is arranged as a parent maintenance workspace.
- Downstream SIKESRA paths are preserved through the protected-path policy.
- The canonical non-Cloudflare template path is `awcmsmicro-dev/templates/awcms-sikesraTemplate/`.
- The canonical Cloudflare template path is `awcmsmicro-dev/templates/awcms-sikesraTemplate-cloudflare/`.

## Update Procedure

1. Run `bash scripts/update-emdash-latest.sh`.
2. Run `bash scripts/update-awcmsmicro-dev.sh`.
3. Run `bash scripts/validate-after-sync.sh`.
4. Record any divergence in `docs/divergence-log.md`.
