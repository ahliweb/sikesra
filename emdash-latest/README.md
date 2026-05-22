# awcms-micro-sikesra

`awcms-micro-sikesra` is the SIKESRA implementation workspace built on top of EmDash and aligned to the AWCMS-Micro repository pattern.

## Current Mapping

The long-term target structure from `tmp/prompt-refactor` is a parent repository with sibling `emdash-latest/` and `awcmsmicro-dev/` trees.

This repository currently represents the `awcmsmicro-dev/` role in-place so the existing workspace, tests, and package links keep working during the transition.

Canonical scaffold paths now exist in the repo for the future layout:

- `templates/awcms-micro-sikesra/`
- `templates/awcms-micro-sikesra-cloudflare/`
- `packages/plugins/awcms-micro-sikesra/`
- `demos/awcms-micro-sikesra-cloudflare/`
- `docs/awcms-micro/sikesra/`
- `e2e/awcms-micro/sikesra/`

## SIKESRA Runtime

- Public page: `/sikesra`
- Admin UI: `/_emdash/admin/plugins/sikesra/*`
- Admin API: `/_emdash/api/plugins/sikesra/v1/*`
- Plugin compatibility shim: `packages/plugins/sikesra/`
- Canonical plugin package path: `packages/plugins/awcms-micro-sikesra/`
- Canonical architecture docs: `docs/awcms-micro/sikesra/`

## Main Capabilities

- Progressive wizard input with autosave and validation
- Stable 20-digit `sikesra_id_20`
- Hierarchical verification across village, district, regency, and OPD scopes
- D1-backed metadata plus R2-backed document storage
- Import staging, validation, deduplication, promotion, and export/report flows
- RBAC, ABAC, masking, audit logging, and public-safe aggregation

## Repository Guidance

- Parent-architecture docs: `docs/repository-structure.md`
- Protected path policy: `docs/awcmsmicro-dev-protected-paths.md`
- Implementation boundaries: `docs/awcms-micro-implementation-boundaries.md`
- Divergence tracking: `docs/divergence-log.md`
- Upstream sync notes: `docs/upstream-sync-status.md`

The runtime source of truth is now centered in `packages/plugins/awcms-micro-sikesra/`. The legacy `packages/plugins/sikesra/` package remains as a backward-compatible shim while import sites migrate.

## Validation Scripts

- `pnpm awcmsmicro:validate-boundaries`
- `pnpm awcmsmicro:validate-after-sync`
- `pnpm awcmsmicro:sync-and-validate`

## Existing SIKESRA Product Docs

- [docs/sikesra/README.md](docs/sikesra/README.md)
- [docs/sikesra/01_product_requirements.md](docs/sikesra/01_product_requirements.md)
- [docs/sikesra/02_architecture.md](docs/sikesra/02_architecture.md)
- [docs/sikesra/03_data_model.md](docs/sikesra/03_data_model.md)
- [docs/sikesra/06_security_rbac_abac.md](docs/sikesra/06_security_rbac_abac.md)

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow, test requirements, and repository rules.
