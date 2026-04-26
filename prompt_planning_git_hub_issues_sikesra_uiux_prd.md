Act as a senior product manager, system analyst, UI/UX architect, full-stack engineer, security engineer, and GitHub issue planner for the SIKESRA application built on AWCMS Mini.

You are working in the repository:

`https://github.com/ahliweb/awcms-mini`

Your task is to analyze the provided Markdown PRD titled:

`PRD Khusus UI/UX SIKESRA Berbasis AWCMS Mini Single-Tenant`

Then create a complete planning breakdown and GitHub Issues for implementing the UI/UX MVP of SIKESRA.

SIKESRA is a single-tenant government-ready application based on AWCMS Mini for managing, validating, monitoring, reporting, and mapping social, religious, educational religious, and welfare-related data. It uses PostgreSQL, Kysely, RBAC/ABAC, audit logs, Cloudflare-compatible deployment, and Cloudflare R2 or compatible object storage for documents.

Prioritize the UI/UX implementation based on the PRD. The main UI/UX scope includes:

1. Admin layout and navigation.
2. Dashboard SIKESRA.
3. Registry data list and detail pattern.
4. Form pattern per module.
5. ID SIKESRA 20-digit UI.
6. Rumah Ibadah UI.
7. Lembaga Keagamaan UI.
8. Lembaga Pendidikan Keagamaan UI.
9. Lembaga Kesejahteraan Sosial UI.
10. Guru Agama/Guru Ngaji UI.
11. Anak Yatim UI with sensitive data protection.
12. Disabilitas UI with sensitive data protection.
13. Dokumen Pendukung and file upload UI.
14. Verification workflow UI.
15. Import Excel staging UI.
16. Reports and export UI.
17. Official region and custom region UI.
18. Audit log UI.
19. Users, roles, permissions, region scope, and ABAC UI.
20. Accessibility, responsiveness, and usability testing.
21. Security and privacy UX, especially for NIK/KIA, child data, disability data, and document access.

Read the PRD carefully and convert it into implementable GitHub Issues with clear epics, milestones, labels, dependencies, acceptance criteria, and checklists.

Do not implement code immediately unless explicitly instructed later. Start with planning, issue design, and GitHub issue creation.

---

## Required Output

Create a planning document and GitHub Issues using the structure below.

### 1. Repository Analysis

First inspect the current repository structure and identify:

- existing admin layout files;
- existing route structure;
- existing UI component patterns;
- existing authentication/session implementation;
- existing RBAC/ABAC implementation;
- existing database/migration structure;
- existing Kysely usage;
- existing file upload/storage implementation;
- existing audit log implementation;
- existing tests and CI scripts;
- existing documentation conventions.

If a feature does not yet exist, mark it as `missing` and create an issue for it.

### 2. Planning Principles

Use these principles for planning:

- simple-first-scalable-later;
- secure-by-default;
- UI follows PRD, not assumptions;
- database-first and service-layer-aware;
- all sensitive data must be protected in UI;
- all important actions must be audit-friendly;
- all workflows must respect RBAC/ABAC and region scope;
- GitHub Issues must be small enough to implement and test;
- separate UI shell, components, module pages, workflow pages, security controls, and tests;
- avoid broad vague issues;
- define dependencies clearly.

### 3. Milestone Design

Create these GitHub milestones:

1. `SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, and Core Components`
2. `SIKESRA UI/UX MVP - Sprint 2: Dashboard and Registry Data`
3. `SIKESRA UI/UX MVP - Sprint 3: Module Forms`
4. `SIKESRA UI/UX MVP - Sprint 4: Code, Documents, and Verification`
5. `SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`
6. `SIKESRA UI/UX MVP - Hardening: Accessibility, Security UX, Tests, and Documentation`

### 4. Label Design

Create or reuse these labels:

