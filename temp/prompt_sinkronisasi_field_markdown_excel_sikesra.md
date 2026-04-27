# Prompt Sinkronisasi Field Markdown SIKESRA Dengan Data Excel Tokoh Agama Kobar

Act as a senior product manager, system analyst, backend architect, database architect, UI/UX architect, data migration analyst, data privacy analyst, security engineer, and GitHub issue planner for the SIKESRA application built on AWCMS Mini.

You are working in this repository:

`https://github.com/ahliweb/sikesra`

Reference repository only:

`https://github.com/ahliweb/awcms-mini`

Do not modify any repository other than `https://github.com/ahliweb/sikesra`. The reference repository `https://github.com/ahliweb/awcms-mini` is read-only and must only be used as an architectural reference.

## Main Task

Synchronize and refine the field definitions, module mappings, religion mappings, data categories, issue planning, and PRD alignment in the following two markdown planning documents using the Excel workbook `DATA TOKOH AGAMA KOBAR.xlsx` as the concrete source of observed field/data evidence:

1. `prompt_backend_planning_git_hub_issues_sikesra_prd_awcms_mini_sikesra_repo_boundary.md`
2. `prompt_planning_git_hub_issues_sikesra_uiux_prd_with_religion_field_guru_agama_lansia_terlantar.md`

The goal is not to blindly replace the two markdown files. The goal is to create a careful alignment plan and, if instructed later, update the appropriate SIKESRA PRD/docs/issues so that the real Excel sheet structure is reflected in the SIKESRA field model.

Start with analysis only unless explicitly instructed to implement file changes.

---

## Excel Workbook Source

Use the workbook:

`DATA TOKOH AGAMA KOBAR.xlsx`

It contains these sheets:

1. `USTAD USTAJAH KOBAR`
2. `MARBOT MASJID KOBAR`
3. `BASIR KOBAR`
4. `TOKOH AGAMA ISLAM, ULAMA KOBAR`
5. `GURU SHM KOBAR`
6. `PASTOR KOBAR`
7. `PENDETA KOBAR`

Treat the Excel workbook as a field evidence source, not as a clean database schema. Some rows may be shifted, incomplete, inconsistent, duplicated, or contain values under the wrong columns. Therefore, do not trust every cell position blindly. Infer field needs from repeated headers, repeated patterns, and PRD requirements.

Do not expose real NIK, No KK, personal phone numbers, real addresses, document links, or other sensitive personal data in examples, issues, screenshots, docs, comments, or test fixtures. Use anonymized placeholders only.

---

## Critical Product Rules

### 1. Use Guru Agama as the General Module Label

Use **Guru Agama** as the general module label.

Do not use **Guru Ngaji** as the general module/table/API/UI label.

If Islamic teaching context is needed, place it in contextual fields such as:

- `aktivitas_mengajar`
- `jenis_pendidikan_keagamaan`
- `nama_tka_tpa`
- `nomor_unit_tka_tpa`
- `lembaga_tempat_mengajar`
- `catatan_konteks_keislaman`

### 2. Religion Must Be Controlled Reference Data

Religion must not be arbitrary free text by default.

Use controlled master/reference data with stable internal codes and aliases.

Recommended normalized religion values:

- `ISLAM` → Islam
- `KRISTEN` → Kristen
- `KATOLIK` → Katolik
- `HINDU` → Hindu
- `BUDDHA` → Buddha
- `KONGHUCU` → Konghucu
- `KEPERCAYAAN` → Kepercayaan Terhadap Tuhan YME, only if legally and operationally approved
- `BELUM_DICATAT` → Belum Dicatat, only if legally and operationally approved

UI labels must be Indonesian and operator-friendly:

- `Agama`
- `Agama Guru`
- `Agama Tokoh`
- `Agama Pelayan Keagamaan`
- `Agama Pengurus`
- `Agama Lembaga`
- `Agama Pendamping/Penanggung Jawab`

Do not expose internal names such as `religion_reference_id` or `religion_code` in operator-facing UI copy.

### 3. Religion Is Sensitive Personal Data

Individual-level religion must be treated as sensitive personal data.

Planning must preserve:

- permission-aware access;
- role/region-scoped visibility;
- masked/minimized default views;
- aggregate-only dashboard behavior by default;
- audit log for sensitive reveal/export/report actions;
- export controls;
- no exposure of individual-level religion in public pages.

### 4. Excel Data Is Operational Evidence, Not Final Legal Taxonomy

Map each sheet to the most appropriate SIKESRA module and religion using observed categories and names, but do not overstate legal certainty.

