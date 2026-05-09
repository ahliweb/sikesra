# Core Architectural Documentation

This directory contains the 15-part foundational documentation series for **AWCMS-Micro**. These documents define the architectural authority, governance standards, and implementation roadmap for the platform, ensuring full compatibility with the **EmDash CMS** upstream.

This repository is the self-contained SIKESRA deployment, not the generic reusable AWCMS-Micro scaffold. Read [`SIKESRA_INTEGRATION_OVERLAY.md`](SIKESRA_INTEGRATION_OVERLAY.md) before applying any generic core doc to this repository.

## Documentation Index

| Part | Topic | Description |
| ---- | ----- | ----------- |
| [Part 1](awcms_micro_emdash_compatibility_docs_part_1.md) | Architecture & Governance | Core compatibility rules and the master architectural authority. |
| [Part 2](awcms_micro_emdash_compatibility_docs_part_2.md) | Repo & Operations | Monorepo strategy, local development, and CI/CD operations. |
| [Part 3](awcms_micro_emdash_compatibility_docs_part_3.md) | DB & Storage | D1/R2 storage discipline, multi-tenancy, and soft delete policies. |
| [Part 4](awcms_micro_emdash_compatibility_docs_part_4.md) | Plugin System | EmDash `definePlugin()` API and module isolation standards. |
| [Part 5](awcms_micro_emdash_compatibility_docs_part_5.md) | ABAC System | Attribute-Based Access Control and numeric role level definitions. |
| [Part 6](awcms_micro_emdash_compatibility_docs_part_6.md) | Frontend & Admin | Astro 6+ frontend, Kumo admin UI, and theme system. |
| [Part 7](awcms_micro_emdash_compatibility_docs_part_7.md) | Security & Testing | Passkey-first auth, vitest/Playwright, and compliance standards. |
| [Part 8](awcms_micro_emdash_compatibility_docs_part_8.md) | Cloudflare Runbook | Deployment strategy for Workers, D1, R2, and KV. |
| [Part 9](awcms_micro_emdash_compatibility_docs_part_9.md) | MVP Sprint Plan | Implementation backlog and GitHub issue master list. |
| [Part 10](awcms_micro_emdash_compatibility_docs_part_10.md) | Website Template | Standard website content models and Portable Text specs. |
| [Part 11](awcms_micro_emdash_compatibility_docs_part_11.md) | School Module | Specialized school template and Kelulusan module details. |
| [Part 12](awcms_micro_emdash_compatibility_docs_part_12.md) | Mobile API SDK | API boundary definitions and Flutter client integration. |
| [Part 13](awcms_micro_emdash_compatibility_docs_part_13.md) | ERP-Ready Strategy | Business logic isolation for future ERP expansion. |
| [Part 14](awcms_micro_emdash_compatibility_docs_part_14.md) | Upstream Sync | Playbook for maintaining compatibility with EmDash /llms.txt. |
| [Part 15](awcms_micro_emdash_compatibility_docs_part_15.md) | Master Index | Final roadmap, repository structure, and definition of done. |
| [SIKESRA Overlay](SIKESRA_INTEGRATION_OVERLAY.md) | Repository Integration | Maps all 15 core parts to the current SIKESRA hybrid worker, bindings, routes, build/deploy, and validation rules. |

## Usage

These documents should be referenced by AI agents and developers during the implementation phase to ensure every module remains compliant with the project's technical debt avoidance and governance goals.

For this repository, the overlay is the first stop for resolving differences between generic examples such as `packages/plugins/*`, `pnpm`, scaffold Wrangler files, or standard admin grouping and the current SIKESRA implementation under `src/`, `scripts/worker-wrapper-template.mjs`, `scripts/postbuild.mjs`, and `npm` scripts.

---
## AWCMS-Micro — Core Engineering Standards
