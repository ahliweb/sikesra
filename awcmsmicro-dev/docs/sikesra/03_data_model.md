# 03 Data Model

## Database Principles

SIKESRA uses Cloudflare D1 for MVP. Design must be D1-first and PostgreSQL-friendly.

1. Use `TEXT` primary keys.
2. Store timestamps as ISO-8601 `TEXT` or D1 `datetime('now')` defaults.
3. Store booleans as `INTEGER` 0 or 1.
4. Store JSON as `TEXT` and validate in service layer.
5. Use simple `CHECK` constraints for stable enums.
6. Avoid PostgreSQL-only features such as JSONB, arrays, native UUID, stored procedures, RLS, and complex triggers.
7. Prefer additive migrations.
8. Add indexes for list, dashboard, verification, import, document, export, and audit queries.
9. Apply tenant, site, soft-delete, and region filters in repository queries.

## Standard Columns

Most business tables must include:

```sql
tenant_id TEXT NOT NULL,
site_id TEXT NOT NULL,
created_at TEXT NOT NULL DEFAULT (datetime('now')),
updated_at TEXT NOT NULL DEFAULT (datetime('now')),
deleted_at TEXT,
created_by TEXT,
updated_by TEXT
```

Exceptions must be documented in the migration and implementation decision log.

## Normal Query Guard

Every normal repository query must include:

```sql
tenant_id = ?
AND site_id = ?
AND deleted_at IS NULL
```

For scoped users, intersect requested filters with backend-computed allowed villages or regions. Never trust frontend-supplied tenant, site, or region scope.

## Table Groups

| Group              | Tables                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings           | `awcms_sikesra_settings`                                                                                                                                                               |
| Master object data | `awcms_sikesra_object_types`, `awcms_sikesra_object_subtypes`                                                                                                                          |
| Regions            | `awcms_sikesra_official_regions`, `awcms_sikesra_local_regions`                                                                                                                        |
| Code generation    | `awcms_sikesra_code_sequences`, `awcms_sikesra_code_history`                                                                                                                           |
| Registry           | `awcms_sikesra_entities`, detail tables, `awcms_sikesra_person_profiles`                                                                                                               |
| Relationships      | `awcms_sikesra_entity_people`                                                                                                                                                          |
| Attributes/ABAC    | `awcms_sikesra_attribute_definitions`, `awcms_sikesra_entity_attributes`, `awcms_sikesra_user_attribute_scopes`, `awcms_sikesra_abac_policies`, `awcms_sikesra_abac_policy_conditions` |
| Verification       | `awcms_sikesra_verification_events`                                                                                                                                                    |
| Documents          | `awcms_sikesra_file_objects`, `awcms_sikesra_supporting_documents` unless shared media is used                                                                                         |
| Import             | `awcms_sikesra_import_batches`, `awcms_sikesra_import_staging_rows`, `awcms_sikesra_import_mapping_templates`                                                                          |
| Deduplication      | `awcms_sikesra_duplicate_candidates`, `awcms_sikesra_duplicate_decisions`                                                                                                              |
| Services/benefits  | `awcms_sikesra_benefit_service_history`                                                                                                                                                |
| Reports/exports    | `awcms_sikesra_export_jobs`                                                                                                                                                            |
| Audit              | `awcms_sikesra_audit_logs` unless shared audit is used                                                                                                                                 |

## Migration Order

| Order | File                                            | Tables                                                   |
| ----: | ----------------------------------------------- | -------------------------------------------------------- |
|  0001 | `0001_sikesra_settings_and_master.sql`          | Settings, object types, object subtypes.                 |
|  0002 | `0002_sikesra_regions.sql`                      | Official and local regions.                              |
|  0003 | `0003_sikesra_entities_core.sql`                | Code sequences, code history, entities, person profiles. |
|  0004 | `0004_sikesra_detail_modules.sql`               | MVP module detail tables.                                |
|  0005 | `0005_sikesra_relationships_and_attributes.sql` | Entity people, attributes, user scopes.                  |
|  0006 | `0006_sikesra_abac.sql`                         | ABAC policies and conditions.                            |
|  0007 | `0007_sikesra_verification.sql`                 | Verification events.                                     |
|  0008 | `0008_sikesra_documents.sql`                    | File objects and supporting documents.                   |
|  0009 | `0009_sikesra_imports.sql`                      | Import batches, rows, mapping templates.                 |
|  0010 | `0010_sikesra_deduplication.sql`                | Duplicate candidates and decisions.                      |
|  0011 | `0011_sikesra_benefits_exports_audit.sql`       | Benefits, export jobs, audit logs.                       |
|  0012 | `0012_sikesra_public_summary.sql`               | Optional views or summary tables.                        |

