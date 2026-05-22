-- Source: update-backup/d1/sikesra_schema_20260514T014316Z.sql
BEGIN;
CREATE TABLE awcms_sikesra_verification_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_role TEXT,
  verification_level TEXT NOT NULL CHECK (verification_level IN ('desa','kecamatan','kabupaten','opd')),
  action TEXT NOT NULL CHECK (action IN ('submit','verify','need_revision','reject','re_submit')),
  previous_status TEXT,
  next_status TEXT,
  note TEXT,
  request_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id)
);
CREATE INDEX idx_verification_actor ON awcms_sikesra_verification_events(tenant_id, site_id, actor_id);
CREATE INDEX idx_verification_entity ON awcms_sikesra_verification_events(tenant_id, site_id, entity_id);
CREATE INDEX idx_verification_queue ON awcms_sikesra_verification_events(tenant_id, site_id, verification_level, action);
CREATE INDEX idx_verification_time ON awcms_sikesra_verification_events(tenant_id, site_id, created_at);
COMMIT;
