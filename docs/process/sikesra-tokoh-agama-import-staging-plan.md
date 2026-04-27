# SIKESRA Tokoh Agama Import Staging Plan

## Purpose

This document defines the planning-level staging and canonical field-mapping contract for Tokoh Agama workbook imports derived from the evidence recorded in `docs/process/sikesra-tokoh-agama-excel-field-sync-2026.md`.

Tracked issue: `ahliweb/sikesra#76`.

This is a planning-only document. It does not introduce runtime importer code, database migrations, or async UI behavior.

## Scope Boundary

- Keep workbook evidence and sheet analysis in `docs/process/sikesra-tokoh-agama-excel-field-sync-2026.md`.
- Use this document for the reviewed staging contract, canonical promotion rules, and warning/error taxonomy.
- Keep backend religion reference ownership in `#49`.
- Keep operator/runtime secret handling outside this issue.

## Import Pipeline Contract

Reviewed pipeline for Tokoh Agama workbook-style imports:

1. accept workbook upload into a restricted staging flow;
2. capture workbook provenance for each parsed row;
3. preserve raw values before destructive normalization;
4. derive normalized candidate values with confidence and warning metadata;
5. require operator review for ambiguous religion, date, region, and institution linkage cases;
6. promote only reviewed rows into canonical module records.

Promotion must remain blocked for rows with unresolved fatal errors.

## Staging Record Shape

Each parsed row should be represented as one restricted staging record with four field groups.

### Provenance fields

- `source_workbook_name`
- `source_sheet`
- `source_row_number`
- `source_header_row_number`
- `source_import_batch_id`
- `source_column_map_json`
- `raw_row_json`

### Raw fields

- `nama_lengkap_raw`
- `nik_raw`
- `tempat_lahir_raw`
- `tanggal_lahir_raw`
- `tempat_tanggal_lahir_raw`
- `jenis_kelamin_raw`
- `kategori_raw`
- `sebagai_raw`
- `organisasi_keagamaan_raw`
- `lembaga_rumah_ibadah_raw`
- `alamat_rumah_raw`
- `desa_kelurahan_raw`
- `kecamatan_raw`
- `kabupaten_kota_raw`
- `nomor_hp_wa_raw`
- `email_raw`
- `document_link_ktp_raw`
- `document_link_kk_raw`
- `document_link_rekomendasi_raw`
- `notes_raw`

### Normalized candidate fields

- `nama_lengkap`
- `nik_encrypted_or_masked`
- `nik_hash_for_deduplication`
- `tempat_lahir`
- `tanggal_lahir`
- `jenis_kelamin`
- `agama_id_candidate`
- `agama_inferred_from`
- `agama_inferred_status`
- `module_type_candidate`
- `entity_type_candidate`
- `peran_keagamaan_candidate`
- `kategori_pelayan_pendidik_keagamaan_candidate`
- `organisasi_keagamaan`
- `nama_lembaga_rumah_ibadah`
- `alamat_lembaga_rumah_ibadah`
- `nomor_hp_wa_encrypted_or_masked`
- `nomor_hp_wa_hash_for_deduplication`
- `email_encrypted_or_masked`
- `wilayah_candidate_json`
- `document_candidate_json`

### Review state fields

- `row_status`
- `warning_codes_json`
- `error_codes_json`
- `duplicate_match_json`
- `operator_review_notes`
- `reviewed_by_user_id`
- `reviewed_at`
- `promotion_target_module`
- `promotion_decision`

## Raw Versus Promoted Fields

Fields that must stay staging-only and never become normal operator-facing canonical fields:

- `raw_row_json`
- `source_column_map_json`
- `nik_raw`
- `nomor_hp_wa_raw`
- `email_raw`
- `document_link_ktp_raw`
- `document_link_kk_raw`
- `document_link_rekomendasi_raw`
- any unreduced Google Form or Drive source URL payload

Fields that may be promoted only after validation/review:

- `nama_lengkap`
- `tempat_lahir`
- `tanggal_lahir`
- `jenis_kelamin`
- `agama_id_candidate` promoted as canonical `agama_id`
- `module_type_candidate`
- `entity_type_candidate`
- `peran_keagamaan_candidate`
- `kategori_pelayan_pendidik_keagamaan_candidate`
- `organisasi_keagamaan`
- `nama_lembaga_rumah_ibadah`
- `alamat_lembaga_rumah_ibadah`
- `wilayah_candidate_json` mapped into reviewed regional references
- `document_candidate_json` mapped into internal file metadata

Fields that should stay available for audit/replay but not be promoted directly:

- `tempat_tanggal_lahir_raw`
- `lembaga_rumah_ibadah_raw`
- `alamat_rumah_raw`
- `desa_kelurahan_raw`
- `kecamatan_raw`
- `kabupaten_kota_raw`
- `notes_raw`

