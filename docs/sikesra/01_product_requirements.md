# 01 Product Requirements

## Product Summary

SIKESRA is a government-ready welfare information module for AWCMS-Micro/EmDash. It manages social, religious, institutional, vulnerable-person, document, verification, import, reporting, and public aggregate data in one controlled registry.

The product must support data entry from operators, staged Excel imports, multi-level verification, secure document management, scoped dashboards, controlled exports, audit trails, and a public aggregate page.

## Target Users

| Persona              | Main Needs                                                                              |
| -------------------- | --------------------------------------------------------------------------------------- |
| Super Admin          | Configure module, users, roles, ABAC, settings, audit, and critical corrections.        |
| Admin Kabupaten      | Monitor and verify all authorized regency data, coordinate OPD review, produce reports. |
| Admin Kecamatan      | Monitor villages in assigned kecamatan and perform kecamatan-level verification.        |
| Admin Desa/Kelurahan | Input, update, correct, and submit data inside assigned village/kelurahan.              |
| Petugas Input        | Enter drafts, upload documents, fix revisions, and submit records.                      |
| Verifikator          | Review data, documents, duplicates, notes, and make workflow decisions.                 |
| OPD Teknis           | Validate technical data such as religious, social, or health-adjacent attributes.       |
| Pimpinan/Viewer      | Read aggregate dashboards and approved reports.                                         |
| Auditor              | Review access, audit, export, policy, verification, and sensitive activity evidence.    |
| Operator Lembaga     | Optional post-MVP user for owned institution updates only.                              |
| Public               | View safe aggregate SIKESRA information only.                                           |

## MVP Scope

| Area            | Requirement                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Module          | Native EmDash/AWCMS-Micro plugin named `sikesra`.                                              |
| Public page     | `/sikesra` aggregate-safe overview, KPIs, charts, caveat, and official contact.                |
| Admin dashboard | Scoped KPIs, work queues, regional summary, activity feed.                                     |
| Registry        | List, filter, detail, tabs, masking, access flags.                                             |
| Data entry      | Progressive wizard with autosave, validation, completeness, duplicate preview, review, submit. |
| ID              | Generate stable 20-digit SIKESRA ID after validation.                                          |
| Verification    | Desa/kelurahan, kecamatan, kabupaten/OPD workflow with notes and audit.                        |
| Regions         | Official Kemendagri region hierarchy and local operational regions down to RT/RW.              |
| Documents       | R2 upload/download with D1 metadata, classification, checksum, and audit.                      |
| Import          | Excel workbook upload, mapping, staging rows, validation, duplicate review, promotion.         |
| Deduplication   | Candidate detection for people, institutions, documents, and imports.                          |
| Reports/export  | Basic CSV/XLSX export with field sensitivity, permission, reason, and audit.                   |
| Security        | RBAC, ABAC, region scope, masking, public suppression, audit.                                  |
| Operations      | SOP, backup/restore checklist, risk controls, acceptance tests.                                |

## Out Of MVP Scope

1. Multi-regency SaaS tenancy beyond tenant/site-ready schema.
2. Offline mobile app.
3. Public detail pages.
4. Direct national-system integrations.
5. Certified digital signature.
6. Full grant/payment approval workflow.
7. Advanced GIS polygon editing.
8. Machine-learning prioritization.
9. Live Google Sheets, WhatsApp, Odoo, or BI integrations.
10. Large asynchronous export pipeline unless repository support already exists.

## MVP Data Modules

| Code | Module                       | Initial Subtypes                                                                                   |
| ---- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| 01   | Rumah Ibadah                 | Masjid, Musholla, Surau, Gereja, Pura, Wihara, Klenteng, Lainnya.                                  |
| 02   | Lembaga Keagamaan            | Islam, Kristen, Katolik, Hindu, Buddha, Konghucu, Lainnya.                                         |
| 03   | Pendidikan Keagamaan         | TPA/TPQ, Pondok Pesantren, Lainnya.                                                                |
| 04   | Lembaga Kesejahteraan Sosial | BAZNAS, PWRI, Panti Asuhan, Panti Yatim, Panti Jompo, Rukun Kematian, Majelis Taklim, LKS Lainnya. |
| 05   | Guru Agama                   | Rumahan, Lembaga, Lainnya.                                                                         |
| 06   | Anak Yatim                   | Yatim, Piatu, Yatim Piatu.                                                                         |
| 07   | Disabilitas                  | Fisik, Intelektual, Mental, Sensorik.                                                              |
| 08   | Lansia Terlantar             | Terlantar, Rawan Terlantar, Mandiri dengan Risiko.                                                 |

