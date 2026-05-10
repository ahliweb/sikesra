-- SIKESRA Migration 0008: File Objects and Supporting Documents
-- D1-compatible SQL; PostgreSQL-friendly design

-- File objects: uploaded files stored in R2 with D1 metadata
CREATE TABLE awcms_sikesra_file_objects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  safe_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum_sha256 TEXT,
  classification TEXT NOT NULL DEFAULT 'internal' CHECK (classification IN ('internal','restricted','highly_restricted')),
  document_type TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  verified_by TEXT,
  verified_at TEXT,
  superseded_by_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (superseded_by_id) REFERENCES awcms_sikesra_file_objects(id)
);

CREATE INDEX idx_file_objects_key ON awcms_sikesra_file_objects(tenant_id, site_id, r2_key, deleted_at);

-- Index for classification-based filtering (for access control)
CREATE INDEX idx_file_objects_classification ON awcms_sikesra_file_objects(tenant_id, site_id, classification, deleted_at);

-- Supporting documents: links file objects to entities
CREATE TABLE awcms_sikesra_supporting_documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_object_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'internal' CHECK (classification IN ('internal','restricted','highly_restricted')),
  is_verified INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id),
  FOREIGN KEY (file_object_id) REFERENCES awcms_sikesra_file_objects(id)
);

CREATE INDEX idx_supporting_docs_entity ON awcms_sikesra_supporting_documents(tenant_id, site_id, entity_id, deleted_at);
CREATE INDEX idx_supporting_docs_file ON awcms_sikesra_supporting_documents(tenant_id, site_id, file_object_id, deleted_at);