- `sikesra`
- `uiux`
- `mvp`
- `admin`
- `dashboard`
- `forms`
- `registry`
- `verification`
- `documents`
- `import-excel`
- `export-report`
- `audit-log`
- `rbac-abac`
- `region-scope`
- `sensitive-data`
- `security`
- `accessibility`
- `responsive`
- `testing`
- `documentation`
- `backend-needed`
- `blocked`
- `good-first-implementation`

Use priority labels when supported:

- `priority: critical`
- `priority: high`
- `priority: medium`
- `priority: low`

Use type labels when supported:

- `type: epic`
- `type: feature`
- `type: task`
- `type: bug`
- `type: security`
- `type: docs`
- `type: test`

---

## GitHub Issues to Create

Create issues grouped by epic. Each issue must include:

- title;
- summary;
- context from PRD;
- scope;
- out of scope;
- technical notes;
- UI/UX requirements;
- security/privacy requirements;
- acceptance criteria;
- test checklist;
- dependencies;
- labels;
- milestone.

Use the issue templates below.

---

# Epic 1 — Admin Layout, Navigation, and Core UI Components

## Issue 1.1 — Create SIKESRA admin navigation structure

Title:
`[SIKESRA UI/UX] Create admin navigation structure for SIKESRA modules`

Summary:
Create the SIKESRA admin sidebar/navigation structure based on the PRD menu hierarchy.

Context:
The PRD defines the admin menu as Dashboard SIKESRA, Registry Data, module-specific pages, Verification Data, Documents, Import Excel, Reports & Export, Region & Code, Audit Log, Users & Access, and Settings.

Scope:

- Add SIKESRA menu group in admin navigation.
- Add nested menu for Registry Data.
- Add route placeholders for all MVP pages.
- Ensure menu labels use formal Indonesian language.
- Prepare menu visibility hooks for RBAC/ABAC.

Out of scope:

- Full page implementation.
- Backend permission implementation.

Acceptance criteria:

- SIKESRA menu appears in admin layout for authorized users.
- All menu items from the PRD are represented.
- Menu visibility can be controlled by permission metadata.
- No technical terms like `entity` or `object_type_code` appear in operator-facing menu labels.

Labels:
`sikesra`, `uiux`, `admin`, `rbac-abac`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, and Core Components`

---

## Issue 1.2 — Build reusable SIKESRA UI status badges

Title:
`[SIKESRA UI/UX] Build reusable status badges for data, verification, documents, and sensitivity`

Summary:
Create reusable badge components for draft, submitted, verified, need\_revision, rejected, active, archived, pending, incomplete, and sensitive data states.

Acceptance criteria:

- Badge labels are in Indonesian.
- Badge colors follow the semantic state recommendations in the PRD.
- Badges support data status, verification status, document completeness, and sensitive data classification.
- Badges are accessible with text labels, not color-only meaning.

Labels:
`sikesra`, `uiux`, `forms`, `registry`, `accessibility`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, and Core Components`

---

## Issue 1.3 — Build shared SIKESRA form section and wizard components

Title:
`[SIKESRA UI/UX] Build shared form section and wizard components for SIKESRA forms`

Summary:
Implement reusable form layout components for the global SIKESRA form pattern: Kode dan Kategori, Wilayah dan Alamat, Identitas Utama, Detail Khusus Modul, Personil Terkait, Dokumen, Status dan Catatan, Ringkasan Sebelum Submit.

Acceptance criteria:

- Components support create, edit draft, edit need\_revision, read-only, and verify mode.
- Supports progress/completeness indicator.
- Supports inline validation.
- Supports warning before leaving unsaved changes.
- Supports conditional sections.