When the sheet title or category strongly implies a religion, assign a default inferred religion for import normalization, while still allowing controlled override by authorized operators when legally and operationally required.

---

## Required Excel Sheet Mapping

Use this mapping as the initial working assumption, then verify against the workbook during analysis.

| Excel Sheet | Primary SIKESRA Module | Suggested Entity Type | Suggested Religion | Suggested Category / Role |
|---|---|---|---|---|
| `USTAD USTAJAH KOBAR` | Guru Agama | Individual religious educator | Islam | Ustad/Ustajah, TKA/TPA educator, Islamic religious teacher |
| `MARBOT MASJID KOBAR` | Pelayan Keagamaan / Tokoh Keagamaan, optionally linked to Rumah Ibadah | Individual religious service worker | Islam | Marbot Masjid, Imam, Muadzin, Kebersihan Masjid |
| `BASIR KOBAR` | Tokoh/Pelayan Keagamaan | Individual religious/customary religious service worker | Hindu, unless local operator confirms another mapping | Basir |
| `TOKOH AGAMA ISLAM, ULAMA KOBAR` | Tokoh Agama / Guru Agama / Pelayan Keagamaan depending on `Sebagai` | Individual religious figure | Islam | Ulama, Da'i, Tokoh Agama Islam, organization affiliation |
| `GURU SHM KOBAR` | Guru Agama | Individual religious educator | Kristen/Katolik to be normalized based on church/lembaga context where possible | Guru Sekolah Minggu / Guru SHM |
| `PASTOR KOBAR` | Tokoh Agama / Pelayan Keagamaan | Individual religious leader | Katolik by default when Pastor is Catholic context; otherwise allow controlled operator override if local data indicates Christian pastor usage | Pastor |
| `PENDETA KOBAR` | Tokoh Agama / Pelayan Keagamaan | Individual religious leader | Kristen by default | Pendeta |

Important: `Basir` is likely a Hindu religious/customary role in the local context based on names and PHDI/Pura references in the sheet. Treat this as inferred mapping and require operator validation.

Important: `Guru SHM` means Guru Sekolah Hari Minggu/Sekolah Minggu in church context. Map it to Guru Agama with category `Guru Sekolah Minggu` or `Guru SHM`, not to a separate general module unless the PRD explicitly creates such submodule later.

Important: `Pastor` may require local validation because in Indonesian usage it can refer to Catholic priests, while some communities may use related titles differently. Use `Katolik` as default only if the data context confirms Catholic institution/stasi/paroki context; otherwise mark `agama_inferred_status = perlu_validasi`.

---

## Observed Common Excel Fields

From the workbook, the repeated common fields include:

- `No`
- `Kategori Pelayan/Pendidik Keagamaan`
- `Asal Kabupaten/Kota`
- `Nama Lengkap`
- `Nomor Induk Kependudukan (NIK)`
- `Tempat Lahir`
- `Tanggal Lahir`
- `Tempat Tanggal Lahir` in some sheets
- `Jenis Kelamin`
- `Alamat Lengkap`
- `Alamat Rumah`
- `Desa/Kelurahan`
- `Kecamatan`
- `Kabupaten/Kota`
- `Nomor Kontak (HP/WhatsApp)`
- `Nama Lembaga/Rumah Ibadah dan Alamat`
- `Nama TKA/TPA`
- `No. Unit TKA/TPA`
- `Alamat TKA/TPA`
- `Pekerjaan`
- `Masa Kerja`
- `Keterangan`
- `Sebagai`
- `Organisasi/Lembaga terkait`
- `Email Address`
- `Upload Foto KTP`
- `Upload KTP`
- `Upload Kartu Keluarga`
- `Upload Surat Tugas/SK/Rekomendasi`
- document link fields from Google Drive

Use these fields as evidence to refine the module-specific field dictionary.

---

## Required Canonical Field Model For Imported Tokoh/Guru/Pelayan Keagamaan Data

Design or update planning so the canonical import model can absorb all observed Excel fields without losing detail.

Recommended canonical fields:

### A. Identity and Demographics

- `kode_entitas`
- `nama_lengkap`
- `nik_encrypted_or_masked`
- `nik_hash_for_deduplication`
- `tempat_lahir`
- `tanggal_lahir`
- `tempat_tanggal_lahir_raw`
- `jenis_kelamin`
- `agama_id`
- `agama_inferred_from`
- `agama_inferred_status`
- `status_data`
- `status_verifikasi`

### B. Role and Category

