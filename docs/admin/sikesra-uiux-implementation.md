# SIKESRA UI/UX Implementation Reference

This document describes the current implemented SIKESRA admin UI/UX model layer in `awcms-mini-sikesra`.

The current repository state is EmDash-first and Cloudflare Worker-hosted, with PostgreSQL on a Coolify-managed VPS. The live runtime integration seam is still tracked separately; this document focuses on the implemented model layer and the operational/security expectations around it.

## Priority References

- PRD UI/UX SIKESRA AWCMS Mini: `prd_ui_ux_sikesra_awcms_mini_detail.md`
- Technical PRD: `prd_mvp_sikesra_awcms_mini_single_tenant_field_kelengkapan.md`
- GitHub issue tracker: `ahliweb/sikesra`

## Route Structure

The route/menu structure is defined in `src/plugins/sikesra-admin/index.mjs`.

- `/` - Dashboard SIKESRA
- `/registry`
- `/registry/anak-yatim`
- `/registry/disabilitas`
- `/registry/lansia-terlantar`
- `/registry/guru-agama`
- `/verification`
- `/documents`
- `/imports`
- `/reports`
- `/references`
- `/audit`
- `/access`
- `/settings`

These are represented in the repository as plugin metadata and model-layer route placeholders. The full EmDash Worker build replacement has already been completed in `ahliweb/sikesra#44`, while this repository continues to document the reviewed host-registration seam for future host-build maintenance.

## Reusable Components And Models

The current implementation surface is framework-neutral model code under `src/plugins/sikesra-admin/`.

### Core plugin and shared metadata

- `index.mjs` - plugin descriptor, permissions, menu/page metadata
- `host-registration.mjs` - EmDash host registration seam
- `status-badges.mjs` - badge definitions with accessible Indonesian labels
- `sensitive-fields.mjs` - masking/reveal model for sensitive values
- `form-wizard.mjs` - shared form sections, progress, inline validation
- `religion-reference.mjs` - controlled Agama reference UI contract

### Dashboard, registry, detail, and forms

- `dashboard-widgets.mjs` - dashboard cards, distributions, activity, role visibility
- `registry-list.mjs` - list columns, filters, row actions, empty/loading/error states
- `detail-page.mjs` - detail tabs, header, actions, sensitive field handling
- `id-sikesra.mjs` - 20-digit ID model, states, explanation modal
- `region-model.mjs` - official/custom region and scope-constrained selection
- `module-forms.mjs` - module form models for Rumah Ibadah, Lembaga Keagamaan, Lembaga Pendidikan Keagamaan, LKS, Guru Agama, Anak Yatim, Disabilitas, Lansia Terlantar

### Documents, verification, import, export, governance, and quality

- `review-workflows.mjs` - document upload/list, verification, need_revision UX
- `import-export-workflows.mjs` - import staging and reports/export models
- `governance-workflows.mjs` - audit log viewer and access-management models
- `quality-ux.mjs` - accessibility/usability and responsive behavior models

## Sensitive Data Masking Policy

Sensitive data must remain masked by default unless an explicit permission allows reveal and the relevant UI flow supports it.

Current masking rules are implemented through `sensitive-fields.mjs` and reused by other models.

- NIK, KIA, No. KK, contact numbers, document numbers, health/disability notes, religion, and vulnerable-person names are treated as sensitive fields.
- Highly sensitive modules such as Anak Yatim, Disabilitas, and Lansia Terlantar default to `highly_restricted` classifications for key fields.
- Audit log before/after changes are masked unless `sikesra.audit.sensitive.read` is granted.
- Responsive transformations must not bypass masking or create alternate unmasked render paths.
- Import staging rows must not expose religion or vulnerable-person values without explicit permissions.

The implemented model layer does not contain real NIK/KIA or real personal data examples.

## Workflow States

### Verification workflow

Implemented states and decisions reflect the PRD:

- `draft`
- `submitted`
- `under_review`
- `need_revision`
- `verified`
- `rejected`

Decision behavior currently modeled:

- `verified` requires explicit confirmation
- `need_revision` requires note, field/section reference, and priority
- `rejected` requires reason

### Document workflow

Implemented upload/list states:

- `idle`
- `queued`
- `uploading`
- `uploaded`
- `failed`
- `superseded`

Restricted document handling currently modeled:

- `Kartu Keluarga` is treated as highly restricted
- preview is permission-aware
- replacement marks prior document as superseded

### Import workflow

Implemented import staging steps:

- `upload_excel`
- `select_sheet`
- `map_columns`
- `validate_rows`
- `review_staging`
- `promote_master`

Implemented staging row statuses:

