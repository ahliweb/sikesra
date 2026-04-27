# SIKESRA Tokoh Agama Excel Field Synchronization 2026

## Purpose

This document records the repository-maintained planning result for `temp/prompt_sinkronisasi_field_markdown_excel_sikesra.md`.

It aligns the observed field structure of `temp/DATA TOKOH AGAMA KOBAR.xlsx` with the current SIKESRA planning baseline in this repository without exposing real personal data, document URLs, or operator secrets.

Primary planning references reviewed from `temp/`:

- `temp/prompt_backend_planning_git_hub_issues_sikesra_prd_awcms_mini_sikesra_repo_boundary.md`
- `temp/prompt_planning_git_hub_issues_sikesra_uiux_prd_with_religion_field_guru_agama_lansia_terlantar.md`
- `temp/prd_mvp_sikesra_awcms_mini_single_tenant_field_kelengkapan.md`
- `temp/prd_ui_ux_sikesra_awcms_mini_detail.md`

Related maintained repository docs:

- `docs/process/sikesra-religion-reference.md`
- `docs/process/sikesra-uiux-github-issue-plan.md`
- `docs/admin/sikesra-uiux-implementation.md`

Tracked issue: `ahliweb/sikesra#75`.

Implementation-focused follow-on planning for staging, provenance, warning/error taxonomy, and canonical promotion rules now lives in `docs/process/sikesra-tokoh-agama-import-staging-plan.md` under `ahliweb/sikesra#76`.

## Workbook Analysis Summary

Reviewed sheets:

- `USTAD USTAJAH KOBAR`
- `MARBOT MASJID KOBAR`
- `BASIR KOBAR`
- `TOKOH AGAMA ISLAM, ULAMA KOBAR`
- `GURU SHM KOBAR`
- `PASTOR KOBAR`
- `PENDETA KOBAR`

Observed repeated field families:

- identity: `Nama Lengkap`, `NIK`, `Tempat Lahir`, `Tanggal Lahir`, `Tempat Tanggal Lahir`
- category/role: `Kategori Pelayan/Pendidik Keagamaan`, `Sebagai`, organization/context fields
- address/region: `Alamat Lengkap`, `Alamat Rumah`, `Desa/Kelurahan`, `Kecamatan`, `Kabupaten/Kota`
- institution linkage: `Nama Lembaga/Rumah Ibadah dan Alamat`, `Nama TKA/TPA`, `No. Unit TKA/TPA`
- contact: `Nomor Kontak (HP/WhatsApp)`, `Nomer HP/WA`, `Email Address`
- documents: `UPLOAD KTP`, `UPLOAD KARTU KELUARGA`, `Upload Foto KTP`, `Upload Surat Tugas/SK/Rekomendasi`

Observed workbook inconsistencies:

- `USTAD USTAJAH KOBAR` shows shifted values in early rows, where `Laki-laki` appears under address-related columns and TKA/TPA address/unit structure is not stable.
- `GURU SHM KOBAR` contains an extra numeric row immediately after the header (`1`, `2`, `3`, ...), which must be treated as a worksheet artifact, not data.
- `BASIR KOBAR`, `PASTOR KOBAR`, and some `MARBOT MASJID KOBAR` rows omit NIK/contact/document cells entirely, so null-heavy import handling is required.
- `TOKOH AGAMA ISLAM, ULAMA KOBAR` mixes full Google Form-style rows with partially filled trailing rows.
- Date representations are mixed: ISO timestamps, `dd/mm/yyyy`, Indonesian month names, dotted dates, and combined place/date strings.
- Gender values vary between full labels (`Laki-laki`, `Perempuan`) and abbreviations (`P`).

Sensitive field evidence found:

- NIK
- phone and WhatsApp numbers
- email addresses
- full home addresses
- detailed institution addresses tied to individuals
- document upload links/URLs
- individual-level religion inference from sheet context and institution context

Document-link evidence found:

- KTP uploads
- KK uploads
- photo KTP uploads
- recommendation/assignment letter uploads
- Google Drive or Google Form-style file URLs in some sheets

## Sheet-To-Module Mapping

