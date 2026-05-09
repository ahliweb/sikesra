-- SIKESRA Migration 0011: Benefits, Exports, and Audit
-- D1-compatible SQL; PostgreSQL-friendly design

-- Benefit/service history: track benefits received by entities
CREATE TABLE awcms_sikesra_benefit_service_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  benefit_type TEXT NOT NULL,
  benefit_name TEXT,
  source_institution TEXT,
  year INTEGER,
  amount_value REAL,
  amount_unit TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id)
);

CREATE INDEX idx_benefit_history_entity ON awcms_sikesra_benefit_service_history(tenant_id, site_id, entity_id, deleted_at);
CREATE INDEX idx_benefit_history_year ON awcms_sikesra_benefit_service_history(tenant_id, site_id, year, deleted_at);

-- Export jobs: track CSV/XLSX export creation and download
CREATE TABLE awcms_sikesra_export_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  report_type TEXT,
  filters_json TEXT,
  fields_json TEXT,
  field_sensitivity_json TEXT,
  format TEXT NOT NULL DEFAULT 'csv' CHECK (format IN ('csv','xlsx')),
  reason TEXT,
  total_rows INTEGER,
  r2_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','ready','failed','expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX idx_export_jobs_status ON awcms_sikesra_export_jobs(tenant_id, site_id, status, deleted_at);

-- Audit logs: immutable critical action events
CREATE TABLE awcms_sikesra_audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  request_id TEXT,
  success INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  before_json TEXT,
  after_json TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_logs_action ON awcms_sikesra_audit_logs(tenant_id, site_id, action);
CREATE INDEX idx_audit_logs_resource ON awcms_sikesra_audit_logs(tenant_id, site_id, resource_type, resource_id);
CREATE INDEX idx_audit_logs_actor ON awcms_sikesra_audit_logs(tenant_id, site_id, actor_id);
CREATE INDEX idx_audit_logs_time ON awcms_sikesra_audit_logs(tenant_id, site_id, created_at);
