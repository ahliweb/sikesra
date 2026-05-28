# Synchronization Workflow

This repository follows the `awcms-micro` parent-workspace synchronization model.

## Steps

1. Refresh `emdash-latest/` from upstream EmDash.
2. Rebuild `awcmsmicro-dev/` from `emdash-latest/`.
3. Preserve only approved protected paths.
4. Validate the rebuilt downstream workspace.
5. Record any downstream-only divergence.

## Commands

- `bash scripts/update-emdash-latest.sh`
- `bash scripts/update-awcmsmicro-dev.sh`
- `bash scripts/validate-after-sync.sh`
- `pnpm awcmsmicro:sync-and-validate`

## Protected Downstream Paths

The protected path inventory is defined in `scripts/awcmsmicro-dev-protected-paths.txt`.

## Documentation Updates

When structure, preserved paths, or operator workflow changes, update root docs in the same change.