| Sheet | Target Module | Entity Type | Default/Inferred Religion | Role/Category Notes | Validation Warnings |
|---|---|---|---|---|---|
| `USTAD USTAJAH KOBAR` | `Guru Agama` | individual religious educator | `Islam` | preserve `Ustad/Ustajah`, TKA/TPA educator context | rows are visibly shifted; `tempat tanggal lahir` and TKA/TPA location fields need raw preservation |
| `MARBOT MASJID KOBAR` | `Pelayan Keagamaan` or `Tokoh Keagamaan` linked to `Rumah Ibadah` | individual religious service worker | `Islam` | preserve roles such as imam, muadzin, kebersihan | many rows omit birth/gender/address subfields; institution linkage should remain optional/raw |
| `BASIR KOBAR` | `Tokoh Keagamaan` or `Pelayan Keagamaan` | individual religious/customary service worker | inferred `Hindu` | preserve raw role `Basir`; capture PHDI/Pura context when present | set `agama_inferred_status = perlu_validasi` unless row context strongly confirms Hindu |
| `TOKOH AGAMA ISLAM, ULAMA KOBAR` | `Tokoh Agama` / `Pelayan Keagamaan` / `Guru Agama` by `Sebagai` | individual religious figure | `Islam` | preserve raw `Sebagai`, organization, and majelis context | partial rows require staging warnings and completeness flags |
| `GURU SHM KOBAR` | `Guru Agama` | individual religious educator | inferred `Kristen` or `Katolik` by institution context | preserve category `Guru Sekolah Minggu` / `Guru SHM` | artifact row after header must be ignored; religion inference needs church-context validation |
| `PASTOR KOBAR` | `Tokoh Agama` / `Pelayan Keagamaan` | individual religious leader | inferred `Katolik` only when context confirms it | preserve raw `Pastor` category | some rows may also reflect broader Christian context; use `perlu_validasi` when evidence is weak |
| `PENDETA KOBAR` | `Tokoh Agama` / `Pelayan Keagamaan` | individual religious leader | `Kristen` | preserve `Pendeta`, `Wakil Gembala`, and similar roles | institution names should remain raw for later normalization/linkage |

## Field Gap Analysis Against Current Planning

Already covered in current planning/docs:

- controlled religion reference with alias normalization and privacy-aware handling
- `Guru Agama` as the general module label instead of `Guru Ngaji`
- privacy-aware UI handling for religion and vulnerable-person data
- import staging-first flow and promotion audit expectations

Missing or under-specified based on workbook evidence:

- a canonical Tokoh/Guru/Pelayan import field dictionary tied to observed workbook sheets
- explicit handling for raw combined fields such as `tempat_tanggal_lahir_raw`
- explicit storage of workbook provenance fields such as `source_sheet`, `source_row_number`, `source_column_map_json`, and `raw_row_json`
- explicit inferred-religion metadata fields such as `agama_inferred_from` and `agama_inferred_status`
- explicit institution-raw linkage fields for combined source headers like `Nama Lembaga/Rumah Ibadah dan Alamat`
- a documented rule for header-artifact rows like the numeric second row in `GURU SHM KOBAR`

Fields that should remain raw import metadata before canonical promotion:

- `tempat_tanggal_lahir_raw`
- `lembaga_rumah_ibadah_raw`
- `desa_kelurahan_raw`
- `kecamatan_raw`
- `kabupaten_kota_raw`
- `kontak_raw`
- `external_source_url_raw`
- `source_column_map_json`
- `raw_row_json`

Fields that should become controlled reference data:

- `agama_id`
- `module_type`
- `entity_type`
- `jenis_guru_agama`
- `peran_keagamaan`
- `kategori_pelayan_pendidik_keagamaan`
- normalized region references where official Kemendagri mapping is possible

Fields requiring the strongest masking/audit/export controls:

- `nik_encrypted_or_masked`
- `nik_hash_for_deduplication`
- `nomor_hp_wa_encrypted_or_masked`
- `nomor_hp_wa_hash_for_deduplication`
- `email_encrypted_or_masked`
- `agama_id` for individuals
- document-link and file metadata fields
- raw row JSON because it can preserve sensitive source payloads

## Recommended Canonical Field Dictionary Updates

