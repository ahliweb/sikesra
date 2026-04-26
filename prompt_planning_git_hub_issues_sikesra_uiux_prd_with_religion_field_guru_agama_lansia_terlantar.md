Act as a senior product manager, system analyst, UI/UX architect, full-stack engineer, security engineer, data privacy analyst, and GitHub issue planner for the SIKESRA application built on AWCMS Mini.

You are working in the repository:

`https://github.com/ahliweb/awcms-mini`

Your task is to analyze the provided Markdown PRD titled:

`PRD Khusus UI/UX SIKESRA Berbasis AWCMS Mini Single-Tenant`

Then create a complete planning breakdown and GitHub Issues for implementing the UI/UX MVP of SIKESRA.

SIKESRA is a single-tenant government-ready application based on AWCMS Mini for managing, validating, monitoring, reporting, and mapping social, religious, educational religious, and welfare-related data. It uses PostgreSQL, Kysely, RBAC/ABAC, audit logs, Cloudflare-compatible deployment, and Cloudflare R2 or compatible object storage for documents.

Prioritize the UI/UX implementation based on the PRD and these additional requirements:

1. **Add a religion reference field to all related personal data and all relevant modules.**
2. **Use Guru Agama as the general module label. Do not use Guru Ngaji as a general module label because guru ngaji is part of Islamic religious teaching and should be represented contextually under Islam-specific data.**
3. **Add a Lansia Terlantar module with fields and rules similar to the Anak Yatim module, but adapted for abandoned elderly people.**

This means the planning and GitHub Issues must include UI/UX, data model awareness, validation, reporting, filtering, import/export, privacy handling, and documentation for:

- `religion_reference` or equivalent religion reference field wherever relevant;
- Guru Agama terminology normalization;
- Lansia Terlantar module as a vulnerable-person module with guardian/caregiver/contact/document fields and privacy protection.

---

## 1. Religion Reference Requirement

Religion reference must not be implemented as arbitrary free text by default. It should reference a controlled master list or reference table, such as:

- Islam
- Kristen
- Katolik/Katholik, using one normalized internal value consistently
- Hindu
- Buddha/Budha, using one normalized internal value consistently
- Konghucu/Konghuchu, using one normalized internal value consistently
- Other/Other officially allowed value if required by regulation or local policy
- Unknown/Not recorded only where legally and operationally acceptable

Use Indonesian operator-facing labels, for example:

- `Agama`
- `Referensi Agama`
- `Agama Anak`
- `Agama Guru`
- `Agama Lansia`
- `Agama Wali/Pengasuh`
- `Agama Pendamping/Penanggung Jawab`
- `Agama Pengurus`
- `Agama Lembaga`

Do not expose internal technical field names such as `religion_reference_id` or `religion_code` in operator-facing UI.

Add religion reference handling to all relevant personal data and modules, including but not limited to:

1. `entity_people` or equivalent person-related records:
   - Ketua
   - Sekretaris
   - Bendahara
   - Imam Tetap
   - Bilal
   - Marbot
   - Wali/Pengasuh
   - Pendamping/Penanggung Jawab Lansia
   - Guru Agama
   - Anak Yatim/Anak Piatu/Anak Yatim Piatu
   - Lansia Terlantar
   - Penyandang Disabilitas
   - Any other personal data records connected to an entity

2. Module-specific UI forms:
   - Rumah Ibadah: agama/religion reference for pengurus and relevant petugas keagamaan where required.
   - Lembaga Keagamaan: agama lembaga is already central; also add religion reference for personal pengurus if relevant.
   - Lembaga Pendidikan Keagamaan: add agama lembaga and/or agama pengurus when relevant.
   - Lembaga Kesejahteraan Sosial: add agama lembaga and/or agama pengurus/wali/pengasuh when relevant.
   - Guru Agama: add agama guru and optionally agama lembaga if applicable.
   - Anak Yatim: add agama anak and agama wali/pengasuh where required.
   - Lansia Terlantar: add agama lansia and agama pendamping/penanggung jawab where required.
   - Disabilitas: add agama penyandang disabilitas and agama wali/pengasuh where required.
   - Dokumen Pendukung: ensure document metadata can support religion-related classification only if needed, without exposing unnecessary sensitive data.
   - Import Excel: support religion field mapping and validation.
   - Export/Reports: add filters and report dimensions for religion where appropriate, while respecting privacy and data minimization.
   - Dashboard: support aggregate religion-based summaries only if permitted and useful; do not expose sensitive individual-level religion data unnecessarily.

3. UI/UX rules:
   - Religion field must use a select/dropdown from a controlled reference list.
   - Avoid free-text religion values except for controlled “Other” flow if explicitly enabled.
   - Add normalization guidance for spelling variants: Katolik/Katholik, Buddha/Budha, Konghucu/Konghuchu.
   - Field visibility must be permission-aware where religion is considered sensitive or regulated personal data.
   - Individual-level religion data must be handled carefully under privacy and data minimization principles.
   - Aggregate reports may use religion categories if authorized and operationally justified.
   - The UI must make clear whether religion refers to the entity, person, child, elderly person, guardian, caregiver, teacher, or institution.

4. Security and privacy rules:
   - Treat religion reference for individuals as sensitive personal data or sensitive attribute in UI planning.
   - Do not expose religion data in public-safe views unless explicitly approved and aggregated.
   - Use RBAC/ABAC and region scope for access.
   - Export of individual-level religion data must require permission and audit logging.
   - Avoid unnecessary display of religion in dashboard widgets for viewer roles.
   - Include audit logging for create/update/export actions involving religion fields.

---

## 2. Guru Agama Terminology Rule

Use **Guru Agama** as the module label.

Do not use **Guru Ngaji** as a general module label because guru ngaji is part of Islamic religious teaching and should be represented contextually under Islam-specific data, not as a general cross-religion module name.

If Islamic teaching context is needed, represent it as contextual teaching place/activity data inside the Guru Agama module, not in the module title.

Examples:

- Correct general module label: `Guru Agama`
- Avoid general module label: `Guru Agama/Guru Ngaji`
- Avoid general module label: `Guru Ngaji`
- Contextual Islam-specific teaching fields may include teaching place/activity notes when relevant, but should not redefine the general module name.

---

## 3. Lansia Terlantar Module Requirement

Add a **Lansia Terlantar** module with fields and rules similar to the `Anak Yatim` module, but adapted for abandoned elderly people.

The Lansia Terlantar module is a vulnerable-person module and must be treated with strong privacy, data minimization, RBAC/ABAC, region scope, and audit controls.

### 3.1 Module Purpose

The Lansia Terlantar module is used to record abandoned elderly people who may need social welfare monitoring, assistance, verification, and follow-up by authorized government officers.

### 3.2 Suggested Category/Subcategory

Use controlled categories, such as:

- Lansia Terlantar
- Lansia Hidup Sendiri
- Lansia Tanpa Pengampu
- Lansia Rentan Sosial
- Other/Lainnya, only if approved by policy

### 3.3 Suggested Fields

Design fields similar to Anak Yatim, adapted for elderly data:

#### A. Kategori dan Status Lansia

- Kategori Lansia: select controlled category
- Status Lansia: active/draft/submitted/verified/need_revision/rejected/archived
- Status Verifikasi: pending/verified/rejected/need_revision
- Status Bantuan: belum menerima/sedang menerima/pernah menerima/tidak diketahui, if needed

#### B. Identitas Lansia

- Nama Lengkap Lansia: required
- NIK Lansia: sensitive/highly restricted, optional or required based on official data policy
- No KK: sensitive/highly restricted, optional
- Tempat Lahir: optional
- Tanggal Lahir or Perkiraan Umur: required where exact date is unknown
- Umur: computed or manual fallback if tanggal lahir unknown
- Jenis Kelamin: required
- Agama Lansia: controlled religion reference, permission-aware
- Status Perkawinan: optional
- Kondisi Kependudukan: memiliki identitas/tidak memiliki identitas/tidak diketahui

