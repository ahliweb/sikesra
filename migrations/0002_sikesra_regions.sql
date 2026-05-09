-- SIKESRA Migration 0002: Official and Local Regions
-- D1-compatible SQL; PostgreSQL-friendly design

-- Official regions (Kemendagri hierarchy: province, regency, district, village)
-- Village codes used for SIKESRA ID generation must be exactly 10 digits
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

CREATE INDEX idx_official_regions_parent ON awcms_sikesra_official_regions(tenant_id, site_id, parent_code);
CREATE INDEX idx_official_regions_level ON awcms_sikesra_official_regions(tenant_id, site_id, level);

-- Local operational regions (dusun, lingkungan, RW, RT, blok, zona, area_petugas)
-- Local region changes must never mutate sikesra_id_20
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

CREATE INDEX idx_local_regions_village ON awcms_sikesra_local_regions(tenant_id, site_id, official_village_code);
CREATE INDEX idx_local_regions_parent ON awcms_sikesra_local_regions(parent_id);
CREATE INDEX idx_local_regions_level ON awcms_sikesra_local_regions(tenant_id, site_id, level);