| Canonical Field | Operator Label | Source Headers | Applicable Sheets | Module Applicability | Type | Sensitivity | Validation | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `nama_lengkap` | Nama Lengkap | `Nama Lengkap`, `NAMA LENGKAP` | all sheets | all individual tokoh/guru/pelayan flows | string | restricted | required non-empty text | required | keep original casing in raw import too |
| `nik_encrypted_or_masked` | NIK | `NIK`, `Nomor Induk Kependudukan (NIK)` | most sheets | all individual flows | string | highly_restricted | 16-digit normalization when present | optional | never show full value by default |
| `nik_hash_for_deduplication` | Hash NIK | derived | most sheets | import/staging only | string | highly_restricted | deterministic hash | conditional | used for duplicate detection only |
| `tempat_lahir` | Tempat Lahir | `Tempat Lahir` | most sheets | all individual flows | string | restricted | parsed from source or raw split | optional | preserve source raw when parse is uncertain |
| `tanggal_lahir` | Tanggal Lahir | `Tanggal Lahir` | most sheets | all individual flows | date | restricted | mixed-format parsing | optional | stage warning when parse is ambiguous |
| `tempat_tanggal_lahir_raw` | Tempat/Tanggal Lahir (Raw) | `TEMPAT TANGGAL LAHIR` and combined place/date cells | `USTAD USTAJAH KOBAR`, `BASIR KOBAR`, `GURU SHM KOBAR`, `PASTOR KOBAR` | import staging | string | restricted | preserve raw text | optional | do not discard when parser confidence is low |
| `jenis_kelamin` | Jenis Kelamin | `Jenis Kelamin` | most sheets | all individual flows | enum | restricted | normalize `L/P`, full Indonesian labels | optional | preserve raw if unrecognized |
| `agama_id` | Agama | inferred by sheet/context or operator override | all sheets | all individual flows | reference | restricted | must map to controlled religion values | conditional | individual-level access remains permission-aware |
| `agama_inferred_from` | Sumber Inferensi Agama | sheet/context metadata | all sheets | import staging | string | restricted | required when inferred | conditional | e.g. sheet name, church context, PHDI/Pura hints |
| `agama_inferred_status` | Status Validasi Agama | derived | all sheets | import staging | enum | restricted | `otomatis`, `perlu_validasi`, `dikonfirmasi_operator` | conditional | required for Basir/Pastor/SHM ambiguous cases |
| `kategori_pelayan_pendidik_keagamaan` | Kategori | `Kategori Pelayan/Pendidik Keagamaan` | all except `USTAD USTAJAH KOBAR` | tokoh/guru/pelayan flows | string/reference | restricted | controlled mapping plus raw preservation | optional | raw category still stored |
| `sebagai` | Peran Sebagai | `Sebagai` | `TOKOH AGAMA ISLAM, ULAMA KOBAR` | tokoh/pelayan/guru split | string | restricted | preserve raw role text | optional | normalize into role reference later |
| `organisasi_keagamaan` | Organisasi/Lembaga Keagamaan | organization-related headers | `TOKOH AGAMA ISLAM, ULAMA KOBAR`, `BASIR KOBAR` | tokoh/pelayan flows | string | restricted | preserve raw and normalized variant | optional | MUI/PHDI context improves inference confidence |
| `nama_lembaga_rumah_ibadah` | Lembaga/Rumah Ibadah | `Nama Lembaga/Rumah Ibadah dan Alamat` | most sheets | tokoh/guru/pelayan flows | string | restricted | preserve primary institution name | optional | split from combined address when possible |
| `alamat_lembaga_rumah_ibadah` | Alamat Lembaga/Rumah Ibadah | combined institution/address headers | most sheets | tokoh/guru/pelayan flows | string | restricted | parse optional | optional | keep raw unsplit string too |
| `nama_tka_tpa` | Nama TKA/TPA | `NAMA TKA/TPA` | `USTAD USTAJAH KOBAR` | Guru Agama | string | restricted | preserve raw | optional | do not relabel module as Guru Ngaji |
| `nomor_unit_tka_tpa` | Nomor Unit TKA/TPA | `NO. UNIT TKA/TPA` | `USTAD USTAJAH KOBAR` | Guru Agama | string | restricted | preserve raw | optional | some rows omit this field entirely |
| `alamat_rumah` | Alamat Rumah | `ALAMAT RUMAH`, `Alamat Lengkap`, `Alamat` | all sheets | all individual flows | string | restricted | preserve raw text | optional | region derivation should not overwrite raw source |
| `desa_kelurahan_raw` | Desa/Kelurahan (Raw) | `Desa/Kelurahan` | several sheets | all individual flows | string | restricted | preserve raw text | optional | official mapping may be deferred |
| `kecamatan_raw` | Kecamatan (Raw) | `Kecamatan` | several sheets | all individual flows | string | restricted | preserve raw text | optional | required for scoped staging review where available |
| `kabupaten_kota_raw` | Kabupaten/Kota (Raw) | `Kabupaten/Kota`, `Kota/Kabupaten`, `Asal Kabupaten/Kota` | all sheets | all individual flows | string | restricted | preserve raw text | optional | do not assume it equals domicile without source note |
| `nomor_hp_wa_encrypted_or_masked` | Nomor HP/WhatsApp | `Nomor Kontak (HP/WhatsApp)`, `Nomer HP/WA` | most sheets | all individual flows | string | highly_restricted | phone normalization | optional | display masked by default |
| `email_encrypted_or_masked` | Email | `Email Address` | `TOKOH AGAMA ISLAM, ULAMA KOBAR` | tokoh flows | string | highly_restricted | RFC-like email validation when present | optional | store raw source separately only in staging |
| `dokumen_ktp_file_id` | Dokumen KTP | `UPLOAD KTP`, `Upload Foto KTP.` | most sheets | document-aware flows | file reference | highly_restricted | file metadata only | optional | raw source URL stays redacted and staging-only |
| `dokumen_kk_file_id` | Dokumen Kartu Keluarga | `UPLOAD KARTU KELUARGA` | most sheets | document-aware flows | file reference | highly_restricted | file metadata only | optional | do not expose external URLs in UI |
| `dokumen_surat_tugas_sk_rekomendasi_file_id` | Surat Tugas/SK/Rekomendasi | recommendation-letter upload headers | `TOKOH AGAMA ISLAM, ULAMA KOBAR` | tokoh flows | file reference | highly_restricted | file metadata only | optional | preserve requirement for verifier review |
| `source_sheet` | Sheet Sumber | workbook metadata | all sheets | import staging | string | internal | required | required | workbook provenance |
| `source_row_number` | Baris Sumber | workbook metadata | all sheets | import staging | integer | internal | positive integer | required | supports replay/debug without showing source values |
| `source_column_map_json` | Peta Kolom Sumber | derived | all sheets | import staging | json | internal_sensitive | schema snapshot | required | keeps evidence for shifted columns |
| `raw_row_json` | Data Baris Raw | derived | all sheets | import staging | json | highly_restricted | preserve source payload | required | never expose to normal UI |

