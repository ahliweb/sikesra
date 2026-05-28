# AWCMS-Micro SIKESRA Parent Repository

This repository is the parent maintenance workspace for keeping the SIKESRA-flavored AWCMS-Micro implementation aligned with the latest EmDash source.

## Purpose

Analyze `https://github.com/emdash-cms/emdash`, then update this repository so the checked-in `awcmsmicro-dev/` implementation stays synchronized with upstream while preserving only approved AWCMS-Micro and SIKESRA boundaries.

This repository follows the same parent-workspace model as `https://github.com/ahliweb/awcms-micro`:

- `emdash-latest/` is the clean upstream reference tree.
- `awcmsmicro-dev/` is the active downstream implementation workspace.
- root `docs/` and `scripts/` govern synchronization, boundaries, and operations.

AWCMS-Micro-specific product development in this workspace stays limited to plugin, template, demo, docs, and test boundaries. New core CMS behavior must not be introduced through EmDash forks unless the divergence is explicitly recorded.

## Versioning Model

This workspace keeps separate maintenance surfaces:

- root maintenance metadata and governance docs
- plugin packages under `awcmsmicro-dev/packages/plugins/`
- template packages under `awcmsmicro-dev/templates/`

Keep root maintenance changes separate from plugin or template release notes.

## Root Structure

- `emdash-latest/`: latest synchronized snapshot of upstream EmDash
- `awcmsmicro-dev/`: active AWCMS-Micro implementation workspace derived from `emdash-latest/`
- `docs/`: root technical documentation for structure, sync workflow, and implementation rules
- `scripts/`: maintenance scripts for refreshing `emdash-latest/`, rebuilding `awcmsmicro-dev/`, and validating downstream boundaries

## Repository Rules

- Keep `emdash-latest/` as the clean upstream reference tree.
- Rebuild `awcmsmicro-dev/` from `emdash-latest/` before downstream implementation work.
- Keep SIKESRA behavior inside approved plugin and template boundaries.
- Keep root documentation synchronized with the actual folder layout and workflow.
- Prefer small, atomic maintenance changes over broad unreviewed rewrites.

## Official Language

English (US) is the canonical language for root governance documentation, repository workflow instructions, and maintenance scripts, following the upstream `awcms-micro` convention.

## Core Documentation

- `docs/README.md`
- `docs/repository-structure.md`
- `docs/synchronization-workflow.md`
- `docs/implementation-instructions.md`
- `docs/awcms-micro-implementation-boundaries.md`
- `docs/repository-assessment.md`
- `docs/decision-records.md`
- `docs/operator-workflow.md`
- `docs/awcms-micro-prd.md`
- `docs/awcms-micro-versioning.md`
- `docs/awcms-micro-root-versioning.md`
- `docs/awcms-micro-versioning-rollout-summary.md`
- `docs/awcms-micro-licensing.md`
- `docs/awcms-micro-d1-mirror-sync.md`
- `docs/upstream-sync/README.md`
- `docs/upstream-sync/ISSUE_CLASSIFICATION_DOWNSTREAM_VS_UPSTREAM.md`
- `docs/upstream-sync/UPSTREAM_PR_PLAN_ADMIN_SIDEBAR_ORDERING.md`
- `docs/deployment/cloudflare.md`
- `docs/security/security-baseline.md`

## Maintenance Scripts

- `bash scripts/update-emdash-latest.sh`
- `bash scripts/update-awcmsmicro-dev.sh`
- `bash scripts/validate-awcmsmicro-boundaries.sh`
- `bash scripts/validate-after-sync.sh`
- `bash scripts/sync-and-validate.sh`

## AWCMS-Micro Example Additions

- Example template: `awcmsmicro-dev/templates/awcms-micro-sikesraTemplate/`
- Example Cloudflare template: `awcmsmicro-dev/templates/awcms-micro-sikesraTemplate-cloudflare/`
- Example plugin: `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/`
- Reserved Cloudflare demo boundary: `awcmsmicro-dev/demos/awcms-micro-sikesra-cloudflare/`
- Reserved docs boundary: `awcmsmicro-dev/docs/awcms-micro/sikesra/`
- Reserved E2E boundary: `awcmsmicro-dev/e2e/awcms-micro/sikesra/`
- Approved implementation boundaries: `docs/awcms-micro-implementation-boundaries.md`
- Protected implementation boundary list: `scripts/awcmsmicro-dev-protected-paths.txt`
- Upstream sync tracking: `docs/upstream-sync/`
- Deployment guidance: `docs/deployment/`
- Security baselines: `docs/security/`

## SIKESRA Runtime

- Public page: `/sikesra`
- Admin UI: `/_emdash/admin/plugins/sikesra/*`
- Admin API: `/_emdash/api/plugins/sikesra/v1/*`
- Compatibility shim: `awcmsmicro-dev/packages/plugins/sikesra/`
- Canonical plugin package path: `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/`

## Standard Workflow

1. Refresh `emdash-latest/` from upstream EmDash.
2. Rebuild `awcmsmicro-dev/` from `emdash-latest/`.
3. Validate boundaries and downstream health.
4. Implement SIKESRA-specific changes only inside approved boundaries.
5. Update root docs whenever structure or workflow changes.

## Existing SIKESRA Product Docs

- [docs/sikesra/README.md](docs/sikesra/README.md)
- [docs/sikesra/01_product_requirements.md](docs/sikesra/01_product_requirements.md)
- [docs/sikesra/02_architecture.md](docs/sikesra/02_architecture.md)
- [docs/sikesra/03_data_model.md](docs/sikesra/03_data_model.md)
- [docs/sikesra/06_security_rbac_abac.md](docs/sikesra/06_security_rbac_abac.md)

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for contributor workflow and [docs/README.md](docs/README.md) for parent-repository governance docs.