Labels:
`sikesra`, `uiux`, `forms`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, and Core Components`

---

## Issue 1.4 — Build sensitive field display component

Title:
`[SIKESRA UI/UX][Security] Build sensitive field display and masking component`

Summary:
Create a reusable component for displaying sensitive fields such as NIK, NIK/KIA, child data, disability data, and private contact fields according to permission and classification.

Security requirements:

- Mask sensitive identifiers by default.
- Support hidden, masked, and full display states.
- Full reveal requires explicit permission and optional step-up authentication hook.
- Reveal and export actions must be auditable.

Acceptance criteria:

- NIK/KIA is never displayed fully by default.
- Viewer and dashboard contexts only show aggregated or masked data.
- Component supports `restricted` and `highly_restricted` classifications.
- UI copy warns users when sensitive data is involved.

Labels:
`sikesra`, `uiux`, `sensitive-data`, `security`, `rbac-abac`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, and Core Components`

---

# Epic 2 — Dashboard and Registry Data

## Issue 2.1 — Implement SIKESRA dashboard page

Title:
`[SIKESRA UI/UX] Implement SIKESRA dashboard with MVP widgets`

Summary:
Build the SIKESRA dashboard with stat cards, verification status chart placeholder, region recap, incomplete documents, need\_revision list, and latest activities.

Scope:

- Dashboard filters: wilayah, module, status, period.
- Stat cards for all required modules.
- Verification status distribution section.
- Rekap per kecamatan and desa/kelurahan.
- Dokumen belum lengkap and data perlu perbaikan sections.
- Activity timeline section.

Acceptance criteria:

- Dashboard includes all minimum widgets from PRD.
- Clicking stat cards routes to filtered registry list.
- Sensitive data is not shown on dashboard.
- Dashboard respects region scope and role visibility.

Labels:
`sikesra`, `uiux`, `dashboard`, `region-scope`, `sensitive-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 2: Dashboard and Registry Data`

---

## Issue 2.2 — Implement Registry Data list view and filter system

Title:
`[SIKESRA UI/UX] Implement registry data list view with filters and action column`

Summary:
Build a reusable registry list view showing ID SIKESRA 20D, name, type/subtype, official region, custom region, status, verification, document completeness, last update, and actions.

Acceptance criteria:

- Includes all required columns from PRD.
- Supports filters for module, subtype, kecamatan, desa/kelurahan, custom region, data status, verification status, document completeness, input source, and date range.
- Supports quick search by name, ID SIKESRA, address, and contact.
- Shows empty state guidance.
- Action buttons are permission-aware.

