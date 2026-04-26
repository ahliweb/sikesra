# SIKESRA UI/UX GitHub Issue Plan

## Source Prompt

This document records the implementation result for `prompt_planning_git_hub_issues_sikesra_uiux_prd.md`.

Priority PRD reference:

- `prd_ui_ux_sikesra_awcms_mini_detail.md`

Supporting technical reference:

- `prd_mvp_sikesra_awcms_mini_single_tenant_field_kelengkapan.md`

## Repository Analysis Summary

The planning work inspected the upstream `ahliweb/awcms-mini` repository and identified the following current-state baseline:

- Admin layout: no separate standalone SIKESRA admin shell; AWCMS Mini is EmDash-first through `/_emdash/` and plugin admin surfaces.
- Route structure: Astro pages, API routes, and EmDash auth middleware exist.
- UI component patterns: admin UI is plugin/TSX-centric; no broad shared SIKESRA UI component library exists yet.
- Authentication/session: present through Mini auth handlers, session services, and security flows.
- RBAC/ABAC: present through authorization, RBAC, permissions, region, route authorization, service authorization, and region-awareness helpers.
- Database/migrations: present under `src/db` using numbered Kysely migrations.
- Kysely: present and central for PostgreSQL access.
- File upload/storage: R2 storage service exists; SIKESRA document metadata, upload route, and admin document UI remain planned work.
- Audit log: present through migration, repository, service, and plugin helper.
- Tests: unit tests and package scripts exist; CI workflow visibility was unclear during planning.
- Documentation: docs-first conventions exist under `docs/` and related top-level documentation.

## Milestones

The required milestones were created in `ahliweb/awcms-mini`:

- `SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, and Core Components`
- `SIKESRA UI/UX MVP - Sprint 2: Dashboard and Registry Data`
- `SIKESRA UI/UX MVP - Sprint 3: Module Forms`
- `SIKESRA UI/UX MVP - Sprint 4: Code, Documents, and Verification`
- `SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`
- `SIKESRA UI/UX MVP - Hardening: Accessibility, Security UX, Tests, and Documentation`

## Planning And Epic Issues

- ahliweb/awcms-mini#242: Planning index and repository analysis for MVP implementation.
- ahliweb/awcms-mini#243: Provision SIKESRA Kobar database, domain, R2 bucket, and environment configuration.

## Sprint 1 Issues

- ahliweb/awcms-mini#215: Create admin navigation structure for SIKESRA modules.
- ahliweb/awcms-mini#216: Build reusable status badges for data, verification, documents, and sensitivity.
- ahliweb/awcms-mini#217: Build shared form section and wizard components for SIKESRA forms.
- ahliweb/awcms-mini#218: Build sensitive field display and masking component.

## Sprint 2 Issues

- ahliweb/awcms-mini#219: Implement SIKESRA dashboard with MVP widgets.
- ahliweb/awcms-mini#220: Implement registry data list view with filters and action column.
- ahliweb/awcms-mini#221: Implement generic detail page pattern for SIKESRA entities.

## Sprint 3 Issues

- ahliweb/awcms-mini#222: Implement Rumah Ibadah form UI based on PRD field sections.
- ahliweb/awcms-mini#223: Implement Lembaga Keagamaan form UI.
- ahliweb/awcms-mini#224: Implement Lembaga Pendidikan Keagamaan form UI.
- ahliweb/awcms-mini#225: Implement Lembaga Kesejahteraan Sosial form UI.
- ahliweb/awcms-mini#226: Implement Guru Agama/Guru Ngaji form UI.
- ahliweb/awcms-mini#227: Implement Anak Yatim form UI with child data privacy protections.
- ahliweb/awcms-mini#228: Implement Disabilitas form UI with sensitive data protections.

## Sprint 4 Issues

- ahliweb/awcms-mini#229: Implement ID SIKESRA 20-digit UI states and explanation modal.
- ahliweb/awcms-mini#230: Implement document upload card and document list UI.
- ahliweb/awcms-mini#231: Implement verification review page and decision workflow UI.
- ahliweb/awcms-mini#232: Implement need_revision UX with inline verifier notes.

## Sprint 5 Issues

- ahliweb/awcms-mini#233: Implement Import Excel staging UI with mapping and validation review.
- ahliweb/awcms-mini#234: Implement reports and export UI with sensitive data confirmation.
- ahliweb/awcms-mini#235: Implement official region and custom region UI components.
- ahliweb/awcms-mini#236: Implement audit log viewer UI for SIKESRA actions.
- ahliweb/awcms-mini#237: Implement users, roles, permissions, and region scope UI for SIKESRA.

## Hardening Issues

- ahliweb/awcms-mini#238: Add accessibility and usability checks for SIKESRA admin UI.
- ahliweb/awcms-mini#239: Add responsive behavior for SIKESRA dashboard, list, detail, and forms.
- ahliweb/awcms-mini#240: Add UI tests for critical SIKESRA workflows.
- ahliweb/awcms-mini#241: Write implementation documentation for SIKESRA admin UI/UX.

## Environment And Runtime Follow-Up Issues

The prompt was extended with deployment/runtime work for the separate `ahliweb/sikesra` project:

- ahliweb/sikesra#10: Provision Coolify database and locked runtime secrets.
- ahliweb/sikesra#11: Configure Cloudflare Worker runtime, domain, secrets, and R2 binding.
- ahliweb/sikesra#12: Create Hyperdrive binding for `sikesrakobar` PostgreSQL.

## Current Runtime Status

- Coolify managed PostgreSQL resource `sikesrakobar-postgres` was created.
- Database name is `sikesrakobar`.
- Application database user is `sikesrakobar_app`.
- Coolify reports the PostgreSQL resource as `running:healthy` and `is_public=false`.
- R2 bucket `sikesra` was verified through Cloudflare MCP using a non-sensitive write/read/delete smoke object.
- `wrangler.jsonc` exists for Worker `sikesra-kobar`, domain `sikesrakobar.ahlikoding.com`, R2 binding `MEDIA_BUCKET`, and the required AWCMS Mini Worker secret contract.
- Deployment remains blocked until the SIKESRA-specific Hyperdrive ID replaces `REPLACE_WITH_SIKESRA_HYPERDRIVE_ID`.

## Recommended Dependency Order

- Start with ahliweb/awcms-mini#215 through ahliweb/awcms-mini#218.
- Complete region components in ahliweb/awcms-mini#235 before most form and ID-generation work.
- Proceed through dashboard, registry, detail, ID, module forms, documents, verification, import/export, audit, access management, and hardening in the dependency order listed in ahliweb/awcms-mini#242.
- Resolve runtime blocker ahliweb/sikesra#12 before deployment smoke tests for the Cloudflare-hosted Worker.

## Security Notes

- Do not commit `.env`, `.env.local`, `.dev.vars`, database credentials, Cloudflare tokens, Coolify tokens, R2 keys, or private key material.
- Store Worker secrets in Cloudflare-managed secrets.
- Store Coolify-managed resource credentials in Coolify locked runtime secrets when an application resource exists.
- Keep R2 private and expose documents only through permission-aware, audit-friendly application flows.
- Mask NIK/KIA, child data, disability data, and sensitive document details by default in UI.