## Essential Table Definitions

The snippets below are implementation baselines. Add indexes from the table notes and adjust only to match repository migration conventions.

### `awcms_sikesra_settings`

```sql
CREATE TABLE awcms_sikesra_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  public_enabled INTEGER NOT NULL DEFAULT 0,
  public_title TEXT NOT NULL DEFAULT 'SIKESRA',
  public_description TEXT,
  data_scope_note TEXT,
  official_contact TEXT,
  small_cell_threshold INTEGER NOT NULL DEFAULT 5,
  max_upload_bytes INTEGER NOT NULL DEFAULT 10485760,
  allowed_mime_types_json TEXT,
  export_max_sync_rows INTEGER NOT NULL DEFAULT 5000,
  require_reason_for_highly_restricted_download INTEGER NOT NULL DEFAULT 1,
  feature_flags_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(tenant_id, site_id)
);
```

### `awcms_sikesra_object_types`

```sql
CREATE TABLE awcms_sikesra_object_types (
  code TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  entity_kind TEXT NOT NULL CHECK (entity_kind IN ('person','institution','building','group','service_record')),
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  PRIMARY KEY (tenant_id, site_id, code)
);
```

### `awcms_sikesra_object_subtypes`

```sql
CREATE TABLE awcms_sikesra_object_subtypes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  type_code TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(tenant_id, site_id, type_code, code),
  FOREIGN KEY (tenant_id, site_id, type_code)
    REFERENCES awcms_sikesra_object_types(tenant_id, site_id, code)
);
```

### `awcms_sikesra_official_regions`

```sql
CREATE TABLE awcms_sikesra_official_regions (
  code TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('province','regency','district','village')),
  parent_code TEXT,
  kemendagri_version TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  PRIMARY KEY (tenant_id, site_id, code)
);
```

Village codes used for SIKESRA ID generation must be exactly 10 digits.

### `awcms_sikesra_local_regions`

```sql
CREATE TABLE awcms_sikesra_local_regions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  official_village_code TEXT NOT NULL,
  parent_id TEXT,
  level TEXT NOT NULL CHECK (level IN ('dusun','lingkungan','rw','rt','blok','zona','area_petugas')),
  code_local TEXT,
  name TEXT NOT NULL,
  description TEXT,
  latitude REAL,
  longitude REAL,
  geojson TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (tenant_id, site_id, official_village_code)
    REFERENCES awcms_sikesra_official_regions(tenant_id, site_id, code),
  FOREIGN KEY (parent_id) REFERENCES awcms_sikesra_local_regions(id)
);
```

Local region changes must never mutate `sikesra_id_20`.

### `awcms_sikesra_entities`

```sql
CREATE TABLE awcms_sikesra_entities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  sikesra_id_20 TEXT UNIQUE CHECK (sikesra_id_20 IS NULL OR length(sikesra_id_20) = 20),
  object_type_code TEXT NOT NULL,
  object_subtype_code TEXT NOT NULL,
  entity_kind TEXT NOT NULL CHECK (entity_kind IN ('person','institution','building','group','service_record')),
  display_name TEXT NOT NULL,
  official_village_code TEXT NOT NULL,
  local_region_id TEXT,
  address_text TEXT,
  latitude REAL,
  longitude REAL,
  coordinate_accuracy_meters REAL,
  coordinate_source TEXT,
  coordinate_recorded_at TEXT,
  coordinate_recorded_by TEXT,
  religion_attribute TEXT,
  neglected_attribute TEXT,
  desil_attribute TEXT,
  sensitivity_level TEXT NOT NULL DEFAULT 'internal'
    CHECK (sensitivity_level IN ('public_safe','internal','restricted','highly_restricted')),
  status_data TEXT NOT NULL DEFAULT 'draft'
    CHECK (status_data IN ('draft','submitted','active','archived')),
  status_verification TEXT NOT NULL DEFAULT 'pending'
    CHECK (status_verification IN ('pending','submitted_village','verified_village','submitted_subdistrict','verified_subdistrict','submitted_regency','verified','need_revision','rejected')),
  verification_level TEXT DEFAULT 'none',
  source_input TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_input IN ('manual','import','integration')),
  source_institution TEXT,
  completeness_percent INTEGER NOT NULL DEFAULT 0,
  duplicate_status TEXT DEFAULT 'unknown'
    CHECK (duplicate_status IN ('unknown','none','candidate','confirmed','resolved')),
  verified_by TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (tenant_id, site_id, official_village_code)
    REFERENCES awcms_sikesra_official_regions(tenant_id, site_id, code),
  FOREIGN KEY (local_region_id) REFERENCES awcms_sikesra_local_regions(id)
);
```