- `module_type`
- `entity_type`
- `kategori_pelayan_pendidik_keagamaan`
- `jenis_tokoh_keagamaan`
- `jenis_guru_agama`
- `peran_keagamaan`
- `sebagai`
- `organisasi_keagamaan`
- `pekerjaan`
- `masa_kerja`
- `keterangan`

### C. Institution and Worship Place Linkage

- `nama_lembaga_rumah_ibadah`
- `alamat_lembaga_rumah_ibadah`
- `lembaga_rumah_ibadah_raw`
- `rumah_ibadah_id`
- `lembaga_keagamaan_id`
- `lembaga_pendidikan_keagamaan_id`
- `nama_tka_tpa`
- `nomor_unit_tka_tpa`
- `alamat_tka_tpa`

### D. Address and Region

- `alamat_lengkap`
- `alamat_rumah`
- `desa_kelurahan_id`
- `desa_kelurahan_raw`
- `kecamatan_id`
- `kecamatan_raw`
- `kabupaten_kota_id`
- `kabupaten_kota_raw`
- `provinsi_id`
- `wilayah_custom_id`
- `rt`
- `rw`
- `dusun_lingkungan`
- `latitude`
- `longitude`
- `coordinate_accuracy`
- `coordinate_source`

### E. Contact

- `nomor_hp_wa_encrypted_or_masked`
- `nomor_hp_wa_hash_for_deduplication`
- `email_encrypted_or_masked`
- `kontak_raw`

### F. Documents

- `dokumen_ktp_file_id`
- `dokumen_kk_file_id`
- `dokumen_foto_ktp_file_id`
- `dokumen_surat_tugas_sk_rekomendasi_file_id`
- `dokumen_lainnya_file_id`
- `external_source_url_raw`
- `file_import_source`

### G. Import and Audit Metadata

- `source_workbook`
- `source_sheet`
- `source_row_number`
- `source_column_map_json`
- `raw_row_json`
- `import_batch_id`
- `created_by`
- `updated_by`
- `verified_by`
- `created_at`
- `updated_at`
- `verified_at`
- `deleted_at`
- `audit_log_id`

---

## Sheet-Specific Field Alignment Instructions

### 1. `USTAD USTAJAH KOBAR`

Map to Guru Agama with default religion `Islam`.

Required field emphasis:

- `nama_lengkap`
- `nik`
- `tempat_tanggal_lahir_raw`, with optional parsed `tempat_lahir` and `tanggal_lahir`
- `nama_tka_tpa`
- `nomor_unit_tka_tpa`
- `alamat_tka_tpa`
- `alamat_rumah`
- `desa_kelurahan_raw`
- `kecamatan_raw`
- `kabupaten_kota_raw`
- `masa_kerja`
- `keterangan`
- document links if present

Do not label this module as Guru Ngaji. Use Guru Agama and category/subcategory Ustad/Ustajah or Pengajar TKA/TPA.

### 2. `MARBOT MASJID KOBAR`

Map to Pelayan Keagamaan / Tokoh Keagamaan and link to Rumah Ibadah where possible. Default religion: Islam.

Required field emphasis:

- `kategori_pelayan_pendidik_keagamaan`
- `nama_lengkap`
- `nik`
- `tempat_lahir`
- `tanggal_lahir`
- `jenis_kelamin`
- `alamat_lengkap`
- `nomor_hp_wa`
- `nama_lembaga_rumah_ibadah`
- `alamat_lembaga_rumah_ibadah`
- `pekerjaan`
- `upload_ktp`
- `upload_kartu_keluarga`

Category should preserve details such as Imam, Muadzin, and Kebersihan Masjid when present.

### 3. `BASIR KOBAR`

Map to Tokoh/Pelayan Keagamaan. Default inferred religion: Hindu, but require operator validation because the mapping is context-sensitive.

Required field emphasis:

- `kategori_pelayan_pendidik_keagamaan`
- `nama_lengkap`
- `nik`
- `tempat_lahir`
- `tanggal_lahir`
- `tempat_tanggal_lahir_raw`
- `jenis_kelamin`
- `alamat_lengkap`
- `nomor_hp_wa`
- `nama_lembaga_rumah_ibadah`
- `organisasi_keagamaan`, for example PHDI if present
- `pekerjaan`
- `upload_ktp`
- `upload_kartu_keluarga`

Set `agama_inferred_status = perlu_validasi` unless the row explicitly references PHDI, Pura, or Hindu institution context.

### 4. `TOKOH AGAMA ISLAM, ULAMA KOBAR`

