-- SIKESRA Migration 0005: Entity Relationships and Attributes
-- D1-compatible SQL; PostgreSQL-friendly design

-- Entity people: link related persons to entities (pengurus, wali, pengasuh, etc.)
CREATE TABLE awcms_sikesra_entity_people (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  person_profile_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('pengurus','wali','pengasuh','anggota','pimpinan','penanggung_jawab','lainnya')),
  is_primary INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id),
  FOREIGN KEY (person_profile_id) REFERENCES awcms_sikesra_person_profiles(id)
);

CREATE INDEX idx_entity_people_entity ON awcms_sikesra_entity_people(tenant_id, site_id, entity_id, deleted_at);
CREATE INDEX idx_entity_people_person ON awcms_sikesra_entity_people(tenant_id, site_id, person_profile_id, deleted_at);

-- Attribute definitions: vocabulary of assignable attributes
CREATE TABLE awcms_sikesra_attribute_definitions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('religion','demographics','welfare','health','education','economic','verification','region','sensitivity','source','other')),
  value_type TEXT NOT NULL DEFAULT 'text' CHECK (value_type IN ('text','number','boolean','date','code_list')),
  applicable_entity_kinds TEXT,
  applicable_object_types TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(tenant_id, site_id, code)
);

CREATE INDEX idx_attribute_defs_category ON awcms_sikesra_attribute_definitions(tenant_id, site_id, category, deleted_at);

-- Entity attributes: assigned attribute values per entity
CREATE TABLE awcms_sikesra_entity_attributes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  attribute_definition_id TEXT NOT NULL,
  value_text TEXT,
  value_number REAL,
  value_boolean INTEGER,
  value_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id),
  FOREIGN KEY (attribute_definition_id) REFERENCES awcms_sikesra_attribute_definitions(id)
);

CREATE INDEX idx_entity_attrs_entity ON awcms_sikesra_entity_attributes(tenant_id, site_id, entity_id, deleted_at);
CREATE INDEX idx_entity_attrs_def ON awcms_sikesra_entity_attributes(tenant_id, site_id, attribute_definition_id, deleted_at);

-- User attribute scopes: per-user region/module/sensitivity scope assignments
CREATE TABLE awcms_sikesra_user_attribute_scopes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('province','regency','district','village','local_region','object_type','sensitivity','verification_level')),
  scope_value TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX idx_user_scopes_user ON awcms_sikesra_user_attribute_scopes(tenant_id, site_id, user_id, deleted_at);
CREATE INDEX idx_user_scopes_type ON awcms_sikesra_user_attribute_scopes(tenant_id, site_id, scope_type, scope_value, deleted_at);
