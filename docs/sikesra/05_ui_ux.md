# 05 UI/UX

## UX Principles

1. Preserve EmDash admin patterns and design language.
2. Use Kumo/semantic tokens where available.
3. Public page is mobile-first and aggregate-safe.
4. Admin screens prioritize desktop/tablet operator workflows and remain responsive-basic on mobile.
5. Long forms use progressive sections, autosave, validation summaries, and review step.
6. Official regions and local regions must be visually distinct.
7. Sensitive data is visible as a state: masked values, lock badges, warnings, reasons, and audit consequences.
8. Hidden UI actions are not security. Backend access flags and API permissions are authoritative.

## Surface Map

| Surface | Route | Primary Users |
|---|---|---|
| Public overview | `/sikesra` | Public, leadership without login. |
| Admin dashboard | `/_emdash/admin/plugins/sikesra` | Admins, verifiers, leadership. |
| Registry | `/_emdash/admin/plugins/sikesra/entities` | Admins, operators, verifiers. |
| Create wizard | `/_emdash/admin/plugins/sikesra/entities/new` | Operators and admins. |
| Entity detail | `/_emdash/admin/plugins/sikesra/entities/{id}` | Authorized admin users. |
| Verification | `/_emdash/admin/plugins/sikesra/verification` | Verifiers. |
| Imports | `/_emdash/admin/plugins/sikesra/imports` | Import operators/admins. |
| Documents | `/_emdash/admin/plugins/sikesra/documents` | Operators/verifiers. |
| Reports | `/_emdash/admin/plugins/sikesra/reports` | Leadership, admins, auditors. |
| Regions | `/_emdash/admin/plugins/sikesra/regions` | Admin kabupaten/kecamatan. |
| Access | `/_emdash/admin/plugins/sikesra/access` | Super admin, governance roles. |
| Audit | `/_emdash/admin/plugins/sikesra/audit` | Auditors and super admins. |
| Settings | `/_emdash/admin/plugins/sikesra/settings` | Super admins. |

## Admin Navigation

Menu contribution:

```txt
SIKESRA
Dashboard
Data Utama
Verifikasi
Import Excel
Dokumen
Laporan
Wilayah
Atribut & Akses
Audit
Pengaturan
```

Each entry must be permission-aware. Direct route/API access must still be protected by the backend.

## Public Page

Required sections:

1. Header integrated with active AWCMS theme.
2. Hero: title, description, last update, data scope note.
3. Safety notice: aggregate-only explanation.
4. KPI cards: total entities, verified entities, active villages, latest update.
5. Filter bar: kecamatan, desa/kelurahan where safe, object type, year, aggregate status.
6. Charts: type/subtype, region, verification status, safe attributes.
7. Optional aggregate region map with no exact sensitive points.
8. Program information and official contact.
9. Footer links and privacy caveat.

Public page must not import or call the admin API client.

## Admin Dashboard

Required widgets:

1. Scope header: tenant/site, region scope, environment badge.
2. KPIs: total, draft, submitted, verified, need revision, rejected.
3. Work queues: pending verification, duplicate candidates, incomplete documents, import review, failed exports/security attention where authorized.
4. Regional summary: region, total, completion percent, verification percent, score label.
5. Attribute summary: agama, terlantar, desil only where policy allows.
6. Activity feed from audit events.
7. Permission-aware quick actions.

## Registry List

Columns:

1. ID SIKESRA.
2. Type/subtype badges.
3. Display name, masked if required.
4. Official region.
5. Local region if authorized.
6. Data status.
7. Verification status.
8. Completeness.
9. Sensitivity.
10. Contextual actions.

Filters:

1. Keyword.
2. Object type/subtype.
3. Kecamatan.
4. Desa/kelurahan.
5. Local region if authorized.
6. Data status.
7. Verification status.
8. Sensitivity.
9. Source input.
10. Duplicate status.
11. Completeness range.

## Progressive Wizard

Wizard steps:

1. Jenis Data.
2. Wilayah Resmi.
3. Wilayah Rinci Lokal.
4. Identitas Utama.
5. Atribut Inti.
6. Detail Modul.
7. Pengurus/Wali/Pengasuh.
8. Dokumen Pendukung.
9. Validasi dan Duplikasi.
10. Generate ID.
11. Review dan Submit.

UX requirements:

1. Autosave after meaningful field changes.
2. Manual save button.
3. Section and overall completeness.
4. Inline validation tied to API section keys.
5. Verifier notes per field/section.
6. Required/recommended/optional field distinction.
7. Sensitive field badges and masking preview.
8. Duplicate warnings with risk levels.
9. Unsaved-change warning where needed.
10. Keyboard-accessible step navigation.

## ID Generation UI

1. Show ID structure preview before generation.
2. Disable generation until backend validation allows it.
3. Explain RT/RW/local region does not affect ID.
4. Show generated ID in monospace with copy action.
5. Lock generated ID for normal users.
6. Correction requires special permission, reason, confirmation, and audit.

## Entity Detail

Layout:

1. Header with display name, ID, status badges, sensitivity badge, primary actions.
2. Summary panel with type, region, source, created/updated metadata.
3. Tabs: Ringkasan, Detail Modul, Atribut, Dokumen, Verifikasi, Riwayat Bantuan/Layanan, Audit.
4. Right rail with completeness, duplicate signals, next verification action, recent notes.

Action availability must use backend `access` flags.

## Verification UI

Queue filters:

1. Level.
2. Module.
3. Region.
4. Submission age.
5. Risk.
6. Completeness.
7. Duplicate status.

Review screen:

1. Summary and checklist.
2. Field-level comments.
3. Document checklist.
4. Duplicate compare summary.
5. Decision panel.
6. Mandatory reason for revision/rejection.
7. Confirmation modal explaining audit consequence.

## Import UI

Steps:

1. Upload workbook.
2. Select sheet.
3. Map columns.
4. Validate mapping.
5. Preview staging rows.
6. Correct invalid rows.
7. Review duplicate candidates.
8. Promote selected valid rows.
9. Display import report.

Invalid, needs-review, duplicate, promoted, skipped, and failed states must be visually distinct.

## Document UI

Upload component must:

1. Show accepted types and max size.
2. Require document type.
3. Require classification: internal, restricted, highly restricted.
4. Show checksum and upload status after confirmation.
5. Show quarantine/failed state where applicable.

Document list must show document type, original filename where allowed, classification, verification status, uploader, MIME, size, checksum, and allowed actions.

Preview/download must use backend response URL/proxy only and never display raw R2 key.

## Accessibility and Content Standards

1. All form controls have labels and error associations.
2. Charts include table or textual alternative.
3. Color is not the only status indicator.
4. Badges use clear labels.
5. Dialogs trap focus and explain consequences.
6. Public page uses semantic landmarks.
7. Indonesian formal language is used consistently.
8. Error messages explain what happened and how to fix it without exposing internals.