## Religion Normalization And Alias Mapping

Normalized values to keep aligned with the current repository seam:

| Code | Display Label | Workbook/Import Alias Examples | Inference Rule | Confidence | Operator Validation |
|---|---|---|---|---|---|
| `islam` | Islam | `Islam`, `Ustad`, `Ustajah`, `Marbot Masjid`, `Ulama`, `Da'i` via context | direct from Islamic sheet/role context | high | no, unless row-level contradiction exists |
| `kristen` | Kristen | `Kristen`, `Pendeta`, `Guru Sekolah Minggu`, `Guru SHM`, `GPdI`, `GBI`, `JKI`, `GSJA`, `GPT` | church/protestant context | medium-high | yes when church context is unclear |
| `katolik` | Katolik | `Katolik`, `Katholik`, `Pastor`, `Paroki`, `Stasi`, `St.`, `Santa`, `Santo` | Catholic institution/title context | medium | yes when only `Pastor` appears without Catholic evidence |
| `hindu` | Hindu | `Basir`, `PHDI`, `Parisadha`, `Pura` | Hindu/customary context in sheet/institution names | medium | yes by default for Basir unless explicit Hindu evidence exists |
| `buddha` | Buddha | `Buddha`, `Budha` | direct value or institutional context | low in current workbook | yes if inferred from institution only |
| `konghucu` | Konghucu | `Konghucu`, `Konghuchu`, `Khonghucu` | direct value or institutional context | low in current workbook | yes if inferred from institution only |
| `kepercayaan` | Kepercayaan Terhadap Tuhan YME | legal/operator-approved contextual value only | not observed in this workbook | low | always requires explicit operator/legal validation |
| `belum_dicatat` | Belum Dicatat | fallback for unresolved cases | no safe inference available | low | required before promotion to canonical record |

## Data Import And Cleaning Rules