#### C. Alamat dan Wilayah

- Alamat Domisili: required
- Kecamatan: official region cascade
- Desa/Kelurahan: official region cascade, required
- Wilayah Custom/Dusun/RT/RW/Zona: optional, not part of ID SIKESRA 20D
- Titik Koordinat: optional for field survey
- Kondisi Tempat Tinggal: rumah sendiri/menumpang/tidak tetap/panti/di jalan/lainnya

#### D. Kondisi Sosial dan Kesehatan Dasar

- Kondisi Keterlantaran: hidup sendiri/tanpa keluarga/tidak mampu/tidak terurus/tidak diketahui/lainnya
- Kondisi Fisik Umum: mandiri/perlu bantuan sebagian/terbaring/perlu pendampingan
- Memiliki Disabilitas: yes/no/unknown, optionally link to Disabilitas module if needed
- Penyakit/Kebutuhan Khusus: sensitive health-related note, access restricted
- Kebutuhan Prioritas: makanan/tempat tinggal/kesehatan/dokumen kependudukan/pendampingan/bantuan sosial/lainnya

#### E. Pendamping/Penanggung Jawab/Wali

Adapt Anak Yatim wali/pengasuh section into elderly-appropriate terms:

- Nama Pendamping/Penanggung Jawab: recommended if available
- NIK Pendamping/Penanggung Jawab: sensitive/highly restricted
- Hubungan dengan Lansia: anak/keluarga/tetangga/RT/RW/kader/petugas/pengurus panti/lainnya/tidak ada
- Agama Pendamping/Penanggung Jawab: controlled religion reference, optional and permission-aware
- Alamat Pendamping/Penanggung Jawab: optional
- Telepon/WA Pendamping/Penanggung Jawab: optional
- Email Pendamping/Penanggung Jawab: optional

#### F. Dokumen Pendukung

Use document patterns similar to Anak Yatim, adapted for elderly:

- KTP Lansia
- Kartu Keluarga
- Surat Keterangan Tidak Mampu or Surat Keterangan Terlantar, if available
- Surat Keterangan Domisili, if needed
- Foto Kondisi/Tempat Tinggal, if policy allows
- Dokumen Bantuan Sosial, if available
- Dokumen Lain

#### G. Catatan dan Verifikasi

- Catatan Petugas
- Catatan Verifikator
- Status Verifikasi
- Tanggal Verifikasi
- Petugas Input
- Petugas Verifikasi
- Riwayat perubahan
- Audit log

### 3.4 Privacy and Security Rules for Lansia Terlantar

- Treat Lansia Terlantar as vulnerable-person data.
- NIK, No KK, contact, health-related notes, assistance status, and living condition notes are sensitive.
- Religion of the elderly person and guardian/caregiver must be permission-aware.
- Public-safe or viewer roles must receive aggregate data only unless explicitly authorized.
- Export of individual-level elderly data must require explicit permission and audit logging.
- Avoid stigmatizing language; use respectful terms.
- Use “Lansia Terlantar” as a formal administrative category, but UI copy should be empathetic and respectful.

### 3.5 UX Rules for Lansia Terlantar

- Show privacy warning banner similar to Anak Yatim and Disabilitas:

`Data lansia terlantar termasuk data pribadi dan data kelompok rentan. Gunakan hanya sesuai kewenangan, kebutuhan layanan, dan ketentuan perlindungan data yang berlaku.`

- Use clear field labels:
  - `Nama Lansia`
  - `Agama Lansia`
  - `Pendamping/Penanggung Jawab`
  - `Hubungan dengan Lansia`
  - `Kondisi Keterlantaran`
  - `Kebutuhan Prioritas`

- Use controlled select options for category, gender, religion, region, living condition, vulnerability condition, and priority needs.
- Allow unknown/not recorded values only where policy allows.
- Avoid forcing exact birth date if only estimated age is available.
- Provide duplicate warning based on name + region + approximate birth/age + NIK hash where available.

---

## 4. Main UI/UX Scope

The main UI/UX scope includes:

1. Admin layout and navigation.
2. Dashboard SIKESRA.
3. Registry data list and detail pattern.
4. Form pattern per module.
5. ID SIKESRA 20-digit UI.
6. Religion reference master data and UI integration.
7. Rumah Ibadah UI.
8. Lembaga Keagamaan UI.
9. Lembaga Pendidikan Keagamaan UI.
10. Lembaga Kesejahteraan Sosial UI.
11. Guru Agama UI.
12. Anak Yatim UI with sensitive data protection and religion reference handling.
13. Lansia Terlantar UI with vulnerable-person data protection and religion reference handling.
14. Disabilitas UI with sensitive data protection and religion reference handling.
15. Dokumen Pendukung and file upload UI.
16. Verification workflow UI.
17. Import Excel staging UI, including religion field mapping and Lansia Terlantar import mapping.
18. Reports and export UI, including authorized religion-based and vulnerable-person reporting.
19. Official region and custom region UI.
20. Audit log UI.
21. Users, roles, permissions, region scope, and ABAC UI.
22. Accessibility, responsiveness, and usability testing.
23. Security and privacy UX, especially for NIK/KIA, religion, child data, elderly/vulnerable-person data, disability data, and document access.

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
- existing reference/master data patterns;
- existing religion/agama master data if any;
- existing vulnerable-person/person/entity data model where Lansia Terlantar and religion reference should be attached;
- existing file upload/storage implementation;
- existing audit log implementation;
- existing import/export implementation;
- existing tests and CI scripts;
- existing documentation conventions.

If a feature does not yet exist, mark it as `missing` and create an issue for it.

### 2. Planning Principles

Use these principles for planning:

- simple-first-scalable-later;
- secure-by-default;
- UI follows PRD and these additional requirements, not assumptions;
- database-first and service-layer-aware;
- religion reference should be controlled by master/reference data;
- all sensitive and vulnerable-person data must be protected in UI;
- individual-level religion, child, elderly, and disability data must be protected through privacy and data minimization controls;
- all important actions must be audit-friendly;
- all workflows must respect RBAC/ABAC and region scope;
- GitHub Issues must be small enough to implement and test;
- separate UI shell, components, module pages, workflow pages, reference data, security controls, and tests;
- avoid broad vague issues;
- define dependencies clearly;
- keep module terminology neutral across religions, especially by using `Guru Agama` instead of `Guru Ngaji` for the general module;
- treat Lansia Terlantar similarly to Anak Yatim as vulnerable-person data, but adapt fields to elderly context.

### 3. Milestone Design

Create these GitHub milestones:

1. `SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, Core Components, and Religion Reference Foundation`
2. `SIKESRA UI/UX MVP - Sprint 2: Dashboard and Registry Data`
3. `SIKESRA UI/UX MVP - Sprint 3: Module Forms, Religion Fields, and Vulnerable Person Modules`
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
- `religion-reference`
- `master-data`
- `personal-data`
- `vulnerable-person`
- `lansia-terlantar`
- `sensitive-data`
- `security`
- `privacy`
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

# GitHub Issues to Create

Create issues grouped by epic. Each issue must include:

- title;
- summary;
- context from PRD;
- religion-reference impact where applicable;
- Lansia Terlantar impact where applicable;
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

---

# Epic 1 — Admin Layout, Navigation, Core UI Components, and Religion Reference Foundation

## Issue 1.1 — Create SIKESRA admin navigation structure

Title:
`[SIKESRA UI/UX] Create admin navigation structure for SIKESRA modules including Lansia Terlantar`

Summary:
Create the SIKESRA admin sidebar/navigation structure based on the PRD menu hierarchy and additional Lansia Terlantar module.

