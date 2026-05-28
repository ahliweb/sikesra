# AWCMS-Micro Implementation Boundaries

The following paths are approved for downstream AWCMS-Micro and SIKESRA-specific implementation:

- `awcmsmicro-dev/templates/awcms-micro-sikesraTemplate/`
- `awcmsmicro-dev/templates/awcms-micro-sikesraTemplate-cloudflare/`
- `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/`
- `awcmsmicro-dev/demos/awcms-micro-sikesra-cloudflare/`
- `awcmsmicro-dev/docs/awcms-micro/sikesra/`
- `awcmsmicro-dev/e2e/awcms-micro/sikesra/`

Changes outside these boundaries should be treated as upstream synchronization work and require explicit review.

## Root-Level Exceptions

The root `docs/` and `scripts/` directories may change when needed to support parent-workspace synchronization, validation, versioning, and operator workflow.

## Non-Goals

- Do not introduce new shared core layers outside `awcmsmicro-dev/`.
- Do not treat this parent repository as a runtime product shell.
- Do not place SIKESRA-specific product logic in `emdash-latest/`.