- Detect 16-digit NIK patterns, store masked/encrypted canonical value plus a deduplication hash, and never print the raw number in docs/tests/issues.
- Normalize phone numbers into a canonical Indonesian mobile format where possible, but keep the original contact string in staging when punctuation or prefixes are ambiguous.
- Parse mixed date formats from ISO, `dd/mm/yyyy`, dotted dates, and Indonesian month names. If parsing confidence is low, keep `tanggal_lahir` null and preserve `tempat_tanggal_lahir_raw`.
- Split `tempat tanggal lahir` only when the separator pattern is reliable. Otherwise preserve raw text and emit a staging warning.
- Normalize gender values from `Laki-laki`, `Perempuan`, `L`, `P`, and casing variants.
- Preserve raw address text before attempting region decomposition.
- Match official region values against Kemendagri references only when the source is strong enough; otherwise keep raw `desa_kelurahan_raw`, `kecamatan_raw`, and `kabupaten_kota_raw`.
- Convert source document links into file metadata or external-source metadata at staging time; do not surface raw external URLs in operator-facing views.
- Track duplicates using NIK hash, contact hash, and similarity checks on `nama_lengkap + tanggal_lahir + lembaga_raw` where NIK is absent.
- Preserve `raw_row_json`, `source_sheet`, `source_row_number`, and `source_column_map_json` for audit/debug purposes.
- Emit structured import warnings for shifted columns, artifact rows, invalid dates, ambiguous religion inference, missing required identity fields, and unresolved institution/region linkage.

## UI/UX Planning Updates

The current model layer already covers forms, registry, detail, import/export, and religion-reference privacy behavior. Workbook evidence suggests the following planning-level refinements:

- Registry/import preview should explicitly show inferred religion status and staging warnings without revealing unnecessary personal detail.
- Guru Agama import mapping must preserve `Guru Sekolah Minggu`, `Guru SHM`, `Ustad/Ustajah`, and TKA/TPA context as controlled categories, not module-name forks.
- Detail and import-review surfaces should preserve raw institution text and parsed institution-link candidates side by side for verifier review.
- Import-cleaning UX should call out header artifacts, shifted rows, missing NIK/contact values, and ambiguous place/date parsing.
- Dashboard behavior should remain aggregate-only for religion and must not expose inferred individual religion casually.

## Backend Planning Updates

Workbook evidence sharpens the backend/import follow-ons that should remain separate from `#49`:

- `#49` remains the religion-reference backend issue and should absorb workbook-driven alias/inference notes, not broad staging-table design for all Tokoh imports.
- Any future import-runtime issue should include staging provenance fields, inferred-religion metadata, hashed deduplication fields, and raw-row retention rules.
- Institution linkage should support raw combined text first, then optional linkage to `rumah_ibadah`, `lembaga_keagamaan`, or `lembaga_pendidikan_keagamaan` when repository/runtime support exists.
- File/document handling should convert external workbook links into internal file metadata or reviewed external-source metadata with audit coverage.
- Service-layer authorization must preserve masked defaults for NIK, contact, email, document metadata, and individual religion.

## Current Issue Status Map

Current relevant open issues observed during this sync:

- `#49` backend-controlled religion reference master data
- `#67` operator-side Coolify secret verification/rotation
- `#76` Tokoh Agama import staging and canonical field-mapping planning

The focused Tokoh Agama import field-mapping planning follow-on now exists as `#76` and should own the reviewed staging contract.

## Recommended Issue Actions

- Keep `#49` open and update it with workbook-driven religion inference and alias notes for `Basir`, `Guru SHM`, `Pastor`, and `Pendeta` context.
- Keep `#75` as the maintained planning/docs sync issue covering workbook evidence and related PRD/doc alignment.
- Use `#76` for the focused Tokoh Agama import staging and canonical field-mapping plan.

Focused follow-on issue now tracked:

- `#76` - `[SIKESRA Import] Add Tokoh Agama workbook staging and canonical field mapping plan`

## Minimal Patch Sequence For Later Implementation

1. keep this workbook sync report updated as the canonical planning summary;
2. update religion/category reference docs and issue text using the verified workbook evidence;
3. maintain the focused Tokoh Agama import-staging plan in `docs/process/sikesra-tokoh-agama-import-staging-plan.md`;
4. only then implement mapping helpers, staging schema, or UI import-preview refinements in separate atomic issues.

## Validation

- `pnpm lint`

## Security And Privacy Notes

- This document intentionally uses redacted workbook evidence only.
- No real NIK, phone numbers, email addresses, addresses, or document URLs should be copied into issues, tests, docs, or code comments.
- Individual religion remains sensitive personal data and must stay masked/minimized by default across import, review, export, and reporting flows.
