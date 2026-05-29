# AWCMSMicro Dev Protected Paths

The active protected-path list lives in `scripts/awcms-micro-protected-paths.txt`.

## Current Protected Set

- `awcmsmicro-dev/templates/awcms-sikesraTemplate`
- `awcmsmicro-dev/templates/awcms-sikesraTemplate-cloudflare`
- `awcmsmicro-dev/packages/plugins/awcms-sikesra`
- `awcmsmicro-dev/demos/cloudflare`
- `awcmsmicro-dev/docs/awcms-micro/sikesra`
- `awcmsmicro-dev/e2e/awcms-micro/sikesra`

## Intent

The rebuild process may replace everything else in `awcmsmicro-dev/` when regenerating the downstream workspace from `emdash-latest/`. Only the protected paths are preserved.

See `docs/awcms-micro-implementation-boundaries.md` for the policy and `docs/synchronization-workflow.md` for the rebuild flow.