Labels:
`sikesra`, `uiux`, `registry`, `region-scope`, `rbac-abac`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 2: Dashboard and Registry Data`

---

## Issue 2.3 — Implement generic SIKESRA detail page pattern

Title:
`[SIKESRA UI/UX] Implement generic detail page pattern for SIKESRA entities`

Summary:
Create a detail layout with header, status badges, ID SIKESRA, region, action buttons, and tabs: Ringkasan, Data Utama, Personil, Dokumen, Verifikasi, Riwayat Perubahan, Catatan.

Acceptance criteria:

- Detail header shows name, ID SIKESRA 20D, type/subtype, status, verification, and region.
- Tabs match the PRD.
- Read-only mode works for viewer/auditor roles.
- Sensitive fields are masked according to permission.
- Action buttons follow status and permission rules.

Labels:
`sikesra`, `uiux`, `registry`, `verification`, `audit-log`, `sensitive-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 2: Dashboard and Registry Data`

---

# Epic 3 — Module Forms

## Issue 3.1 — Implement Rumah Ibadah form UI

Title:
`[SIKESRA UI/UX] Implement Rumah Ibadah form UI based on PRD field sections`

Summary:
Create the Rumah Ibadah form supporting Masjid, Musholla, Surau, Gereja, Pura, Wihara, Klenteng, ID Masjid conditional field, pengurus, petugas keagamaan repeatable rows, hibah, documents, and region fields.

Acceptance criteria:

- Supports required fields: jenis, nama, alamat, desa/kelurahan.
- Shows ID Masjid field only when relevant.
- Supports repeatable Imam Tetap, Bilal, and Marbot rows.
- Hibah fields appear only when `Pernah Menerima Hibah = Ya`.
- NIK fields use sensitive field component.
- Document upload slots include SK Kepengurusan, Dokumen ID Masjid, Foto Bangunan.

Labels:
`sikesra`, `uiux`, `forms`, `documents`, `sensitive-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms`

---

## Issue 3.2 — Implement Lembaga Keagamaan form UI

Title:
`[SIKESRA UI/UX] Implement Lembaga Keagamaan form UI`

Summary:
Create the Lembaga Keagamaan form supporting agama, master nama lembaga for Islam, custom name through Lainnya, address, region, bidang kegiatan, SK Pendirian, SK Kepengurusan, documentation, pengurus, contacts.

Acceptance criteria:

- Agama select includes Islam, Kristen, Katholik, Hindu, Budha, Konghuchu.
- Islam master list includes MUI, NU, Muhammadiyah, LPTQ, LASQI, LDII, PHBI, and Lainnya.
- Choosing Lainnya opens custom name text field.
- NIK fields are masked.
- Documents match PRD.

Labels:
`sikesra`, `uiux`, `forms`, `documents`, `sensitive-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms`

---

## Issue 3.3 — Implement Lembaga Pendidikan Keagamaan form UI

Title:
`[SIKESRA UI/UX] Implement Lembaga Pendidikan Keagamaan form UI`

Summary:
Create form for TPA/TPQ, Pondok Pesantren, and Lainnya, including legal documents, activities, jumlah pengajar, jumlah santri, pengurus, and contacts.

Acceptance criteria:

- Supports jenis pendidikan select.
- Shows guidance for Pondok Pesantren.
- Shows non-blocking warning if jumlah santri is empty or zero.
- Supports upload/catatan for dokumentasi kegiatan.
- Sensitive pengurus NIK fields are masked.

Labels:
`sikesra`, `uiux`, `forms`, `documents`, `sensitive-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms`

---

## Issue 3.4 — Implement Lembaga Kesejahteraan Sosial form UI

Title:
`[SIKESRA UI/UX] Implement Lembaga Kesejahteraan Sosial form UI`

Summary:
Create form for Baznas, PWRI, Panti Asuhan, Panti Yatim, Panti Jompo, Rukun Kematian, Majelis Taklim, including legal documents, activities, pengasuh, anak asuh, pengurus, and contacts.

Acceptance criteria:

- Supports all PRD LKS categories.
- Shows Jumlah Pengasuh and Jumlah Anak Asuh for panti-related categories.
- Hides or contextualizes Jumlah Anak Asuh for Rukun Kematian where not relevant.
- Supports Badan Hukum, SK Kepengurusan, and Dokumentasi Kegiatan.
- Sensitive fields are masked.

Labels:
`sikesra`, `uiux`, `forms`, `documents`, `sensitive-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms`

---

## Issue 3.5 — Implement Guru Agama / Guru Ngaji form UI

Title:
`[SIKESRA UI/UX] Implement Guru Agama/Guru Ngaji form UI`

Summary:
Create form for individual guru agama/guru ngaji with identity, NIK, TTL, address, region, status rumahan/lembaga, TKA/TPA fields, contacts, and notes.

Acceptance criteria:

- Status Guru Ngaji supports Rumahan and Lembaga.
- Nama TKA/TPA and Alamat TKA/TPA appear only when status is Lembaga.
- NIK is highly restricted and masked.
- Required fields and validation match PRD.

Labels:
`sikesra`, `uiux`, `forms`, `sensitive-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms`

---

## Issue 3.6 — Implement Anak Yatim form UI with privacy protections

Title:
`[SIKESRA UI/UX][Security] Implement Anak Yatim form UI with child data privacy protections`

Summary:
Create form for Anak Yatim, Anak Piatu, Anak Yatim Piatu including identity, NIK/KIA, TTL, gender, school, wali/pengasuh, KK upload, and wali contacts.

Security requirements:

- Show child-data privacy warning banner.
- Mask NIK/KIA by default.
- Export of child data must be permission-aware.
- Viewer contexts must not expose unnecessary personal data.

Acceptance criteria:

- Supports all PRD fields.
- NIK/KIA and wali NIK use sensitive field component.
- Kartu Keluarga document upload slot is available.
- Privacy banner is shown.
- Data minimization is applied in read-only contexts.

Labels:
`sikesra`, `uiux`, `forms`, `sensitive-data`, `security`, `documents`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms`