## Functional Requirements

| ID     | Requirement                                                                                                 | Priority |
| ------ | ----------------------------------------------------------------------------------------------------------- | -------- |
| FR-001 | Public page displays aggregate totals and charts only.                                                      | Must     |
| FR-002 | Admin dashboard displays scoped operational metrics.                                                        | Must     |
| FR-003 | Users can create and autosave draft records.                                                                | Must     |
| FR-004 | System validates required fields by section and module.                                                     | Must     |
| FR-005 | System detects duplicate candidates before submit or import promotion.                                      | Must     |
| FR-006 | System generates `sikesra_id_20` only after minimum validation passes.                                      | Must     |
| FR-007 | Generated SIKESRA ID is locked for normal users.                                                            | Must     |
| FR-008 | Verifiers can verify, request revision, or reject according to level and scope.                             | Must     |
| FR-009 | Revision and rejection require notes.                                                                       | Must     |
| FR-010 | Excel import creates staging rows before promotion.                                                         | Must     |
| FR-011 | Invalid import rows cannot be promoted.                                                                     | Must     |
| FR-012 | High-risk duplicate override requires reason and audit.                                                     | Must     |
| FR-013 | Documents are uploaded to R2 and linked through D1 metadata.                                                | Must     |
| FR-014 | Document download is permission-controlled and audited.                                                     | Must     |
| FR-015 | Exports enforce permission, field sensitivity, reason, and audit.                                           | Must     |
| FR-016 | Audit log supports filtering and sensitive redaction.                                                       | Must     |
| FR-017 | Settings control public visibility, suppression threshold, upload limits, export limits, and feature flags. | Should   |

## Non-Functional Requirements

| ID      | Requirement     | Target                                                                                       |
| ------- | --------------- | -------------------------------------------------------------------------------------------- |
| NFR-001 | Security        | Secure-by-default, RBAC, ABAC, masking, audit.                                               |
| NFR-002 | Privacy         | Public aggregate only, sensitive masking, small-cell suppression.                            |
| NFR-003 | Performance     | Public summary under 2s and scoped admin dashboard under 3s for normal MVP dataset.          |
| NFR-004 | Maintainability | SIKESRA isolated in plugin/module; no unnecessary EmDash core changes.                       |
| NFR-005 | Portability     | D1-compatible SQL and PostgreSQL-friendly schema.                                            |
| NFR-006 | Auditability    | All high-risk operations traceable by actor, action, request ID, resource, time, and reason. |
| NFR-007 | Usability       | Progressive forms, clear validation, Indonesian formal content, accessible status labels.    |
| NFR-008 | Availability    | Cloudflare runtime availability plus documented backup/restore.                              |

## Public Data Rules

Public `/sikesra` must only include records that satisfy all of these:

```txt
status_data = 'active'
status_verification = 'verified'
deleted_at IS NULL
sensitivity_level IN ('public_safe', 'internal')
aggregate cell count >= configured small_cell_threshold
```

Public output must not include:

1. NIK/KIA or hashes.
2. Protected person names.
3. Exact individual addresses.
4. Phone, wali, guardian, or contact details.
5. Individual desil or poverty flags.
6. Disability or ODGJ details.
7. Document links or raw R2 metadata.
8. Exact coordinates for protected individuals.

## Product Acceptance Criteria

The MVP is acceptable when:

1. SIKESRA can be enabled as a plugin/module.
2. Public page loads without login and displays only aggregate-safe data.
3. Admin pages require login and permissions.
4. Entity registry, wizard, ID generation, verification, documents, import, export, audit, and settings are implemented at MVP depth.
5. Cross-region access is denied or excluded by backend queries.
6. Sensitive data is masked server-side.
7. Excel import never bypasses staging.
8. High-risk actions are audited.
9. Backup/restore process is tested before production.
10. P0 tests in `10_validation_checklist.md` pass.