Map to Tokoh Agama Islam / Pelayan Keagamaan / Guru Agama depending on role value in `Sebagai`. Default religion: Islam.

Required field emphasis:

- `timestamp`
- `nik`
- `nama_lengkap`
- `tempat_lahir`
- `tanggal_lahir`
- `alamat`
- `desa_kelurahan_raw`
- `kecamatan_raw`
- `kabupaten_kota_raw`
- `nomor_hp_wa`
- `upload_foto_ktp`
- `upload_surat_tugas_sk_rekomendasi`
- `email`
- `sebagai`
- `organisasi_keagamaan`
- `nama_lembaga_rumah_ibadah`
- `pekerjaan`

Normalize roles such as Da'i, Ulama, Tokoh Agama Islam, MUI-related role, and similar values into controlled role/category values while preserving raw text.

### 5. `GURU SHM KOBAR`

Map to Guru Agama with category Guru Sekolah Minggu / Guru SHM.

Suggested religion handling:

- default to Kristen when church/institution context is Protestant/general Christian;
- default to Katolik when the institution context clearly indicates Catholic terms such as Stasi, Paroki, or Santo/Santa context;
- otherwise set `agama_inferred_status = perlu_validasi`.

Required field emphasis:

- `kategori_pelayan_pendidik_keagamaan`
- `nama_lengkap`
- `nik`
- `tempat_lahir`
- `tanggal_lahir`
- `tempat_tanggal_lahir_raw`
- `jenis_kelamin`
- `alamat_lengkap`
- `nomor_hp_wa`
- `nama_lembaga_rumah_ibadah`
- `pekerjaan`
- `upload_ktp`
- `upload_kartu_keluarga`

Do not create a broad new module unless the PRD requires it. Prefer Guru Agama with a controlled category.

### 6. `PASTOR KOBAR`

Map to Tokoh Agama / Pelayan Keagamaan.

Suggested religion handling:

- default to Katolik only where local/institution context confirms Catholic usage;
- otherwise treat as Christian-context religious leader and require operator validation.

Required field emphasis:

- `kategori_pelayan_pendidik_keagamaan`
- `nama_lengkap`
- `nik`
- `tempat_lahir`
- `tanggal_lahir`
- `tempat_tanggal_lahir_raw`
- `jenis_kelamin`
- `alamat_lengkap`
- `nomor_hp_wa`
- `nama_lembaga_rumah_ibadah`
- `pekerjaan`
- `upload_ktp`
- `upload_kartu_keluarga`

Preserve raw category `Pastor` and do not force all rows into Catholic mapping if evidence is incomplete.

### 7. `PENDETA KOBAR`

Map to Tokoh Agama / Pelayan Keagamaan. Default religion: Kristen.

Required field emphasis:

- `kategori_pelayan_pendidik_keagamaan`
- `nama_lengkap`
- `nik`
- `tempat_lahir`
- `tanggal_lahir`
- `jenis_kelamin`
- `alamat_lengkap`
- `nomor_hp_wa`
- `nama_lembaga_rumah_ibadah`
- `pekerjaan`
- `upload_ktp`
- `upload_kartu_keluarga`

Normalize `Pendeta`, `Wakil Gembala`, and similar values as role/category values while preserving raw text.

---

## Required Output From The Agent

Produce a planning report with these sections:

## 1. Workbook Analysis Summary

Summarize:

- sheet names reviewed;
- row and column patterns;
- inconsistent headers/shifted rows;
- repeated fields across sheets;
- sensitive fields found;
- document link fields found;
- inferred module/category/religion mapping.

## 2. Field Gap Analysis Against The Two Markdown Prompts

Compare the two markdown prompt documents against Excel evidence.

Identify:

- fields already covered;
- fields missing from the markdown prompts;
- fields that need clearer canonical naming;
- fields that should be treated as raw import metadata;
- fields that should become controlled reference data;
- sensitive fields requiring stronger masking/audit/export control.

## 3. Recommended Canonical Field Dictionary Updates

Create a table with:

- canonical field name;
- operator-facing label;
- source Excel headers;
- applicable sheets;
- module/entity applicability;
- data type;
- sensitivity level;
- validation rule;
- required/optional status;
- notes.

## 4. Sheet-To-Module Mapping Table

Create a table with:

- sheet name;
- target module;
- entity type;
- default/inferred religion;
- role/category mapping;
- institution linkage;
- validation warnings;
- import notes.

## 5. Religion Normalization And Alias Mapping

Create a mapping plan for:

- normalized religion code;
- display label;
- aliases;
- source sheet inference rule;
- confidence level;
- when operator validation is required.

