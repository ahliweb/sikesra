# 07 Operations SOP

## Lifecycle

```txt
Draft -> Validation -> Duplicate Check -> Generate SIKESRA ID 20D -> Submit -> Village Verification -> Subdistrict Verification -> Regency/OPD Verification -> Active/Verified -> Dashboard/Report -> Public-Safe Aggregate Publication
```

Excel data follows:

```txt
Workbook Upload -> Import Batch -> Sheet Selection -> Column Mapping -> Staging Rows -> Validation -> Duplicate Review -> Promotion -> Normal Verification Workflow
```

## SOP 1: Manual Data Input

Responsible roles: Petugas Input, Admin Desa/Kelurahan, Admin Kecamatan, Admin Kabupaten, authorized OPD/operator.

Procedure:

1. Login to EmDash admin.
2. Open SIKESRA module.
3. Click Tambah Data.
4. Select object type and subtype.
5. Select official region.
6. Select local region if available.
7. Fill identity and core attributes.
8. Fill module-specific details.
9. Add related people.
10. Upload supporting documents.
11. Run validation.
12. Review duplicate candidates.
13. Generate SIKESRA ID 20D.
14. Review summary.
15. Submit for verification.

Minimum fields before ID generation:

| Field | Rule |
|---|---|
| Object type | Required, active, two digits. |
| Object subtype | Required, active under type, two digits. |
| Display name | Required. |
| Official village code | Required, valid 10-digit village/kelurahan code. |
| Entity kind | Must match object type. |
| Source input | Required. |
| Sensitivity level | Required. |
| Module fields | Required fields pass validation. |

## SOP 2: Excel Import

Procedure:

1. Open Import Excel.
2. Upload workbook.
3. Create import batch.
4. Select sheet.
5. Map columns.
6. Parse rows into raw and mapped staging data.
7. Validate rows.
8. Run duplicate detection.
9. Correct invalid rows and decide duplicates.
10. Promote selected valid rows.
11. Generate IDs where requirements pass.
12. Review import report.

Rules:

1. No Excel row may bypass staging.
2. Raw Excel rows are restricted/highly restricted by default.
3. Invalid rows cannot be promoted.
4. High or blocking duplicates require explicit decision and reason.
5. Promotion does not equal verification.
6. Import batch, mapping, validation, duplicate override, promotion, skipped rows, and failures are audited.

## SOP 3: Validation

Validation types:

1. Required fields.
2. Data types.
3. Official/local region relationship.
4. Module-specific rules.
5. Sensitivity classification.
6. Document requirements.
7. Duplicate candidates.
8. Workflow status.

Completeness formula:

```txt
completeness_percent = completed_required_items / total_required_items * 100
```

Use the stable validation section keys from `04_api_contracts.md`.

## SOP 4: Duplicate Review

Duplicate signals:

| Entity | Signals |
|---|---|
| Person | NIK/KIA hash, name, birth date, gender, village, guardian, phone. |
| Rumah ibadah | Name, subtype, village, address, coordinate, pengurus. |
| Lembaga | Name, type/religion, village, address, SK/legal document. |
| Document | Checksum, original filename, document type, entity. |
| Benefit/service | Receiver, year, source, service type, amount/quantity. |

Risk levels:

| Risk | Action |
|---|---|
| Low | Warning only. |
| Medium | Review before submit/promote. |
| High | Decision and reason required. |
| Blocking | Submit/promote blocked unless authorized override exists. |

Decision options: skip, promote_as_new, merge, dismiss, confirm_duplicate.

## SOP 5: ID Generation

Format:

```txt
[kode_desa_kel_10][jenis_2][subjenis_2][sequence_6]
```

Example:

```txt
62010210050101000001
```

Procedure:

1. User clicks Generate ID.
2. System checks permission and ABAC.
3. System validates required fields.
4. System validates village/type/subtype.
5. System reads or creates sequence row.
6. System increments sequence and builds ID.
7. System updates entity.
8. System writes code history and audit.
9. UI displays locked ID.

Correction requires `awcms:sikesra:code:correct`, reason, confirmation, before/after audit, and code history record.

## SOP 6: Verification

Status transitions:

| Current | Decision | Next | Note Required |
|---|---|---|---:|
| `draft` | Submit | `submitted_village` | No |
| `submitted_village` | Verify | `verified_village` or `submitted_subdistrict` | No |
| `submitted_village` | Need revision | `need_revision` | Yes |
| `submitted_village` | Reject | `rejected` | Yes |
| `submitted_subdistrict` | Verify | `verified_subdistrict` or `submitted_regency` | No |
| `submitted_subdistrict` | Need revision | `need_revision` | Yes |
| `submitted_subdistrict` | Reject | `rejected` | Yes |
| `submitted_regency` | Verify | `verified` and `active` | No |
| `submitted_regency` | Need revision | `need_revision` | Yes |
| `submitted_regency` | Reject | `rejected` | Yes |
| `need_revision` | Correct and resubmit | configured submitted level | No |
| active/verified | Controlled revision | configured revision state | Yes |
| any non-archived | Archive | `archived` | Yes |

Checklist:

1. Official region valid.
2. Local region reasonable.
3. Identity and module details complete.
4. Required attributes complete.
5. Required documents present and readable.
6. Duplicate warnings reviewed.
7. Sensitive classification correct.
8. Previous revision notes addressed.

## SOP 7: Documents

Upload procedure:

1. Select document type.
2. Select classification.
3. Upload file.
4. Validate MIME, extension, size, checksum.
5. Store file in R2.
6. Store metadata in D1.
7. Link document to entity.
8. Audit upload.

Access rules:

1. Raw R2 keys are not exposed.
2. Highly restricted download requires reason where configured.
3. Preview/download is audited.
4. Replacement supersedes old document.
5. Hard delete is not available in normal UI.

## SOP 8: Public Publication

Data may contribute to public aggregate only if:

1. `status_data = 'active'`.
2. `status_verification = 'verified'`.
3. `deleted_at IS NULL`.
4. Sensitivity is public-safe or approved internal aggregate.
5. Output is aggregate only.
6. Small-cell threshold is satisfied.
7. No protected individual can be identified.
8. Public dashboard is enabled.

Recommended caveat:

```txt
Data pada halaman ini merupakan rekapitulasi agregat yang telah melalui proses verifikasi sesuai kewenangan. Data pribadi, data anak, data disabilitas, data desil individu, dokumen pendukung, dan alamat detail tidak ditampilkan untuk menjaga perlindungan data pribadi dan keamanan informasi.
```

Suppressed-data message:

```txt
Sebagian data tidak ditampilkan secara rinci karena jumlah data terlalu kecil atau berpotensi membuka identitas individu/kelompok rentan.
```

## SOP 9: Export

Procedure:

1. User opens Reports.
2. Select report type.
3. Select filters and fields.
4. System previews field sensitivity.
5. System checks RBAC/ABAC.
6. Restricted fields require reason.
7. System creates export job.
8. File is stored in R2 if generated.
9. Audit event is recorded.
10. Download uses authorized signed/proxy flow.

## SOP 10: Audit Review

Auditor procedure:

1. Login.
2. Open Audit page.
3. Filter by date, actor, action, resource, risk, or request ID.
4. Open audit detail.
5. System redacts before/after values according to permission.
6. Export audit logs only if authorized and reason is provided.
7. Audit export is audited.

## SOP 11: Archive and Restore

1. Archive requires `entity:delete`, reason, confirmation, and audit.
2. Restore requires `entity:restore`, reason, confirmation, and audit.
3. Archived records do not appear in normal active/public dashboards.
4. Archived records remain available to authorized audit/archive reports.
