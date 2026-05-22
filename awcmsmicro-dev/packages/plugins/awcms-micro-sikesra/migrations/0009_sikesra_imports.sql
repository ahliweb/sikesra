-- Source: update-backup/d1/sikesra_schema_20260514T014316Z.sql
BEGIN;
CREATE TABLE awcms_sikesra_import_batches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  sheet_name TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  valid_row_count INTEGER NOT NULL DEFAULT 0,
  invalid_row_count INTEGER NOT NULL DEFAULT 0,
  promoted_row_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','mapped','validated','promoting','promoted','failed')),
  object_type_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE TABLE awcms_sikesra_import_staging_rows (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  raw_data_json TEXT,
  mapped_data_json TEXT,
  validation_errors_json TEXT,
  row_status TEXT NOT NULL DEFAULT 'pending' CHECK (row_status IN ('pending','valid','invalid','corrected','duplicate_review','promoted','skipped','failed')),
  duplicate_group_id TEXT,
  duplicate_risk TEXT CHECK (duplicate_risk IN ('low','medium','high','blocking')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (batch_id) REFERENCES awcms_sikesra_import_batches(id)
);
CREATE TABLE awcms_sikesra_import_mapping_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  object_type_code TEXT,
  mapping_json TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX idx_import_batches_status ON awcms_sikesra_import_batches(tenant_id, site_id, status, deleted_at);
CREATE INDEX idx_import_mappings_type ON awcms_sikesra_import_mapping_templates(tenant_id, site_id, object_type_code, deleted_at);
CREATE INDEX idx_import_rows_batch ON awcms_sikesra_import_staging_rows(tenant_id, site_id, batch_id, row_number, deleted_at);
CREATE INDEX idx_import_rows_status ON awcms_sikesra_import_staging_rows(tenant_id, site_id, row_status, deleted_at);
COMMIT;
