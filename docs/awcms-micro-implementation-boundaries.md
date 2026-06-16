# AWCMS-Micro Implementation Boundaries

The following paths are approved for downstream AWCMS-Micro and SIKESRA-specific implementation (verified against the actual filesystem and `.github/workflows/deploy-sikesra.yml`, June 2026):

- `awcmsmicro-dev/templates/awcms-sikesraTemplate/`
- `awcmsmicro-dev/templates/awcms-sikesraTemplate-cloudflare/`
- `awcmsmicro-dev/packages/plugins/awcms-sikesra/`
- `awcmsmicro-dev/demos/cloudflare/`
- `docs/prd/` (canonical SIKESRA product/technical documentation)

Changes outside these boundaries should be treated as upstream synchronization work and require explicit review.

> **Note (June 2026):** Earlier versions of this file listed `awcms-micro-sikesraTemplate`, `awcms-micro-sikesraTemplate-cloudflare`, `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/`, `awcmsmicro-dev/demos/awcms-micro-sikesra-cloudflare/`, `awcmsmicro-dev/docs/awcms-micro/sikesra/`, and `awcmsmicro-dev/e2e/awcms-micro/sikesra/`. None of these paths match the real implementation — they described a renaming plan that was never completed (see `docs/prd/03.PLUGIN_ARCHITECTURE.md` §8a for the three-generation naming history). The list above reflects what's actually approved and in use today.

## Root-Level Exceptions

The root `docs/` and `scripts/` directories may change when needed to support parent-workspace synchronization, validation, versioning, and operator workflow.

## Non-Goals

- Do not introduce new shared core layers outside `awcmsmicro-dev/`.
- Do not treat this parent repository as a runtime product shell.
- Do not create a separate `emdash/` checkout or place SIKESRA-specific product logic in `emdash-latest/`.