## 6. Data Import And Cleaning Rules

Define import rules for:

- NIK detection and masking;
- phone/WhatsApp normalization;
- date parsing from mixed date formats;
- place/date splitting from `tempat tanggal lahir` raw strings;
- gender normalization;
- address splitting;
- region matching to official Kemendagri region reference;
- document link conversion to file metadata or external source metadata;
- duplicate detection using hash fields;
- preserving raw row JSON;
- import batch tracking;
- error/warning reporting.

## 7. UI/UX Planning Updates

Explain what should be adjusted in UI/UX planning:

- list/registry columns;
- form sections;
- detail tabs;
- sensitive reveal behavior;
- filter fields;
- import preview;
- data-cleaning warning UI;
- religion dropdown/reference behavior;
- category/subcategory dropdowns;
- dashboard aggregate-only behavior.

## 8. Backend Planning Updates

Explain what should be adjusted in backend planning:

- reference tables;
- import staging table;
- canonical entity tables or unified person-role model;
- service-layer authorization;
- audit logs;
- file metadata;
- constraints and indexes;
- deduplication hashes;
- export permissions;
- repository writable seam assumptions.

## 9. GitHub Issue Recommendation

Do not create duplicate issues. Inspect existing issues first.

Recommend whether to:

- update existing `#49` for backend-controlled religion reference data;
- create/update a focused issue for Excel import field mapping if not already covered;
- create/update a focused issue for UI import-preview and validation if not already covered;
- create/update a docs sync issue if markdown/PRD files need alignment;
- avoid broad backend MVP issue explosions if the repo has no writable backend seam.

For each recommended issue, provide:

- title;
- why it is needed;
- repository evidence;
- scope;
- out of scope;
- dependencies;
- security/privacy notes;
- acceptance criteria;
- validation notes;
- labels;
- milestone.

## 10. Final Patch Plan

If implementation is later requested, propose a minimal atomic patch sequence:

1. update docs/PRD field dictionary;
2. update religion/category reference docs;
3. update import mapping docs;
4. update UI model descriptors if already present;
5. update tests for mapping only where repository supports it;
6. update GitHub issue(s);
7. run validation commands.

Do not implement the patch unless explicitly instructed.

---

## Security, Privacy, And Compliance Requirements

Keep the planning aligned with:

- Indonesian UU PDP principles: lawful basis, purpose limitation, data minimization, accuracy, security, accountability, and data subject rights;
- UU ITE and PP PSTE general electronic system security expectations;
- SPBE principles for government digital services;
- public information limitations for sensitive personal data;
- child/vulnerable-person privacy where applicable;
- ISO/IEC 27001 for ISMS controls;
- ISO/IEC 27002 for security control guidance;
- ISO/IEC 27005 for risk management;
- ISO/IEC 27701 for privacy information management;
- ISO/IEC 27017 and 27018 for cloud and personal data protection in cloud contexts;
- ISO/IEC 27034 for application security;
- ISO/IEC 20000 for IT service management;
- ISO/IEC 22301 for business continuity;
- OWASP ASVS, OWASP Top 10, and OWASP API Security Top 10.

This is planning guidance, not formal legal advice.

---

## Repository Boundary And Validation

Implementation repository:

`https://github.com/ahliweb/sikesra`

Reference repository only:

`https://github.com/ahliweb/awcms-mini`

Validation expectations:

- `pnpm lint` for docs/config-only updates;
- `pnpm check` if source/runtime files are changed;
- focused tests if mapping functions or import helpers are changed;
- no secrets in commits, issues, logs, or examples;
- no real NIK, phone numbers, addresses, document URLs, or personal religious data in examples.

---

## Final Response Format

After completing the analysis/planning, respond with:

```markdown
# SIKESRA Excel Field Synchronization Planning Completed

## Files Reviewed
- Markdown prompt 1: ...
- Markdown prompt 2: ...
- Excel workbook: `DATA TOKOH AGAMA KOBAR.xlsx`

## Workbook Findings
- Sheets reviewed: ...
- Main repeated fields: ...
- Sensitive fields: ...
- Main inconsistencies: ...

## Recommended Field Updates
- ...

## Sheet-To-Module Mapping
- ...

## Religion Mapping
- ...

## Issues To Update/Create
- #49 ...
- New issue if justified: ...

## Risks / Blockers
- ...

## Recommended Next Step
- ...
```

Keep the result repository-state-first, privacy-aware, audit-friendly, and aligned with AWCMS Mini single-tenant SIKESRA.

