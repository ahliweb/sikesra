-- SIKESRA Migration 0001: Settings, Object Types, and Object Subtypes
-- D1-compatible SQL; PostgreSQL-friendly design

-- Settings table (one row per tenant/site)
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

-- Object types table (e.g., Rumah Ibadah, Lembaga Keagamaan, etc.)
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

-- Object subtypes table (e.g., Masjid, Musholla, etc. under Rumah Ibadah)
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