Scope:

- Add SIKESRA menu group in admin navigation.
- Add nested menu for Registry Data.
- Add route placeholders for all MVP pages.
- Add `Lansia Terlantar` as a module route/menu item.
- Ensure menu labels use formal Indonesian language.
- Use `Guru Agama` as the module/menu label, not `Guru Agama/Guru Ngaji`.
- Prepare menu visibility hooks for RBAC/ABAC.
- Ensure master/reference data navigation can support religion reference management if needed.

Acceptance criteria:

- SIKESRA menu appears in admin layout for authorized users.
- All menu items from the PRD are represented.
- `Lansia Terlantar` appears as a module where authorized.
- The menu uses `Guru Agama` as the general module label.
- Menu visibility can be controlled by permission metadata.
- No technical terms like `entity`, `object_type_code`, or `religion_reference_id` appear in operator-facing menu labels.

Labels:
`sikesra`, `uiux`, `admin`, `rbac-abac`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, Core Components, and Religion Reference Foundation`

---

## Issue 1.2 — Build reusable SIKESRA UI status badges

Title:
`[SIKESRA UI/UX] Build reusable status badges for data, verification, documents, and sensitivity`

Summary:
Create reusable badge components for draft, submitted, verified, need_revision, rejected, active, archived, pending, incomplete, sensitive data, and vulnerable-person data states.

Acceptance criteria:

- Badge labels are in Indonesian.
- Badge colors follow semantic state recommendations.
- Badges support data status, verification status, document completeness, sensitive data classification, and vulnerable-person classification.
- Badges can indicate `Data Sensitif`, `Atribut Sensitif`, and `Data Kelompok Rentan` where relevant.
- Badges are accessible with text labels, not color-only meaning.

Labels:
`sikesra`, `uiux`, `forms`, `registry`, `accessibility`, `sensitive-data`, `vulnerable-person`, `religion-reference`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, Core Components, and Religion Reference Foundation`

---

## Issue 1.3 — Build shared SIKESRA form section and wizard components

Title:
`[SIKESRA UI/UX] Build shared form section and wizard components for SIKESRA forms`

Summary:
Implement reusable form layout components for the global SIKESRA form pattern: Kode dan Kategori, Wilayah dan Alamat, Identitas Utama, Detail Khusus Modul, Personil Terkait, Dokumen, Status dan Catatan, Ringkasan Sebelum Submit.

Religion-reference impact:
The shared form pattern must support controlled reference fields such as `Agama` using dropdown/select components, with optional permission-aware display and privacy notes.

Lansia Terlantar impact:
The shared form pattern must support vulnerable-person sections such as identity, address, elderly condition, caregiver/guardian, documents, privacy warning, and verification notes.

Acceptance criteria:

- Components support create, edit draft, edit need_revision, read-only, and verify mode.
- Supports progress/completeness indicator.
- Supports inline validation.
- Supports warning before leaving unsaved changes.
- Supports conditional sections.
- Supports reusable controlled-reference select fields for religion/agama.
- Supports privacy warning sections for Anak Yatim, Lansia Terlantar, and Disabilitas.
- Does not expose internal technical religion field names in UI.

Labels:
`sikesra`, `uiux`, `forms`, `religion-reference`, `master-data`, `lansia-terlantar`, `vulnerable-person`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, Core Components, and Religion Reference Foundation`

---

## Issue 1.4 — Build sensitive field display component

Title:
`[SIKESRA UI/UX][Security] Build sensitive field display and masking component`

Summary:
Create a reusable component for displaying sensitive fields such as NIK, NIK/KIA, No KK, religion reference for individuals, child data, elderly/vulnerable-person data, disability data, health-related notes, living condition notes, assistance status, and private contact fields according to permission and classification.

Security requirements:

- Mask sensitive identifiers by default.
- Support hidden, masked, and full display states.
- Treat individual-level religion data as sensitive/personal data in UI planning.
- Treat Lansia Terlantar data as vulnerable-person data.
- Full reveal requires explicit permission and optional step-up authentication hook.
- Reveal and export actions must be auditable.

Acceptance criteria:

- NIK/KIA/No KK is never displayed fully by default.
- Individual-level religion is not shown in public-safe or unauthorized views.
- Lansia Terlantar sensitive fields are hidden/masked based on permission.
- Viewer and dashboard contexts only show aggregated or masked data.
- Component supports `restricted`, `highly_restricted`, and `vulnerable_person` classifications.
- UI copy warns users when sensitive data is involved.

Labels:
`sikesra`, `uiux`, `sensitive-data`, `personal-data`, `vulnerable-person`, `lansia-terlantar`, `religion-reference`, `privacy`, `security`, `rbac-abac`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, Core Components, and Religion Reference Foundation`

---

## Issue 1.5 — Add religion reference master data planning and UI component

Title:
`[SIKESRA UI/UX] Add religion reference master data planning and reusable Agama select component`

Summary:
Plan and create a reusable religion reference UI component that uses controlled master/reference data for all relevant forms and filters, including Lansia Terlantar fields.

Scope:

- Inspect whether a religion/agama master table or reference data already exists.
- If missing, create planning issue for backend/reference data support.
- Create reusable `Agama` select/dropdown component for operator-facing forms.
- Normalize display values and internal values consistently.
- Support active/inactive options if master data supports lifecycle.
- Support import mapping from spelling variants.
- Ensure component can be used as `Agama Lansia` and `Agama Pendamping/Penanggung Jawab`.

Acceptance criteria:

- Religion field is not implemented as arbitrary free text by default.
- Component displays Indonesian labels.
- Component can be reused across person forms, institution forms, Lansia Terlantar forms, filters, import mapping, and reports.
- Component supports disabled/read-only state.
- Component supports required/optional validation.
- Documentation explains normalization rules.

Labels:
`sikesra`, `uiux`, `religion-reference`, `master-data`, `forms`, `privacy`, `lansia-terlantar`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 1: Layout, Navigation, Core Components, and Religion Reference Foundation`

---

# Epic 2 — Dashboard and Registry Data

## Issue 2.1 — Implement SIKESRA dashboard page

Title:
`[SIKESRA UI/UX] Implement SIKESRA dashboard with MVP widgets including Lansia Terlantar`

Summary:
Build the SIKESRA dashboard with stat cards, verification status chart placeholder, region recap, incomplete documents, need_revision list, latest activities, and Lansia Terlantar summary.

Religion-reference impact:
Support religion-based aggregate summaries only when authorized and useful. Do not expose individual-level religion data on dashboards.

Lansia Terlantar impact:
Add aggregate-only Lansia Terlantar counts, status verification, document completeness, and regional distribution where authorized.

Scope:

- Dashboard filters: wilayah, module, status, period.
- Stat cards for all required modules, including Lansia Terlantar.
- Verification status distribution section.
- Rekap per kecamatan and desa/kelurahan.
- Dokumen belum lengkap and data perlu perbaikan sections.
- Activity timeline section.
- Optional authorized aggregate religion summary widget or filter if backend data is available.
- Optional vulnerable-person summary by module: Anak Yatim, Lansia Terlantar, Disabilitas.

Acceptance criteria:

- Dashboard includes all minimum widgets from PRD and Lansia Terlantar count.
- Clicking stat cards routes to filtered registry list.
- Sensitive data is not shown on dashboard.
- Individual-level religion and elderly data are not shown on dashboard.
- Religion-based dashboard data, if implemented, is aggregate-only and permission-aware.
- Lansia Terlantar dashboard data is aggregate-only and region-scope-aware.
- Dashboard respects region scope and role visibility.

Labels:
`sikesra`, `uiux`, `dashboard`, `region-scope`, `sensitive-data`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `privacy`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 2: Dashboard and Registry Data`

---

## Issue 2.2 — Implement Registry Data list view and filter system

