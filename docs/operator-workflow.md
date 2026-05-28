# Operator Workflow

## Routine Maintenance

1. Sync upstream into `emdash-latest/`.
2. Rebuild `awcmsmicro-dev/`.
3. Validate downstream boundaries.
4. Review protected paths for accidental drift.
5. Update sync status and divergence notes.

## Primary Commands

- `pnpm awcmsmicro:update-emdash-latest`
- `pnpm awcmsmicro:update-awcmsmicro-dev`
- `pnpm awcmsmicro:validate-boundaries`
- `pnpm awcmsmicro:validate-after-sync`
- `pnpm awcmsmicro:sync-and-validate`