---

## Issue 3.7 — Implement Disabilitas form UI with sensitive data protections

Title:
`[SIKESRA UI/UX][Security] Implement Disabilitas form UI with sensitive data protections`

Summary:
Create form for disability data including identity, NIK/KIA, TTL, gender, address, region, jenis disabilitas, subjenis sensorik, tingkat keparahan, wali/pengasuh, and contacts.

Acceptance criteria:

- Jenis disabilitas supports Fisik, Intelektual, Mental, Sensorik.
- Subjenis sensorik appears only when jenis disabilitas is Sensorik.
- Tingkat keparahan is required: Ringan, Sedang, Berat.
- NIK/KIA is highly restricted and masked.
- Sensitive data warning is shown.

Labels:
`sikesra`, `uiux`, `forms`, `sensitive-data`, `security`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms`

---

# Epic 4 — ID SIKESRA, Documents, and Verification

## Issue 4.1 — Implement ID SIKESRA 20-digit UI states and explanation modal

Title:
`[SIKESRA UI/UX] Implement ID SIKESRA 20-digit UI states and explanation modal`

Summary:
Implement UI states for ID SIKESRA: belum dapat dibuat, siap dibuat, sudah dibuat, perlu koreksi khusus. Add copy button and explanation modal showing kode desa, jenis, subjenis, and sequence.

Acceptance criteria:

- Shows `Belum dibuat` when no ID exists.
- Generate button is disabled until minimum fields are complete.
- Missing field list is shown when generation is blocked.
- Explanation modal shows ID structure.
- Correction flow is visible only to authorized admins.

Labels:
`sikesra`, `uiux`, `forms`, `region-scope`, `rbac-abac`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 4: Code, Documents, and Verification`

---

## Issue 4.2 — Implement document upload card and document list UI

Title:
`[SIKESRA UI/UX] Implement document upload card and document list UI`

Summary:
Create document upload UI for SK Kepengurusan, SK Pendirian, Badan Hukum, ID Masjid, Foto Bangunan, Dokumentasi Kegiatan, Kartu Keluarga, and Dokumen Lain.

Acceptance criteria:

- Document upload card supports document type, file picker, document number, issuer, issued date, expiry date, notes, status, and preview.
- Shows file size and allowed file types before upload.
- Shows upload progress.
- Replacing a document marks old document as superseded in UI.
- Access to preview is permission-aware.

Labels:
`sikesra`, `uiux`, `documents`, `security`, `sensitive-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 4: Code, Documents, and Verification`

---

## Issue 4.3 — Implement verification review page and decision workflow UI

Title:
`[SIKESRA UI/UX] Implement verification review page and decision workflow UI`

Summary:
Build verification review UI with summary, last changes, minimum field completeness, document completeness, region validation, petugas notes, verifier notes, and decision actions.

Acceptance criteria:

- Verifikator can choose Verifikasi, Butuh Perbaikan, or Tolak.
- Butuh Perbaikan requires field/section, note, priority, and optional due date.
- Rejected requires reason.
- Verified requires confirmation.
- All decisions are prepared for audit logging.
- Buttons are permission-aware.