Title:
`[SIKESRA UI/UX] Implement registry data list view with filters, religion filter, vulnerable-person filters, and action column`

Summary:
Build a reusable registry list view showing ID SIKESRA 20D, name, type/subtype, official region, custom region, status, verification, document completeness, last update, and actions.

Religion-reference impact:
Add religion/agama filtering where relevant and permission-aware. Avoid showing individual-level religion as a default list column unless operationally necessary and authorized.

Lansia Terlantar impact:
Support Lansia Terlantar filtering by category, region, verification status, document completeness, living condition, assistance status, and priority need where authorized.

Acceptance criteria:

- Includes all required columns from PRD.
- Supports filters for module, subtype, kecamatan, desa/kelurahan, custom region, data status, verification status, document completeness, input source, date range, religion where relevant, and Lansia Terlantar-specific filters where relevant.
- Supports quick search by name, ID SIKESRA, address, and contact.
- Religion filter uses the reusable controlled reference component.
- Religion column is hidden by default for individual data unless permission and configuration allow it.
- Lansia sensitive fields are hidden by default in list view.
- Shows empty state guidance.
- Action buttons are permission-aware.

Labels:
`sikesra`, `uiux`, `registry`, `region-scope`, `rbac-abac`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `privacy`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 2: Dashboard and Registry Data`

---

## Issue 2.3 — Implement generic SIKESRA detail page pattern

Title:
`[SIKESRA UI/UX] Implement generic detail page pattern for SIKESRA entities`

Summary:
Create a detail layout with header, status badges, ID SIKESRA, region, action buttons, and tabs: Ringkasan, Data Utama, Personil, Dokumen, Verifikasi, Riwayat Perubahan, Catatan.

Religion-reference impact:
Detail pages must display religion fields only in the correct context, for example agama lembaga, agama guru, agama anak, agama lansia, agama wali/pengasuh, or agama pendamping/penanggung jawab, and must apply privacy controls for individual-level religion data.

Lansia Terlantar impact:
Detail pages must support Lansia Terlantar sections: identity, address, elderly condition, caregiver/guardian, documents, verification, notes, and audit.

Acceptance criteria:

- Detail header shows name, ID SIKESRA 20D, type/subtype, status, verification, and region.
- Tabs match the PRD.
- Read-only mode works for viewer/auditor roles.
- Sensitive fields are masked according to permission.
- Religion data is clearly labeled by subject: entity/person/child/elderly/guardian/caregiver/teacher/institution.
- Individual-level religion display is permission-aware.
- Lansia Terlantar detail respects vulnerable-person visibility rules.
- Action buttons follow status and permission rules.

Labels:
`sikesra`, `uiux`, `registry`, `verification`, `audit-log`, `sensitive-data`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `privacy`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 2: Dashboard and Registry Data`

---

# Epic 3 — Module Forms, Religion Fields, and Vulnerable Person Modules

## Issue 3.1 — Implement Rumah Ibadah form UI

Title:
`[SIKESRA UI/UX] Implement Rumah Ibadah form UI based on PRD field sections with religion reference support`

Summary:
Create the Rumah Ibadah form supporting Masjid, Musholla, Surau, Gereja, Pura, Wihara, Klenteng, ID Masjid conditional field, pengurus, petugas keagamaan repeatable rows, hibah, documents, region fields, and religion reference where relevant.

Religion-reference requirements:

- Add agama/religion reference for related personal data where relevant: Ketua, Sekretaris, Bendahara, Imam Tetap, Bilal, Marbot.
- If the house of worship type clearly implies a religion, allow default/suggested religion where appropriate, but do not force incorrect assumptions without validation.
- Make religion fields optional/required based on policy configuration.

Acceptance criteria:

- Supports required fields: jenis, nama, alamat, desa/kelurahan.
- Shows ID Masjid field only when relevant.
- Supports repeatable Imam Tetap, Bilal, and Marbot rows.
- Hibah fields appear only when `Pernah Menerima Hibah = Ya`.
- NIK fields use sensitive field component.
- Religion fields for person records use controlled reference select.
- Document upload slots include SK Kepengurusan, Dokumen ID Masjid, Foto Bangunan.

Labels:
`sikesra`, `uiux`, `forms`, `documents`, `sensitive-data`, `religion-reference`, `personal-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms, Religion Fields, and Vulnerable Person Modules`

---

## Issue 3.2 — Implement Lembaga Keagamaan form UI

Title:
`[SIKESRA UI/UX] Implement Lembaga Keagamaan form UI with institution and personal religion references`

Summary:
Create the Lembaga Keagamaan form supporting agama, master nama lembaga for Islam, custom name through Lainnya, address, region, bidang kegiatan, SK Pendirian, SK Kepengurusan, documentation, pengurus, contacts, and personal religion fields where relevant.

Religion-reference requirements:

- Agama lembaga is a core field and must use controlled reference values.
- Add agama pengurus for Ketua, Sekretaris, and Bendahara where relevant.
- If agama lembaga is selected, allow default suggestion for pengurus religion but allow user correction if policy permits.

Acceptance criteria:

- Agama select includes Islam, Kristen, Katolik/Katholik, Hindu, Buddha/Budha, Konghucu/Konghuchu with normalized internal values.
- Islam master list includes MUI, NU, Muhammadiyah, LPTQ, LASQI, LDII, PHBI, and Lainnya.
- Choosing Lainnya opens custom name text field.
- NIK fields are masked.
- Religion fields use the reusable reference component.
- Documents match PRD.

Labels:
`sikesra`, `uiux`, `forms`, `documents`, `sensitive-data`, `religion-reference`, `master-data`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms, Religion Fields, and Vulnerable Person Modules`

---

## Issue 3.3 — Implement Lembaga Pendidikan Keagamaan form UI

Title:
`[SIKESRA UI/UX] Implement Lembaga Pendidikan Keagamaan form UI with religion reference support`

Summary:
Create form for TPA/TPQ, Pondok Pesantren, and Lainnya, including agama lembaga where relevant, legal documents, activities, jumlah pengajar, jumlah santri, pengurus, contacts, and religion references for related personal data.

Religion-reference requirements:

- Add agama lembaga if not already implied by type.
- Add agama pengurus for Ketua, Sekretaris, Bendahara where relevant.
- Consider agama peserta/santri only as aggregate/reporting requirement if explicitly approved; do not add individual santri records unless outside MVP scope.

Acceptance criteria:

- Supports jenis pendidikan select.
- Supports agama lembaga using controlled reference select where applicable.
- Shows guidance for Pondok Pesantren.
- Shows non-blocking warning if jumlah santri is empty or zero.
- Supports upload/catatan for dokumentasi kegiatan.
- Sensitive pengurus NIK fields are masked.
- Pengurus religion fields are controlled-reference fields and permission-aware.

Labels:
`sikesra`, `uiux`, `forms`, `documents`, `sensitive-data`, `religion-reference`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms, Religion Fields, and Vulnerable Person Modules`

---

## Issue 3.4 — Implement Lembaga Kesejahteraan Sosial form UI

Title:
`[SIKESRA UI/UX] Implement Lembaga Kesejahteraan Sosial form UI with religion reference support and vulnerable-person links`

Summary:
Create form for Baznas, PWRI, Panti Asuhan, Panti Yatim, Panti Jompo, Rukun Kematian, Majelis Taklim, including agama lembaga where relevant, legal documents, activities, pengasuh, anak asuh, pengurus, contacts, and religion references for personal data.

Religion-reference requirements:

- Add agama lembaga where relevant.
- Add agama pengurus and agama pengasuh/wali where relevant.
- Do not expose individual-level religion for children, elderly people, or beneficiaries unless the detailed person module requires it and permission allows it.

Lansia Terlantar impact:

