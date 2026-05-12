-- SIKESRA Backup Tracking Table
-- Tracks automated backup jobs and their status
-- Source: Issue #189

CREATE TABLE IF NOT EXISTS awcms_sikesra_backups (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('d1_export', 'r2_listing', 'restore_test')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  r2_key TEXT,
  size_bytes INTEGER,
  entity_count INTEGER,
  document_count INTEGER,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error_message TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sikesra_backups_tenant_site ON awcms_sikesra_backups (tenant_id, site_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_backups_status ON awcms_sikesra_backups (status);
CREATE INDEX IF NOT EXISTS idx_sikesra_backups_started_at ON awcms_sikesra_backups (started_at);