Labels:
`sikesra`, `uiux`, `verification`, `audit-log`, `rbac-abac`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 4: Code, Documents, and Verification`

---

## Issue 4.4 — Implement need\_revision UX in edit forms

Title:
`[SIKESRA UI/UX] Implement need_revision UX with inline verifier notes`

Summary:
When data has status need\_revision, show verifier notes near related fields and highlight sections requiring correction.

Acceptance criteria:

- Need\_revision banner appears at top of edit form.
- Related fields are highlighted.
- Verifier notes appear near field/section.
- Petugas can update and resubmit.
- Previous notes remain visible in verification history.

Labels:
`sikesra`, `uiux`, `verification`, `forms`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 4: Code, Documents, and Verification`

---

# Epic 5 — Import, Export, Audit, Users, and Access Management

## Issue 5.1 — Implement Import Excel staging UI

Title:
`[SIKESRA UI/UX] Implement Import Excel staging UI with mapping and validation review`

Summary:
Build import workflow UI: upload Excel, choose sheets, map columns, validate, review staging rows, promote to master, and generate ID when valid.

Acceptance criteria:

- Upload step supports Excel file selection.
- Sheet selection step is available.
- Column mapping UI exists.
- Validation result displays valid, invalid, needs\_review counts.
- Staging review table displays errors and editable mapped data.
- Promotion action is permission-aware.
- Import does not directly bypass staging.

Labels:
`sikesra`, `uiux`, `import-excel`, `registry`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`

---

## Issue 5.2 — Implement reports and export UI with sensitive data confirmation

Title:
`[SIKESRA UI/UX][Security] Implement reports and export UI with sensitive data confirmation`

Summary:
Create reports and export UI for module recap, region recap, verification status, document completeness, rumah ibadah by type, lembaga keagamaan by agama, anak yatim by school level, disabilitas by type/severity, and need\_revision/rejected.

Acceptance criteria:

- Supports minimum report types from PRD.
- Supports CSV/XLSX export.
- Export of sensitive data requires permission and confirmation checkbox.
- Export action is prepared for audit logging.
- Viewer role receives aggregate/public-safe reports only.

Labels:
`sikesra`, `uiux`, `export-report`, `sensitive-data`, `security`, `audit-log`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`

---

## Issue 5.3 — Implement official region and custom region UI components

Title:
`[SIKESRA UI/UX] Implement official region and custom region UI components`

Summary:
Create cascade select for official administrative regions and separate UI for custom regions such as dusun, RT, RW, blok, or zona layanan.

Acceptance criteria:

- Official region and custom region are visually distinct.
- Tooltip explains custom region does not replace official region.
- Desa/kelurahan selection drives ID SIKESRA code preview.
- Region fields respect user region scope.

Labels:
`sikesra`, `uiux`, `region-scope`, `forms`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`

---

## Issue 5.4 — Implement audit log viewer UI

Title:
`[SIKESRA UI/UX] Implement audit log viewer UI for SIKESRA actions`

Summary:
Create audit log viewer with filters and detail view for create, update, delete\_soft, generate\_code, submit, verify, upload, export actions.

Acceptance criteria:

- Audit log table includes time, user, role, module, entity, action, summary, IP/device if available, and detail button.
- Detail shows before/after changes where available.
- Access is restricted to authorized admin/auditor roles.
- Sensitive values are masked unless user has permission.

Labels:
`sikesra`, `uiux`, `audit-log`, `security`, `sensitive-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`

---

## Issue 5.5 — Implement users, roles, permissions, and region scope UI

Title:
`[SIKESRA UI/UX] Implement users, roles, permissions, and region scope UI for SIKESRA`

Summary:
Create UI for user listing, user form, role assignment, region scope assignment, 2FA status, and permission matrix.

Acceptance criteria:

- User table shows name, email/username, role, region scope, account status, 2FA status, and last login.
- User form supports role and region scope assignment.
- Permission matrix shows key SIKESRA permissions.
- Sensitive roles can require 2FA.
- Only authorized admins can access this UI.

Labels:
`sikesra`, `uiux`, `rbac-abac`, `region-scope`, `security`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`