- If LKS category is Panti Jompo or similar elderly care institution, the UI may link to Lansia Terlantar records or show aggregate counts only where authorized.
- Avoid duplicating individual elderly records inside LKS unless explicitly designed as linked records.

Acceptance criteria:

- Supports all PRD LKS categories.
- Supports agama lembaga using controlled reference select where applicable.
- Shows Jumlah Pengasuh and Jumlah Anak Asuh for panti-related categories.
- Supports elderly-related contextual labels for Panti Jompo where appropriate.
- Hides or contextualizes Jumlah Anak Asuh for Rukun Kematian where not relevant.
- Supports Badan Hukum, SK Kepengurusan, and Dokumentasi Kegiatan.
- Sensitive fields are masked.
- Personal religion fields are permission-aware.

Labels:
`sikesra`, `uiux`, `forms`, `documents`, `sensitive-data`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `privacy`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms, Religion Fields, and Vulnerable Person Modules`

---

## Issue 3.5 — Implement Guru Agama form UI

Title:
`[SIKESRA UI/UX] Implement Guru Agama form UI with religion reference support`

Summary:
Create form for individual Guru Agama with identity, NIK, TTL, agama guru, address, region, institutional or non-institutional teaching context, teaching place information where relevant, contacts, and notes.

Religion-reference requirements:

- Add `Agama Guru` as a controlled reference field.
- Allow the form to capture the teaching context, for example whether the teacher is attached to a lembaga/institusi or teaches independently, when relevant to operational needs.
- If linked to a lembaga, the UI may optionally show `Agama Lembaga` or derive it from the selected institution when appropriate.
- Treat religion field as personal/sensitive attribute in viewer/export contexts.

Acceptance criteria:

- Guru Agama form supports the required identity, address, wilayah, and institutional context fields according to the PRD.
- If the teacher is linked to a lembaga/institusi, the related institution fields appear contextually.
- Agama Guru uses a controlled reference select.
- NIK is highly restricted and masked.
- Religion display is permission-aware in read-only, list, and export contexts.
- Required fields and validation match the PRD plus the religion-reference requirement.
- Operator-facing UI does not use `Guru Ngaji` as the general module label.

Labels:
`sikesra`, `uiux`, `forms`, `sensitive-data`, `religion-reference`, `personal-data`, `privacy`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms, Religion Fields, and Vulnerable Person Modules`

---

## Issue 3.6 — Implement Anak Yatim form UI with privacy protections

Title:
`[SIKESRA UI/UX][Security] Implement Anak Yatim form UI with child data privacy and religion reference protections`

Summary:
Create form for Anak Yatim, Anak Piatu, Anak Yatim Piatu including identity, NIK/KIA, TTL, gender, agama anak, school, wali/pengasuh, agama wali/pengasuh, KK upload, and wali contacts.

Religion-reference requirements:

- Add `Agama Anak` using controlled reference select.
- Add `Agama Wali/Pengasuh` where relevant.
- Treat child religion data as sensitive personal data.
- Viewer/export contexts must minimize and protect child religion data.

Security requirements:

- Show child-data privacy warning banner.
- Mask NIK/KIA by default.
- Protect religion fields under privacy/data minimization rules.
- Export of child data, including religion, must be permission-aware and auditable.
- Viewer contexts must not expose unnecessary personal data.

Acceptance criteria:

- Supports all PRD fields plus religion reference fields.
- NIK/KIA and wali NIK use sensitive field component.
- Agama Anak and Agama Wali/Pengasuh use controlled reference select.
- Kartu Keluarga document upload slot is available.
- Privacy banner explicitly covers child data and religion data.
- Data minimization is applied in read-only contexts.

Labels:
`sikesra`, `uiux`, `forms`, `sensitive-data`, `religion-reference`, `personal-data`, `privacy`, `security`, `documents`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms, Religion Fields, and Vulnerable Person Modules`

---

## Issue 3.7 — Implement Lansia Terlantar form UI with vulnerable-person privacy protections

Title:
`[SIKESRA UI/UX][Security] Implement Lansia Terlantar form UI with vulnerable-person privacy and religion reference protections`

Summary:
Create form for Lansia Terlantar with fields and rules similar to Anak Yatim, adapted for abandoned elderly people: identity, NIK/No KK, birth date or estimated age, gender, agama lansia, address, region, living condition, abandonment condition, priority needs, pendamping/penanggung jawab, agama pendamping, supporting documents, and contacts.

Religion-reference requirements:

- Add `Agama Lansia` using controlled reference select.
- Add `Agama Pendamping/Penanggung Jawab` where relevant and allowed.
- Treat religion data combined with elderly/vulnerable-person status as sensitive personal data.
- Viewer/export contexts must minimize and protect individual religion data.

Field requirements:

- Kategori Lansia: Lansia Terlantar, Lansia Hidup Sendiri, Lansia Tanpa Pengampu, Lansia Rentan Sosial, Lainnya if approved.
- Nama Lengkap Lansia: required.
- NIK Lansia: sensitive/highly restricted, optional or required based on policy.
- No KK: sensitive/highly restricted, optional.
- Tempat Lahir: optional.
- Tanggal Lahir or Perkiraan Umur: required where exact date is unknown.
- Jenis Kelamin: required.
- Agama Lansia: controlled reference, permission-aware.
- Alamat Domisili: required.
- Kecamatan and Desa/Kelurahan: required official region cascade.
- Wilayah Custom/Dusun/RT/RW/Zona: optional, not part of ID SIKESRA 20D.
- Kondisi Tempat Tinggal: rumah sendiri/menumpang/tidak tetap/panti/di jalan/lainnya.
- Kondisi Keterlantaran: hidup sendiri/tanpa keluarga/tidak mampu/tidak terurus/tidak diketahui/lainnya.
- Kondisi Fisik Umum: mandiri/perlu bantuan sebagian/terbaring/perlu pendampingan.
- Memiliki Disabilitas: yes/no/unknown, optionally link to Disabilitas module.
- Kebutuhan Prioritas: makanan/tempat tinggal/kesehatan/dokumen kependudukan/pendampingan/bantuan sosial/lainnya.
- Pendamping/Penanggung Jawab fields: name, NIK, relationship, religion, address, phone/WA, email.

Document requirements:

- KTP Lansia.
- Kartu Keluarga.
- Surat Keterangan Tidak Mampu or Surat Keterangan Terlantar if available.
- Surat Keterangan Domisili if needed.
- Foto Kondisi/Tempat Tinggal if policy allows.
- Dokumen Bantuan Sosial if available.
- Dokumen Lain.

Security requirements:

- Show vulnerable-person privacy warning banner.
- Mask NIK/No KK by default.
- Protect religion, health-related notes, assistance status, and living condition notes under privacy/data minimization rules.
- Export of Lansia Terlantar data, including religion, must be permission-aware and auditable.
- Viewer contexts must not expose unnecessary personal data.
- Use respectful and non-stigmatizing UI copy.

Acceptance criteria:

- Supports all required Lansia Terlantar fields above.
- NIK Lansia, No KK, and Pendamping NIK use sensitive field component.
- Agama Lansia and Agama Pendamping/Penanggung Jawab use controlled reference select.
- Document upload slots for KTP, KK, SKTM/Surat Keterangan Terlantar, Domisili, Foto Kondisi, Dokumen Bantuan, and Dokumen Lain are available based on policy.
- Privacy banner explicitly covers elderly/vulnerable-person data and religion data.
- Data minimization is applied in read-only contexts.
- Duplicate warning uses name + region + estimated birth/age + NIK hash where available.
- Unknown/not recorded values are allowed only where policy allows.

Labels:
`sikesra`, `uiux`, `forms`, `sensitive-data`, `religion-reference`, `personal-data`, `vulnerable-person`, `lansia-terlantar`, `privacy`, `security`, `documents`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms, Religion Fields, and Vulnerable Person Modules`

