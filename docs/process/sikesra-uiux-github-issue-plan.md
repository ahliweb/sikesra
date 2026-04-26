# SIKESRA UI/UX GitHub Issue Plan

## Source Prompt

This document records the implementation result for:

- `prompt_planning_git_hub_issues_sikesra_uiux_prd.md`
- `prompt_planning_git_hub_issues_sikesra_uiux_prd_with_religion_field_guru_agama_lansia_terlantar.md`

Priority PRD reference:

- `prd_ui_ux_sikesra_awcms_mini_detail.md`

Supporting technical reference:

- `prd_mvp_sikesra_awcms_mini_single_tenant_field_kelengkapan.md`

## Repository Analysis Summary

The planning work inspected the upstream `ahliweb/awcms-mini` codebase and identified the following current-state baseline:

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
- Religion/agama master data: not confirmed in repository analysis and now tracked as a dedicated planning/UI issue.
- Lansia Terlantar/vulnerable-person model: not confirmed in repository analysis and now tracked as a dedicated module UI/security issue.

## Milestones

The required milestones were created in `ahliweb/sikesra`:

- `SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, Core Components, and Religion Reference Foundation`
- `SIKESRA UI/UX MVP - Sprint 2: Dashboard and Registry Data`
- `SIKESRA UI/UX MVP - Sprint 3: Module Forms, Religion Fields, and Vulnerable Person Modules`
- `SIKESRA UI/UX MVP - Sprint 4: Code, Documents, and Verification`
- `SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`
- `SIKESRA UI/UX MVP - Hardening: Accessibility, Security UX, Tests, and Documentation`

## Planning And Epic Issues

- ahliweb/sikesra#40: Planning index and repository analysis for MVP implementation.
- ahliweb/sikesra#41: Provision SIKESRA Kobar database, domain, R2 bucket, and environment configuration.

## Sprint 1 Issues

- ahliweb/sikesra#13: Create admin navigation structure for SIKESRA modules including Lansia Terlantar.
- ahliweb/sikesra#14: Build reusable status badges for data, verification, documents, sensitivity, and vulnerable-person states.
- ahliweb/sikesra#15: Build shared form section and wizard components for SIKESRA forms, religion fields, and vulnerable-person warning sections.
- ahliweb/sikesra#16: Build sensitive field display and masking component for identifiers, individual-level religion, and vulnerable-person data.
- ahliweb/sikesra#42: Add religion reference master data planning and reusable Agama select component.

## Sprint 2 Issues

- ahliweb/sikesra#17: Implement SIKESRA dashboard with MVP widgets including Lansia Terlantar aggregate data.
- ahliweb/sikesra#18: Implement registry data list view with filters, religion filter, vulnerable-person filters, and action column.
- ahliweb/sikesra#19: Implement generic detail page pattern for SIKESRA entities with permission-aware religion and Lansia sections.

## Sprint 3 Issues

- ahliweb/sikesra#20: Implement Rumah Ibadah form UI with religion reference support.
- ahliweb/sikesra#21: Implement Lembaga Keagamaan form UI with religion reference support.
- ahliweb/sikesra#22: Implement Lembaga Pendidikan Keagamaan form UI with religion reference support.
- ahliweb/sikesra#23: Implement Lembaga Kesejahteraan Sosial form UI with religion reference and vulnerable-person awareness.
- ahliweb/sikesra#24: Implement Guru Agama form UI with religion reference support. The general module label must not use `Guru Ngaji`.
- ahliweb/sikesra#25: Implement Anak Yatim form UI with child data privacy and religion reference protections.
- ahliweb/sikesra#26: Implement Disabilitas form UI with sensitive data and religion reference protections.
- ahliweb/sikesra#43: Implement Lansia Terlantar form UI with vulnerable-person privacy protections.

## Sprint 4 Issues

- ahliweb/sikesra#27: Implement ID SIKESRA 20-digit UI states and explanation modal.
- ahliweb/sikesra#28: Implement document upload card and document list UI.
- ahliweb/sikesra#29: Implement verification review page and decision workflow UI.
- ahliweb/sikesra#30: Implement need_revision UX with inline verifier notes.

## Sprint 5 Issues

- ahliweb/sikesra#31: Implement Import Excel staging UI with religion and Lansia Terlantar mapping.
- ahliweb/sikesra#32: Implement reports and export UI with sensitive, religion, and vulnerable-person confirmation.
- ahliweb/sikesra#33: Implement official region and custom region UI components.
- ahliweb/sikesra#34: Implement audit log viewer UI for SIKESRA actions.
- ahliweb/sikesra#35: Implement users, roles, permissions, and region scope UI for SIKESRA.

## Hardening Issues

- ahliweb/sikesra#36: Add accessibility and usability checks for SIKESRA admin UI.
- ahliweb/sikesra#37: Add responsive behavior for SIKESRA dashboard, list, detail, and forms.
- ahliweb/sikesra#38: Add UI tests for critical SIKESRA workflows.
- ahliweb/sikesra#39: Write implementation documentation for SIKESRA admin UI/UX.

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

- Start with ahliweb/sikesra#13 through ahliweb/sikesra#16 and religion foundation issue ahliweb/sikesra#42.
- Complete region components in ahliweb/sikesra#33 before most form and ID-generation work.
- Complete ahliweb/sikesra#42 before module forms that need `Agama` fields.
- Complete ahliweb/sikesra#43 before Lansia dashboard, registry, import/export, audit, tests, and docs coverage can be closed.
- Proceed through dashboard, registry, detail, ID, module forms, documents, verification, import/export, audit, access management, and hardening in the dependency order listed in ahliweb/sikesra#40.
- Resolve runtime blocker ahliweb/sikesra#12 before deployment smoke tests for the Cloudflare-hosted Worker.

## Security Notes

- Do not commit `.env`, `.env.local`, `.dev.vars`, database credentials, Cloudflare tokens, Coolify tokens, R2 keys, or private key material.
- Store Worker secrets in Cloudflare-managed secrets.
- Store Coolify-managed resource credentials in Coolify locked runtime secrets when an application resource exists.
- Keep R2 private and expose documents only through permission-aware, audit-friendly application flows.
- Mask NIK/KIA, No KK, individual-level religion, child data, elderly/vulnerable-person data, disability data, health-related notes, and sensitive document details by default in UI.
- Use `Guru Agama` as the neutral general module label. Treat Islam-specific `guru ngaji` context as contextual teaching-place/activity data, not the general module title.

## Migration Correction

The initial planning issues were created in `ahliweb/awcms-mini` by mistake. They have been recreated in `ahliweb/sikesra` and the old issues in `ahliweb/awcms-mini` were closed with moved-to comments. The canonical issue tracker for SIKESRA work is now `https://github.com/ahliweb/sikesra/issues`.
