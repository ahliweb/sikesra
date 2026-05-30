# Operator Workflow

## Routine Maintenance

1. Rebuild `awcmsmicro-dev/` from `ahliweb/awcms-micro`.
2. Validate downstream boundaries.
3. Review protected paths for accidental drift.
4. Update sync status and divergence notes.

## Primary Commands

- `pnpm awcmsmicro:update-awcmsmicro-dev`
- `pnpm awcmsmicro:validate-boundaries`
- `pnpm awcmsmicro:validate-after-sync`
- `pnpm awcmsmicro:sync-and-validate`