---

## Issue 3.8 — Implement Disabilitas form UI with sensitive data protections

Title:
`[SIKESRA UI/UX][Security] Implement Disabilitas form UI with religion reference and sensitive data protections`

Summary:
Create form for disability data including identity, NIK/KIA, TTL, gender, agama penyandang disabilitas, address, region, jenis disabilitas, subjenis sensorik, tingkat keparahan, wali/pengasuh, agama wali/pengasuh, and contacts.

Religion-reference requirements:

- Add `Agama Penyandang Disabilitas` using controlled reference select.
- Add `Agama Wali/Pengasuh` where relevant.
- Treat religion and disability data combination as highly sensitive for UI visibility and export.

Lansia Terlantar relation:

- If an elderly person has disability, optionally support cross-linking or reference to Disabilitas module where backend supports it.
- Do not duplicate sensitive records without clear linkage and policy.

Acceptance criteria:

- Jenis disabilitas supports Fisik, Intelektual, Mental, Sensorik.
- Subjenis sensorik appears only when jenis disabilitas is Sensorik.
- Tingkat keparahan is required: Ringan, Sedang, Berat.
- Agama Penyandang Disabilitas uses controlled reference select.
- Agama Wali/Pengasuh uses controlled reference select where relevant.
- NIK/KIA is highly restricted and masked.
- Sensitive data warning covers disability and religion data.

Labels:
`sikesra`, `uiux`, `forms`, `sensitive-data`, `religion-reference`, `personal-data`, `vulnerable-person`, `privacy`, `security`, `mvp`, `type: security`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 3: Module Forms, Religion Fields, and Vulnerable Person Modules`

---

# Epic 4 — ID SIKESRA, Documents, and Verification

## Issue 4.1 — Implement ID SIKESRA 20-digit UI states and explanation modal

Title:
`[SIKESRA UI/UX] Implement ID SIKESRA 20-digit UI states and explanation modal`

Summary:
Implement UI states for ID SIKESRA: belum dapat dibuat, siap dibuat, sudah dibuat, perlu koreksi khusus. Add copy button and explanation modal showing kode desa, jenis, subjenis, and sequence.

Religion-reference impact:
Religion fields must not change the 20-digit ID format unless future policy explicitly changes the ID design. The UI should not imply that religion is part of the ID if it is not.

Lansia Terlantar impact:
Add Lansia Terlantar object type/subtype support in code preview/planning where backend code master supports it. Do not include vulnerable status, religion, age, or gender in ID.

Acceptance criteria:

- Shows `Belum dibuat` when no ID exists.
- Generate button is disabled until minimum fields are complete.
- Missing field list is shown when generation is blocked.
- Explanation modal shows ID structure.
- Explanation modal clearly shows that religion, elderly status details, health condition, and assistance status are not part of the ID unless policy changes.
- Correction flow is visible only to authorized admins.
- Lansia Terlantar can be represented in type/subtype code planning when supported.

Labels:
`sikesra`, `uiux`, `forms`, `region-scope`, `rbac-abac`, `religion-reference`, `lansia-terlantar`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 4: Code, Documents, and Verification`

---

## Issue 4.2 — Implement document upload card and document list UI

Title:
`[SIKESRA UI/UX] Implement document upload card and document list UI including Lansia Terlantar documents`

Summary:
Create document upload UI for SK Kepengurusan, SK Pendirian, Badan Hukum, ID Masjid, Foto Bangunan, Dokumentasi Kegiatan, Kartu Keluarga, Lansia Terlantar documents, and Dokumen Lain.

Religion-reference impact:
Documents may contain sensitive personal data, including religion information in identity/family documents. Preview and access must be permission-aware.

Lansia Terlantar impact:
Support document slots for KTP Lansia, Kartu Keluarga, Surat Keterangan Tidak Mampu, Surat Keterangan Terlantar, Surat Keterangan Domisili, Foto Kondisi/Tempat Tinggal, Dokumen Bantuan Sosial, and Dokumen Lain.

Acceptance criteria:

- Document upload card supports document type, file picker, document number, issuer, issued date, expiry date, notes, status, and preview.
- Shows file size and allowed file types before upload.
- Shows upload progress.
- Replacing a document marks old document as superseded in UI.
- Access to preview is permission-aware.
- UI warns that uploaded documents may contain sensitive data including identity, religion, elderly condition, and assistance information.
- Lansia Terlantar document types are available where policy enables them.

Labels:
`sikesra`, `uiux`, `documents`, `security`, `sensitive-data`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `privacy`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 4: Code, Documents, and Verification`

---

## Issue 4.3 — Implement verification review page and decision workflow UI

Title:
`[SIKESRA UI/UX] Implement verification review page and decision workflow UI`

Summary:
Build verification review UI with summary, last changes, minimum field completeness, document completeness, region validation, religion field validation where applicable, Lansia Terlantar field validation, petugas notes, verifier notes, and decision actions.

Acceptance criteria:

- Verifikator can choose Verifikasi, Butuh Perbaikan, or Tolak.
- Butuh Perbaikan requires field/section, note, priority, and optional due date.
- Rejected requires reason.
- Verified requires confirmation.
- Religion fields are included in completeness/validation checks where required by module policy.
- Lansia Terlantar fields are included in completeness/validation checks where required by module policy.
- Individual-level religion and vulnerable-person values are shown only to authorized verifikator roles.
- All decisions are prepared for audit logging.
- Buttons are permission-aware.

Labels:
`sikesra`, `uiux`, `verification`, `audit-log`, `rbac-abac`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `privacy`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 4: Code, Documents, and Verification`

---

## Issue 4.4 — Implement need_revision UX in edit forms

Title:
`[SIKESRA UI/UX] Implement need_revision UX with inline verifier notes`

Summary:
When data has status need_revision, show verifier notes near related fields and highlight sections requiring correction.

Religion-reference impact:
If a religion field requires correction, show verifier notes near the relevant `Agama` field while respecting privacy and permission rules.

Lansia Terlantar impact:
If Lansia Terlantar fields require correction, show verifier notes near the related section: identity, region, living condition, abandonment condition, caregiver, documents, or priority needs.

Acceptance criteria:

- Need_revision banner appears at top of edit form.
- Related fields are highlighted.
- Verifier notes appear near field/section.
- Religion-related correction notes appear near the correct Agama field.
- Lansia Terlantar correction notes appear near the correct elderly/vulnerable-person section.
- Petugas can update and resubmit.
- Previous notes remain visible in verification history.

Labels:
`sikesra`, `uiux`, `verification`, `forms`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 4: Code, Documents, and Verification`

---

# Epic 5 — Import, Export, Audit, Users, and Access Management

## Issue 5.1 — Implement Import Excel staging UI

Title:
`[SIKESRA UI/UX] Implement Import Excel staging UI with religion and Lansia Terlantar mapping`

Summary:
Build import workflow UI: upload Excel, choose sheets, map columns, validate, review staging rows, promote to master, and generate ID when valid.

Religion-reference requirements:

- Add mapping support for religion/agama columns.
- Validate agama values against controlled reference list.
- Provide normalization for spelling variants such as Katolik/Katholik, Buddha/Budha, Konghucu/Konghuchu.
- Mark unmapped/unknown religion values as needs_review.
- Avoid automatic promotion of invalid religion values into master data.

Lansia Terlantar requirements:

- Add mapping support for Lansia Terlantar fields: category, name, NIK, No KK, birth date or estimated age, gender, religion, address, region, living condition, abandonment condition, priority needs, caregiver/guardian data, and documents metadata.
- Mark missing critical fields as invalid or needs_review based on policy.
- Validate estimated age/date fields carefully.
- Validate NIK/No KK format where available without exposing raw values in logs.

Acceptance criteria:

- Upload step supports Excel file selection.
- Sheet selection step is available.
- Column mapping UI exists.
- Religion/agama column mapping is supported.
- Lansia Terlantar column mapping is supported.
- Validation result displays valid, invalid, needs_review counts.
- Staging review table displays religion and Lansia Terlantar mapping errors and editable mapped data.
- Promotion action is permission-aware.
- Import does not directly bypass staging.

Labels:
`sikesra`, `uiux`, `import-excel`, `registry`, `religion-reference`, `master-data`, `lansia-terlantar`, `vulnerable-person`, `privacy`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`

