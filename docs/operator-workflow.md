# Operator Workflow

## Routine Maintenance

1. Run `pnpm sync:upstream` to refresh the `awcms-micro` cache and rebuild `awcmsmicro-dev/`.
2. Validate downstream boundaries.
3. Review protected paths for accidental drift.
4. Update sync status and divergence notes.

## Primary Commands

- `pnpm sync:upstream`
- `pnpm awcmsmicro:validate-boundaries`
- `pnpm awcmsmicro:validate-after-sync`
- `pnpm awcmsmicro:sync-and-validate`
