-- Source: update-backup/d1/sikesra_schema_20260514T014316Z.sql
BEGIN;
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
CREATE TABLE awcms_sikesra_code_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('generate','correct')),
  old_sikesra_id_20 TEXT,
  new_sikesra_id_20 TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
, updated_at TEXT, deleted_at TEXT, updated_by TEXT);
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
CREATE INDEX idx_code_history_entity ON awcms_sikesra_code_history(tenant_id, site_id, entity_id);
CREATE INDEX idx_code_sequences_lookup ON awcms_sikesra_code_sequences(tenant_id, site_id, official_village_code, object_type_code, object_subtype_code, deleted_at);
CREATE INDEX idx_entities_attributes ON awcms_sikesra_entities(tenant_id, site_id, religion_attribute, neglected_attribute, desil_attribute, sensitivity_level, deleted_at);
CREATE INDEX idx_entities_search ON awcms_sikesra_entities(tenant_id, site_id, display_name, sikesra_id_20);
CREATE INDEX idx_entities_sensitivity_status ON awcms_sikesra_entities(tenant_id, site_id, sensitivity_level, status_data, deleted_at);
CREATE INDEX idx_entities_sikesra_id ON awcms_sikesra_entities(tenant_id, site_id, sikesra_id_20, deleted_at);
CREATE INDEX idx_entities_type_status ON awcms_sikesra_entities(tenant_id, site_id, object_type_code, object_subtype_code, status_data, status_verification, deleted_at);
CREATE INDEX idx_entities_verification ON awcms_sikesra_entities(tenant_id, site_id, status_verification, verification_level, official_village_code, deleted_at);
CREATE INDEX idx_entities_village ON awcms_sikesra_entities(tenant_id, site_id, official_village_code, deleted_at);
CREATE INDEX idx_person_profiles_name ON awcms_sikesra_person_profiles(tenant_id, site_id, full_name, deleted_at);
CREATE INDEX idx_person_profiles_sensitivity ON awcms_sikesra_person_profiles(tenant_id, site_id, sensitivity_level, deleted_at);
CREATE INDEX idx_person_profiles_village ON awcms_sikesra_person_profiles(tenant_id, site_id, primary_official_village_code, deleted_at);
COMMIT;