---

## Issue 5.2 — Implement reports and export UI with sensitive data confirmation

Title:
`[SIKESRA UI/UX][Security] Implement reports and export UI with religion-aware and vulnerable-person sensitive data confirmation`

Summary:
Create reports and export UI for module recap, region recap, verification status, document completeness, rumah ibadah by type, lembaga keagamaan by agama, anak yatim by school level, lansia terlantar by category/condition/priority need, disabilitas by type/severity, religion-based authorized summaries, and need_revision/rejected.

Religion-reference requirements:

- Add authorized aggregate reports by religion where relevant.
- Individual-level religion export must require explicit permission.
- Export modal must mention religion data if included.
- Viewer roles must receive aggregate/public-safe reports only.

Lansia Terlantar requirements:

- Add authorized aggregate reports by category, region, verification status, living condition, abandonment condition, priority needs, assistance status, and document completeness.
- Individual-level Lansia Terlantar export must require explicit permission and confirmation.
- Export modal must mention elderly/vulnerable-person data if included.

Acceptance criteria:

- Supports minimum report types from PRD.
- Supports Lansia Terlantar aggregate reports where authorized.
- Supports religion-based aggregate reports where authorized.
- Supports CSV/XLSX export.
- Export of sensitive data, including individual-level religion and Lansia Terlantar data, requires permission and confirmation checkbox.
- Export action is prepared for audit logging.
- Viewer role receives aggregate/public-safe reports only.

Labels:
`sikesra`, `uiux`, `export-report`, `sensitive-data`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `privacy`, `security`, `audit-log`, `mvp`, `type: security`, `priority: critical`

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
- Region filters can be combined with religion filters where authorized.
- Region filters can be combined with Lansia Terlantar filters where authorized.

Labels:
`sikesra`, `uiux`, `region-scope`, `forms`, `religion-reference`, `lansia-terlantar`, `mvp`, `type: feature`, `priority: critical`

Milestone:
`SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`

---

## Issue 5.4 — Implement audit log viewer UI

Title:
`[SIKESRA UI/UX] Implement audit log viewer UI for SIKESRA actions including religion and Lansia Terlantar field changes`

Summary:
Create audit log viewer with filters and detail view for create, update, delete_soft, generate_code, submit, verify, upload, export actions, including changes involving religion fields and Lansia Terlantar fields.

Acceptance criteria:

- Audit log table includes time, user, role, module, entity, action, summary, IP/device if available, and detail button.
- Detail shows before/after changes where available.
- Religion field changes are included in audit details but masked or generalized for unauthorized viewers.
- Lansia Terlantar field changes are included in audit details but masked or generalized for unauthorized viewers.
- Access is restricted to authorized admin/auditor roles.
- Sensitive values are masked unless user has permission.

Labels:
`sikesra`, `uiux`, `audit-log`, `security`, `sensitive-data`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `privacy`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`

---

## Issue 5.5 — Implement users, roles, permissions, and region scope UI

Title:
`[SIKESRA UI/UX] Implement users, roles, permissions, and region scope UI for SIKESRA with religion and vulnerable-person data permissions`

Summary:
Create UI for user listing, user form, role assignment, region scope assignment, 2FA status, permission matrix, and explicit permissions for viewing/exporting individual-level religion and vulnerable-person data.

Religion-reference requirements:

- Add permission planning for reading/exporting individual-level religion data.
- Ensure viewer roles cannot access sensitive individual religion data unless explicitly authorized.
- Add permission matrix rows for religion-related access if backend permission model supports it.

Lansia Terlantar requirements:

- Add permission planning for reading/exporting Lansia Terlantar individual-level data.
- Ensure viewer roles cannot access sensitive elderly/vulnerable-person data unless explicitly authorized.
- Add permission matrix rows for vulnerable-person data access if backend permission model supports it.

Acceptance criteria:

- User table shows name, email/username, role, region scope, account status, 2FA status, and last login.
- User form supports role and region scope assignment.
- Permission matrix shows key SIKESRA permissions.
- Permission matrix includes religion-sensitive and vulnerable-person data permissions or documents a backend-needed dependency.
- Sensitive roles can require 2FA.
- Only authorized admins can access this UI.

Labels:
`sikesra`, `uiux`, `rbac-abac`, `region-scope`, `religion-reference`, `personal-data`, `vulnerable-person`, `lansia-terlantar`, `privacy`, `security`, `mvp`, `type: feature`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Sprint 5: Import, Export, Audit, and Access Management`

---

# Epic 6 — Hardening, Accessibility, Testing, and Documentation

## Issue 6.1 — Add accessibility and usability checks for SIKESRA UI

Title:
`[SIKESRA UI/UX] Add accessibility and usability checks for SIKESRA admin UI`

Summary:
Ensure the SIKESRA UI meets minimum accessibility and usability standards from the PRD and additional Lansia Terlantar requirement.

Acceptance criteria:

- Buttons have explicit labels.
- Status badges do not rely on color only.
- Form errors are clear and near fields.
- Religion reference select is keyboard-accessible.
- Lansia Terlantar controlled selects are keyboard-accessible.
- Keyboard navigation works for key form and modal flows.
- Tables are usable on desktop and tablet.
- Error messages use clear Indonesian language.
- Lansia Terlantar UI copy uses respectful and non-stigmatizing language.

Labels:
`sikesra`, `uiux`, `accessibility`, `testing`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `mvp`, `type: test`, `priority: high`

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
- Religion select fields remain usable on tablet/mobile screens.
- Lansia Terlantar forms remain usable on tablet/mobile screens.

Labels:
`sikesra`, `uiux`, `responsive`, `accessibility`, `religion-reference`, `lansia-terlantar`, `mvp`, `type: feature`, `priority: medium`

Milestone:
`SIKESRA UI/UX MVP - Hardening: Accessibility, Security UX, Tests, and Documentation`

---

## Issue 6.3 — Add UI tests for critical SIKESRA workflows

Title:
`[SIKESRA UI/UX] Add UI tests for critical SIKESRA workflows including religion reference and Lansia Terlantar handling`

Summary:
Add tests for navigation, list filters, form validation, religion reference select behavior, ID generation UI states, document upload UI, verification workflow, sensitive field masking, Lansia Terlantar form behavior, and export confirmation.

Acceptance criteria:

- Tests cover menu visibility by role where test utilities exist.
- Tests cover form required validations.
- Tests cover religion reference select and normalization behavior where applicable.
- Tests cover sensitive field masking.
- Tests cover individual-level religion data visibility restrictions.
- Tests cover Lansia Terlantar sensitive field visibility restrictions.
- Tests cover Lansia Terlantar required/conditional fields.
- Tests cover need_revision note display.
- Tests cover export confirmation modal when religion or Lansia Terlantar data is included.
- Tests can run in CI.

Labels:
`sikesra`, `uiux`, `testing`, `security`, `rbac-abac`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `privacy`, `mvp`, `type: test`, `priority: high`

Milestone:
`SIKESRA UI/UX MVP - Hardening: Accessibility, Security UX, Tests, and Documentation`

---

## Issue 6.4 — Write SIKESRA UI/UX implementation documentation