Required indexes:

1. `(tenant_id, site_id, official_village_code, deleted_at)`.
2. `(tenant_id, site_id, object_type_code, object_subtype_code, status_data, status_verification, deleted_at)`.
3. `(tenant_id, site_id, status_verification, verification_level, official_village_code, deleted_at)`.
4. `(tenant_id, site_id, display_name, sikesra_id_20)`.
5. `(tenant_id, site_id, religion_attribute, neglected_attribute, desil_attribute, sensitivity_level, deleted_at)`.

### `awcms_sikesra_code_sequences`

```sql
CREATE TABLE awcms_sikesra_code_sequences (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  official_village_code TEXT NOT NULL,
  object_type_code TEXT NOT NULL,
  object_subtype_code TEXT NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(tenant_id, site_id, official_village_code, object_type_code, object_subtype_code)
);
```

### `awcms_sikesra_person_profiles`

```sql
CREATE TABLE awcms_sikesra_person_profiles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  nik_kia_encrypted TEXT,
  nik_kia_hash TEXT,
  full_name TEXT NOT NULL,
  birth_place TEXT,
  birth_date TEXT,
  ttl_raw TEXT,
  gender TEXT NOT NULL DEFAULT 'unknown' CHECK (gender IN ('L','P','unknown')),
  phone TEXT,
  email TEXT,
  primary_official_village_code TEXT,
  primary_local_region_id TEXT,
  address_text TEXT,
  primary_condition_code TEXT,
  sensitivity_level TEXT NOT NULL DEFAULT 'restricted'
    CHECK (sensitivity_level IN ('public_safe','internal','restricted','highly_restricted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
```

`nik_kia_hash` is service-only and must never be returned to normal frontend/API responses.

## Detail Tables

Create one detail table per MVP module:

| Table                                        | Required Key Fields                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `awcms_sikesra_rumah_ibadah_details`         | `entity_id`, `jenis_rumah_ibadah`, status pembangunan, area/capacity, grant fields. |
| `awcms_sikesra_lembaga_keagamaan_details`    | `entity_id`, `agama`, SK/legal and activity fields.                                 |
| `awcms_sikesra_pendidikan_keagamaan_details` | `entity_id`, `jenis_pendidikan`, teacher/student counts, legal/activity fields.     |
| `awcms_sikesra_lks_details`                  | `entity_id`, `jenis_lks`, caregivers, beneficiaries, legal/activity fields.         |
| `awcms_sikesra_guru_agama_details`           | `entity_id`, `person_profile_id`, `agama`, `status_guru`, teaching institution.     |
| `awcms_sikesra_anak_yatim_details`           | `entity_id`, `person_profile_id`, `kategori_anak`, school, guardian relation.       |
| `awcms_sikesra_disabilitas_details`          | `entity_id`, `person_profile_id`, disability type, severity, assistive device need. |
| `awcms_sikesra_lansia_terlantar_details`     | `entity_id`, `person_profile_id`, neglect status, living condition, priority needs. |

Every detail table must include `tenant_id`, `site_id`, `created_at`, `updated_at`, `deleted_at`, `created_by`, and `updated_by`.

## Data Classification

| Classification      | Meaning                                                                              | Default Behavior                                                        |
| ------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `public_safe`       | Safe aggregate or public-friendly metadata.                                          | May be shown publicly if threshold passes.                              |
| `internal`          | Internal operational data.                                                           | Authenticated authorized users only.                                    |
| `restricted`        | Personal, institutional, financial, or sensitive operational data.                   | Mask unless permission and ABAC allow.                                  |
| `highly_restricted` | NIK/KIA, child identity, disability detail, individual desil, ODGJ, vulnerable data. | Omit or mask by default; reveal requires explicit permission and audit. |

## Data Dictionary Rules

For every new column, document:

1. Meaning.
2. Type.
3. Valid values.
4. Sensitivity.
5. UI usage.
6. Validation rule.
7. Export rule.
8. Source of truth.
