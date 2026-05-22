-- Source: update-backup/d1/sikesra_schema_20260514T014316Z.sql
BEGIN;
CREATE TABLE awcms_sikesra_duplicate_candidates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id_a TEXT NOT NULL,
  entity_id_b TEXT NOT NULL,
  match_signals_json TEXT,
  match_score REAL,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','blocking')),
  detection_source TEXT NOT NULL DEFAULT 'system' CHECK (detection_source IN ('system','manual','import')),
  import_batch_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id_a) REFERENCES awcms_sikesra_entities(id),
  FOREIGN KEY (entity_id_b) REFERENCES awcms_sikesra_entities(id),
  FOREIGN KEY (import_batch_id) REFERENCES awcms_sikesra_import_batches(id)
);
CREATE TABLE awcms_sikesra_duplicate_decisions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('skip','promote_as_new','merge','dismiss','confirm_duplicate')),
  reason TEXT,
  resolved_entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT, updated_at TEXT, deleted_at TEXT, updated_by TEXT,
  FOREIGN KEY (candidate_id) REFERENCES awcms_sikesra_duplicate_candidates(id),
  FOREIGN KEY (resolved_entity_id) REFERENCES awcms_sikesra_entities(id)
);
CREATE INDEX idx_duplicate_candidates_entity_a ON awcms_sikesra_duplicate_candidates(tenant_id, site_id, entity_id_a, deleted_at);
CREATE INDEX idx_duplicate_candidates_entity_b ON awcms_sikesra_duplicate_candidates(tenant_id, site_id, entity_id_b, deleted_at);
CREATE INDEX idx_duplicate_candidates_risk ON awcms_sikesra_duplicate_candidates(tenant_id, site_id, risk_level, deleted_at);
CREATE INDEX idx_duplicate_decisions_candidate ON awcms_sikesra_duplicate_decisions(tenant_id, site_id, candidate_id);
COMMIT;