---

# Epic 6 — Hardening, Accessibility, Testing, and Documentation

## Issue 6.1 — Add accessibility and usability checks for SIKESRA UI

Title:
`[SIKESRA UI/UX] Add accessibility and usability checks for SIKESRA admin UI`

Summary:
Ensure the SIKESRA UI meets minimum accessibility and usability standards from the PRD.

Acceptance criteria:

- Buttons have explicit labels.
- Status badges do not rely on color only.
- Form errors are clear and near fields.
- Keyboard navigation works for key form and modal flows.
- Tables are usable on desktop and tablet.
- Error messages use clear Indonesian language.

Labels:
`sikesra`, `uiux`, `accessibility`, `testing`, `mvp`, `type: test`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Hardening: Accessibility, Security UX, Tests, and Documentation`

---

## Issue 6.2 — Add responsive behavior for dashboard, list, detail, and forms

Title:
`[SIKESRA UI/UX] Add responsive behavior for SIKESRA dashboard, list, detail, and forms`

Summary:
Make SIKESRA UI comfortable on desktop and tablet, with mobile review support.

Acceptance criteria:

- Desktop uses fixed/collapsible sidebar and wide tables.
- Tablet supports collapsible sidebar and scrollable tables.
- Mobile converts list table into card list where practical.
- Forms remain usable in step/section mode on narrow screens.

Labels:
`sikesra`, `uiux`, `responsive`, `accessibility`, `mvp`, `type: feature`, `priority: medium`

Milestone:
`SIKESRA UI/UX MVP - Hardening: Accessibility, Security UX, Tests, and Documentation`

---

## Issue 6.3 — Add UI tests for critical SIKESRA workflows

Title:
`[SIKESRA UI/UX] Add UI tests for critical SIKESRA workflows`

Summary:
Add tests for navigation, list filters, form validation, ID generation UI states, document upload UI, verification workflow, sensitive field masking, and export confirmation.

Acceptance criteria:

- Tests cover menu visibility by role where test utilities exist.
- Tests cover form required validations.
- Tests cover sensitive field masking.
- Tests cover need\_revision note display.
- Tests cover export confirmation modal.
- Tests can run in CI.

Labels:
`sikesra`, `uiux`, `testing`, `security`, `rbac-abac`, `mvp`, `type: test`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Hardening: Accessibility, Security UX, Tests, and Documentation`

---

## Issue 6.4 — Write SIKESRA UI/UX implementation documentation

Title:
`[SIKESRA UI/UX] Write implementation documentation for SIKESRA admin UI/UX`

Summary:
Document SIKESRA UI routes, components, form patterns, status badges, sensitive field handling, verification flow, import/export flow, and role/permission visibility.

Acceptance criteria:

- Documentation explains route structure.
- Documentation explains reusable components.
- Documentation explains sensitive data masking policy.
- Documentation explains workflow states.
- Documentation includes screenshots or text wireframes if screenshots are not available.
- Documentation links to related GitHub Issues.

Labels:
`sikesra`, `uiux`, `documentation`, `mvp`, `type: docs`, `priority: medium`

Milestone:
`SIKESRA UI/UX MVP - Hardening: Accessibility, Security UX, Tests, and Documentation`

---

## Recommended Issue Dependency Order

Use this implementation dependency order:

1. Issue 1.1 — Navigation.
2. Issue 1.2 — Status badges.
3. Issue 1.3 — Form/wizard components.
4. Issue 1.4 — Sensitive field component.
5. Issue 5.3 — Region components.
6. Issue 2.1 — Dashboard.
7. Issue 2.2 — Registry list.
8. Issue 2.3 — Detail pattern.
9. Issue 4.1 — ID SIKESRA UI.
10. Issues 3.1–3.7 — Module forms.
11. Issue 4.2 — Documents UI.
12. Issues 4.3–4.4 — Verification UI.
13. Issue 5.1 — Import Excel UI.
14. Issue 5.2 — Reports/export UI.
15. Issue 5.4 — Audit log UI.
16. Issue 5.5 — Users/access UI.
17. Issues 6.1–6.4 — Hardening, tests, documentation.