Title:
`[SIKESRA UI/UX] Write implementation documentation for SIKESRA admin UI/UX including religion reference and Lansia Terlantar handling`

Summary:
Document SIKESRA UI routes, components, form patterns, status badges, sensitive field handling, religion reference handling, Lansia Terlantar handling, verification flow, import/export flow, and role/permission visibility.

Acceptance criteria:

- Documentation explains route structure.
- Documentation explains reusable components.
- Documentation explains religion reference component and normalization rules.
- Documentation explains where religion fields appear across modules and personal data.
- Documentation explains sensitive data masking policy, including religion for individuals.
- Documentation explains Lansia Terlantar module fields, privacy rules, document types, and reporting/export limitations.
- Documentation explains that the general module label is `Guru Agama`, not `Guru Ngaji`, because guru ngaji is specific to Islamic teaching context.
- Documentation explains workflow states.
- Documentation includes screenshots or text wireframes if screenshots are not available.
- Documentation links to related GitHub Issues.

Labels:
`sikesra`, `uiux`, `documentation`, `religion-reference`, `lansia-terlantar`, `vulnerable-person`, `privacy`, `mvp`, `type: docs`, `priority: medium`

Milestone:
`SIKESRA UI/UX MVP - Hardening: Accessibility, Security UX, Tests, and Documentation`

---

## Recommended Issue Dependency Order

Use this implementation dependency order:

1. Issue 1.1 — Navigation.
2. Issue 1.2 — Status badges.
3. Issue 1.5 — Religion reference master data planning and reusable Agama select.
4. Issue 1.3 — Form/wizard components.
5. Issue 1.4 — Sensitive field component.
6. Issue 5.3 — Region components.
7. Issue 2.1 — Dashboard.
8. Issue 2.2 — Registry list.
9. Issue 2.3 — Detail pattern.
10. Issue 4.1 — ID SIKESRA UI.
11. Issues 3.1–3.8 — Module forms with religion fields and vulnerable-person modules.
12. Issue 4.2 — Documents UI.
13. Issues 4.3–4.4 — Verification UI.
14. Issue 5.1 — Import Excel UI with religion and Lansia Terlantar mapping.
15. Issue 5.2 — Reports/export UI with religion-aware and vulnerable-person confirmation.
16. Issue 5.4 — Audit log UI including religion and Lansia Terlantar field changes.
17. Issue 5.5 — Users/access UI including religion and vulnerable-person data permissions.
18. Issues 6.1–6.4 — Hardening, tests, documentation.

---

## GitHub Issue Body Template

Use this body format for every issue:

```markdown
## Summary

<!-- Explain the feature/task briefly. -->

## PRD Context

<!-- Cite the relevant PRD section title and summarize the requirement. -->

## Religion Reference Impact

<!-- Explain whether this issue needs Agama/religion reference support, controlled reference data, filtering, masking, import/export, or audit behavior. If not applicable, state: Not applicable. -->

## Lansia Terlantar Impact

<!-- Explain whether this issue needs Lansia Terlantar support, vulnerable-person privacy, filtering, document handling, import/export, or audit behavior. If not applicable, state: Not applicable. -->

## Terminology Notes

<!-- Explain terminology requirements where relevant. Example: use Guru Agama as the general module label, not Guru Ngaji, because Guru Ngaji is part of Islamic teaching context. -->

## Scope

- [ ] ...
- [ ] ...

## Out of Scope

- ...

## UI/UX Requirements

- [ ] Use Indonesian operator-facing labels
- [ ] Use controlled reference select for Agama/religion fields where applicable
- [ ] Use respectful and non-stigmatizing language for vulnerable-person modules
- [ ] Do not expose internal field names in the UI
- [ ] Use `Guru Agama` as the general module label, not `Guru Ngaji`, where applicable
- [ ] ...

## Security and Privacy Requirements

- [ ] Permission-aware UI
- [ ] Sensitive data masked by default where applicable
- [ ] Individual-level religion data protected where applicable
- [ ] Child, elderly, and disability data protected as vulnerable-person data where applicable
- [ ] Region scope respected where applicable
- [ ] Export/reveal actions prepared for audit logging where applicable

## Technical Notes

- Use existing AWCMS Mini admin layout and component conventions when available.
- Prefer reusable components over module-specific duplication.
- Keep labels in formal Indonesian for operator-facing UI.
- Do not expose internal database field names in operator-facing UI.
- Religion values should come from a controlled master/reference list, not arbitrary free text by default.
- Lansia Terlantar should reuse person/vulnerable-person patterns where available, but must not expose sensitive data by default.

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
- [ ] Manual test for religion reference field behavior where applicable
- [ ] Manual test for Lansia Terlantar behavior where applicable
- [ ] Manual test for export restrictions where religion, child, elderly, or disability data is included
- [ ] Manual test that the general module label uses `Guru Agama`, not `Guru Ngaji`, where applicable

## Dependencies

- Depends on: #...
- Blocks: #...

## References

- PRD UI/UX SIKESRA AWCMS Mini
- Additional requirement: add religion reference field to all related personal data and all relevant modules
- Additional requirement: remove `Guru Ngaji` from the general Guru Agama module label because it is part of Islamic teaching context
- Additional requirement: add Lansia Terlantar module similar to Anak Yatim but adapted for abandoned elderly people
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

Do not create duplicate issues. If a similar issue already exists, update it with missing PRD details, religion-reference requirements, Guru Agama terminology requirements, and Lansia Terlantar requirements instead of creating a new issue.

---

## Quality Bar

The final issue set is acceptable only if:

- Every major PRD UI/UX section is represented by at least one issue.
- Religion reference handling is represented in foundation, module forms, import, export, audit, access control, tests, and documentation.
- Sensitive data handling has dedicated security issues.
- Individual-level religion data is treated as personal/sensitive data in UI planning.
- Lansia Terlantar is represented as a dedicated vulnerable-person module with form, list/filter, dashboard, import/export, audit, permission, testing, and documentation coverage.
- ID SIKESRA 20-digit UI has a dedicated critical issue and does not incorrectly include religion, elderly condition, or assistance status in the ID format.
- Each module form has its own issue.
- The general teacher module is consistently labeled `Guru Agama`, not `Guru Agama/Guru Ngaji` or `Guru Ngaji`.
- Import, export, audit log, verification, region scope, religion reference, Lansia Terlantar, and RBAC/ABAC each have dedicated issue coverage.
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

## Religion Reference Coverage
- Master/reference data: ...
- Module forms: ...
- Personal data: ...
- Import/export: ...
- Access control/privacy: ...
- Audit/testing/docs: ...

## Guru Agama Terminology Coverage
- General module label: `Guru Agama`
- Removed general use of: `Guru Ngaji`
- Islamic teaching context handling: ...

## Lansia Terlantar Coverage
- Module navigation/list/detail/form: ...
- Sensitive/vulnerable-person data protection: ...
- Documents: ...
- Import/export/reporting: ...
- Verification/audit/access control: ...
- Testing/docs: ...

## Risks / Blockers
- ...

## Recommended Next Step
- ...
```

---

## Important Constraints

- Do not hardcode secrets.
- Do not expose credentials in issues.
- Do not expose NIK/KIA, No KK, or sample real personal data.
- Do not expose real individual religion data in examples.
- Do not expose real elderly/vulnerable-person data in examples.
- Do not implement public access to sensitive data.
- Do not assume Supabase-first architecture.
- Do not assume AWCMS full multi-tenant behavior.
- Do not use arbitrary free text for religion fields by default.
- Do not use `Guru Ngaji` as the general module label.
- Use respectful and non-stigmatizing language for Lansia Terlantar.
- Keep SIKESRA MVP aligned with AWCMS Mini single-tenant.
- Keep all sensitive UI behavior aligned with RBAC/ABAC, region scope, auditability, privacy, and data minimization.

