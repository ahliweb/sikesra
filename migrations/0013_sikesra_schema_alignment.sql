-- SIKESRA Migration 0013: Additive schema alignment for append-only tables
-- D1-compatible SQL; PostgreSQL-friendly design
-- These tables are append-only or event-oriented, so alignment is additive to avoid destructive rewrites.

ALTER TABLE awcms_sikesra_code_history ADD COLUMN updated_at TEXT;
ALTER TABLE awcms_sikesra_code_history ADD COLUMN deleted_at TEXT;
ALTER TABLE awcms_sikesra_code_history ADD COLUMN updated_by TEXT;

UPDATE awcms_sikesra_code_history
SET updated_at = COALESCE(updated_at, created_at)
WHERE updated_at IS NULL;

CREATE INDEX idx_code_history_entity_time
  ON awcms_sikesra_code_history(tenant_id, site_id, entity_id, created_at, deleted_at);

ALTER TABLE awcms_sikesra_verification_events ADD COLUMN updated_at TEXT;
ALTER TABLE awcms_sikesra_verification_events ADD COLUMN deleted_at TEXT;
ALTER TABLE awcms_sikesra_verification_events ADD COLUMN created_by TEXT;
ALTER TABLE awcms_sikesra_verification_events ADD COLUMN updated_by TEXT;

UPDATE awcms_sikesra_verification_events
SET updated_at = COALESCE(updated_at, created_at),
    created_by = COALESCE(created_by, actor_id),
    updated_by = COALESCE(updated_by, actor_id)
WHERE updated_at IS NULL OR created_by IS NULL OR updated_by IS NULL;

CREATE INDEX idx_verification_entity_time_deleted
  ON awcms_sikesra_verification_events(tenant_id, site_id, entity_id, created_at, deleted_at);

ALTER TABLE awcms_sikesra_duplicate_decisions ADD COLUMN updated_at TEXT;
ALTER TABLE awcms_sikesra_duplicate_decisions ADD COLUMN deleted_at TEXT;
ALTER TABLE awcms_sikesra_duplicate_decisions ADD COLUMN updated_by TEXT;

UPDATE awcms_sikesra_duplicate_decisions
SET updated_at = COALESCE(updated_at, created_at),
    updated_by = COALESCE(updated_by, created_by)
WHERE updated_at IS NULL OR updated_by IS NULL;

CREATE INDEX idx_duplicate_decisions_candidate_deleted
  ON awcms_sikesra_duplicate_decisions(tenant_id, site_id, candidate_id, deleted_at);

ALTER TABLE awcms_sikesra_audit_logs ADD COLUMN updated_at TEXT;
ALTER TABLE awcms_sikesra_audit_logs ADD COLUMN deleted_at TEXT;
ALTER TABLE awcms_sikesra_audit_logs ADD COLUMN created_by TEXT;
ALTER TABLE awcms_sikesra_audit_logs ADD COLUMN updated_by TEXT;

UPDATE awcms_sikesra_audit_logs
SET updated_at = COALESCE(updated_at, created_at),
    created_by = COALESCE(created_by, actor_id),
    updated_by = COALESCE(updated_by, actor_id)
WHERE updated_at IS NULL OR created_by IS NULL OR updated_by IS NULL;

CREATE INDEX idx_audit_logs_action_deleted
  ON awcms_sikesra_audit_logs(tenant_id, site_id, action, deleted_at);

CREATE INDEX idx_audit_logs_time_deleted
  ON awcms_sikesra_audit_logs(tenant_id, site_id, created_at, deleted_at);