- `valid`
- `invalid`
- `needs_review`
- `promoted`

Promotion is blocked when invalid rows remain.

### Export workflow

Implemented report/export behavior distinguishes:

- aggregate/public-safe reports
- sensitive reports requiring permission and confirmation

Viewer-safe behavior is currently modeled so viewer-only users receive aggregate/public-safe reports only.

## Import, Export, And Verification Flows

### Import

Import is staging-first. The current model layer explicitly prevents direct bypass of staging.

Security expectations:

- import actions must be permission-aware
- staging values remain masked where applicable
- promotion must be audit-logged
- region and controlled religion mapping must be preserved

Related issues:

- `#31` import staging UI
- `#49` controlled religion reference backend
- `#75` workbook field/PRD sync for Tokoh Agama data evidence
- `#76` Tokoh Agama staging and canonical field-mapping planning

Related planning doc:

- `../process/sikesra-tokoh-agama-excel-field-sync-2026.md`
- `../process/sikesra-tokoh-agama-import-staging-plan.md`

### Verification

Verification remains audit-friendly and permission-aware.

Security expectations:

- region scope must be respected
- sensitive values remain masked unless allowed
- `need_revision`, `verified`, and `rejected` decisions must be justified and auditable

Related issues:

- `#29` verification review UI
- `#30` need_revision UX

### Export

Export actions are modeled for audit readiness and least privilege.

Security expectations:

- sensitive export requires explicit permission and confirmation
- aggregate religion reports remain allowed without detailed sensitive export permission
- no real sample personal data should appear in docs, tests, or examples
- backend religion-sensitive export/report handling should default to aggregate-only scope unless `sikesra.reports.sensitive_export` is present

Related issues:

- `#32` reports and export UI

## Role And Permission Visibility

The current plugin permissions are defined in `src/plugins/sikesra-admin/index.mjs` and rendered into governance/access-management models through `governance-workflows.mjs`.

Key expectations:

- audit UI requires `sikesra.audit.read`
- access management UI requires `sikesra.access.manage`
- protected roles should not be assignable unless current admin authority explicitly allows it
- sensitive roles should surface 2FA requirements and warnings
- region scope assignment must be constrained by current admin authority

Related docs:

- `../governance/permission-matrix.md`
- `../governance/roles.md`
- `../governance/regions.md`
- `../governance/auth-and-authorization.md`

## Text Wireframes

Screenshots are not included because the live integrated UI is not yet the reviewed source of truth in this repository. The following text wireframes describe the intended operator-facing structures.

### Dashboard

```text
[Sidebar] [Header]

[Stat Card] [Stat Card] [Stat Card] [Stat Card]
[Verification Distribution]
[Region Recap]
[Attention Summary]
[Recent Activity]
```

### Registry List

```text
[Filters]
[Search]

| ID SIKESRA | Nama | Modul | Wilayah | Status | Verifikasi | Dokumen | Aksi |
|------------|------|-------|---------|--------|------------|---------|------|
```

### Module Form

```text
[ID SIKESRA State]
[Wizard Progress]

[Kode dan Kategori]
[Wilayah dan Alamat]
[Identitas Utama]
[Detail Khusus Modul]
[Personil Terkait]
[Dokumen]
[Status dan Catatan]
[Ringkasan Sebelum Submit]
```

### Verification Review

```text
[Summary]
[Last Changes]
[Completeness]
[Region Validation]
[Petugas Notes]
[Verifier Notes]
[Verifikasi] [Butuh Perbaikan] [Tolak]
```

### Audit Log

```text
[Filters]

| Waktu | Pengguna | Peran | Modul | Entitas | Aksi | Ringkasan | IP | Perangkat | Detail |
```

## Test Command

The current CI-compatible local validation command is:

```bash
pnpm check
```

This runs:

- secret hygiene scanning
- unit tests under `tests/unit/*.test.mjs`

## Related GitHub Issues

- `#17` dashboard
- `#18` registry list
- `#19` detail pattern
- `#20`–`#27`, `#33`, `#43` forms, ID, and region models
- `#28`–`#32` documents, verification, import, and export models
- `#34` audit log viewer
- `#35` access management
- `#36` accessibility/usability hardening
- `#37` responsive behavior
- `#38` UI hardening tests
- `#49` controlled religion reference backend

## Current Caveats

- The implemented repository state is still primarily model-layer code, but the reviewed live runtime now serves the EmDash admin shell through the deployed Worker baseline documented in `#44`.
- Backend data services for some flows remain tracked as `backend-needed`, especially `#49`.
- Coolify/Cloudflare operator-side runtime configuration remains an operator seam; repository docs should describe the posture, not pretend that secrets were changed automatically.