---

## GitHub Issue Body Template

Use this body format for every issue:

```markdown
## Summary

<!-- Explain the feature/task briefly. -->

## PRD Context

<!-- Cite the relevant PRD section title and summarize the requirement. -->

## Scope

- [ ] ...
- [ ] ...

## Out of Scope

- ...

## UI/UX Requirements

- [ ] ...
- [ ] ...

## Security and Privacy Requirements

- [ ] Permission-aware UI
- [ ] Sensitive data masked by default where applicable
- [ ] Region scope respected where applicable
- [ ] Export/reveal actions prepared for audit logging where applicable

## Technical Notes

- Use existing AWCMS Mini admin layout and component conventions when available.
- Prefer reusable components over module-specific duplication.
- Keep labels in formal Indonesian for operator-facing UI.
- Do not expose internal database field names in operator-facing UI.

## Acceptance Criteria

- [ ] ...
- [ ] ...

## Test Checklist

- [ ] Unit/component tests where practical
- [ ] Manual test for admin role
- [ ] Manual test for restricted role
- [ ] Manual test for region-scoped user where applicable
- [ ] Manual test for responsive desktop/tablet view
- [ ] Manual test for sensitive data masking where applicable

## Dependencies

- Depends on: #...
- Blocks: #...

## References

- PRD UI/UX SIKESRA AWCMS Mini
```

---

## GitHub Issue Creation Instructions

After planning, perform these actions:

1. Check existing GitHub labels and milestones.
2. Create missing labels.
3. Create missing milestones.
4. Search existing issues to avoid duplicates.
5. Create or update issues based on the epic structure above.
6. Link related issues through dependencies where GitHub supports it.
7. Add each issue to the correct milestone.
8. Add appropriate labels.
9. Add a final summary comment listing created issue numbers grouped by milestone.

Do not create duplicate issues. If a similar issue already exists, update it with missing PRD details instead of creating a new issue.

---

## Quality Bar

The final issue set is acceptable only if:

- Every major PRD UI/UX section is represented by at least one issue.
- Sensitive data handling has dedicated security issues.
- ID SIKESRA 20-digit UI has a dedicated critical issue.
- Each module form has its own issue.
- Import, export, audit log, verification, region scope, and RBAC/ABAC each have dedicated issues.
- Issues are implementable within small-to-medium engineering tasks.
- Acceptance criteria are testable.
- UI language is Indonesian and operator-friendly.
- The plan respects AWCMS Mini single-tenant architecture.

---

## Final Response Format

After creating or updating GitHub Issues, respond with:

```markdown
# SIKESRA UI/UX GitHub Planning Completed

## Repository Reviewed
- ...

## Milestones Created/Updated
1. ...

## Labels Created/Updated
- ...

## Issues Created/Updated

### Sprint 1
- #... [title]

### Sprint 2
- #... [title]

### Sprint 3
- #... [title]

### Sprint 4
- #... [title]

### Sprint 5
- #... [title]

### Hardening
- #... [title]

## Risks / Blockers
- ...

## Recommended Next Step
- ...
```

---

## Important Constraints

- Do not hardcode secrets.
- Do not expose credentials in issues.
- Do not expose NIK/KIA or sample real personal data.
- Do not implement public access to sensitive data.
- Do not assume Supabase-first architecture.
- Do not assume AWCMS full multi-tenant behavior.
- Keep SIKESRA MVP aligned with AWCMS Mini single-tenant.
- Keep all sensitive UI behavior aligned with RBAC/ABAC, region scope, auditability, and data minimization.