## Canonical Mapping Rules

### Module and entity mapping

- `USTAD USTAJAH KOBAR` maps by default to module `guru-agama` with educator-oriented role/category preservation.
- `GURU SHM KOBAR` maps by default to module `guru-agama` while preserving raw SHM context for later category normalization.
- `TOKOH AGAMA ISLAM, ULAMA KOBAR` maps to `tokoh-agama`, `pelayan-keagamaan`, or `guru-agama` based on reviewed `Sebagai` interpretation.
- `MARBOT MASJID KOBAR`, `BASIR KOBAR`, `PASTOR KOBAR`, and `PENDETA KOBAR` default to tokoh/pelayan-oriented entity handling unless a later reviewed rule narrows them further.

### Religion inference rules

- `agama_id_candidate` may be set automatically only when sheet and row context are strong and non-contradictory.
- `agama_inferred_status` must use `otomatis`, `perlu_validasi`, or `dikonfirmasi_operator`.
- `Basir`, `Guru SHM`, and `Pastor` rows default to `perlu_validasi` unless institution context materially raises confidence.
- unresolved rows should use canonical fallback `belum_dicatat` rather than inventing a new uncontrolled value.
- final canonical `agama_id` must still come from the reviewed religion reference seam documented in `docs/process/sikesra-religion-reference.md`.

### Identity and contact cleaning

- NIK is normalized only when a credible 16-digit pattern exists.
- phone numbers are normalized conservatively; ambiguous punctuation/prefix cases keep the raw value and emit a warning.
- email is optional and should be validated lightly before promotion.
- mixed `Tempat Lahir`, `Tanggal Lahir`, and `Tempat Tanggal Lahir` inputs must preserve the raw combined field whenever parser confidence is not high.

### Region and institution cleaning

- region parsing must never overwrite raw address evidence.
- region promotion requires sufficiently strong Kemendagri-style matching or explicit operator review.
- combined institution/address cells should be split into name and address candidates only when separators are reliable.
- if splitting confidence is low, preserve normalized candidates as null and keep the raw combined field.

### Document-link handling

- workbook-origin external URLs remain staging-only and restricted.
- promotion must convert approved links into internal file/document metadata or a reviewed external-source metadata record.
- raw external URLs must not appear in normal registry, detail, verification, or export surfaces.

## Warning And Error Taxonomy

### Fatal errors

- `missing_name`
- `invalid_artifact_row`
- `unreadable_source_row`
- `promotion_target_unresolved`
- `canonical_mapping_conflict`

Rows with fatal errors should remain blocked from promotion.

### Review warnings

- `nik_missing`
- `nik_invalid_format`
- `phone_ambiguous`
- `email_invalid`
- `birth_parse_ambiguous`
- `agama_inference_needs_review`
- `region_match_ambiguous`
- `institution_split_uncertain`
- `shifted_columns_detected`
- `partial_row_detected`
- `document_link_external_only`
- `duplicate_possible`

Warnings should be visible in import review, but masked so they do not unnecessarily reveal raw sensitive values.

## Duplicate Detection Rules

Duplicate review should combine deterministic and fuzzy checks.

- primary: `nik_hash_for_deduplication`
- secondary: `nomor_hp_wa_hash_for_deduplication`
- tertiary: fuzzy comparison on `nama_lengkap`, `tanggal_lahir`, `source_sheet`, and institution candidates
- duplicate matches should not auto-merge records; they should create operator review tasks

## Operator Review Requirements

Operator review is required before promotion when any of these are true:

- `agama_inferred_status = perlu_validasi`
- date parsing is ambiguous
- region matching is ambiguous
- the row was flagged as shifted or partial
- duplicate detection produced a plausible match
- document-link conversion has not been reviewed

Review UI should expose normalized candidates and warning codes first, with raw values shown only through permission-aware reveal patterns.

## Security And Privacy Requirements

- NIK, contact numbers, email addresses, document links, raw row JSON, and individual religion remain sensitive.
- raw staging payloads must be restricted to privileged import-review paths only.
- default exports and dashboards must remain aggregate-safe and must not reveal workbook raw data.
- reveal and promotion actions should be audit-ready.
- staging retention and replay rules should assume least privilege and data minimization.

## Recommended Follow-On Sequence

1. keep `docs/process/sikesra-tokoh-agama-excel-field-sync-2026.md` as the source evidence summary;
2. use this document as the canonical staging and mapping plan for `#76`;
3. if runtime work is requested later, split it into separate issues for schema, parser/helpers, import-review UX, and promotion services;
4. keep `#49` limited to religion reference ownership and authorization/audit behavior.

## Validation

- `pnpm lint`
