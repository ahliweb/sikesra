-- Source: update-backup/d1/sikesra_schema_20260514T014316Z.sql
BEGIN;
CREATE TABLE awcms_sikesra_abac_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  effect TEXT NOT NULL DEFAULT 'deny' CHECK (effect IN ('allow','deny')),
  priority INTEGER NOT NULL DEFAULT 0,
  resource_type TEXT,
  actions_json TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(tenant_id, site_id, name)
);
CREATE TABLE awcms_sikesra_abac_policy_conditions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  attribute_category TEXT NOT NULL CHECK (attribute_category IN ('subject','resource','environment')),
  attribute_name TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('equals','not_equals','in','not_in','contains','gt','gte','lt','lte','exists','not_exists')),
  value_json TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (policy_id) REFERENCES awcms_sikesra_abac_policies(id)
);
CREATE INDEX idx_abac_conditions_policy ON awcms_sikesra_abac_policy_conditions(tenant_id, site_id, policy_id, deleted_at);
CREATE INDEX idx_abac_policies_active ON awcms_sikesra_abac_policies(tenant_id, site_id, is_active, deleted_at);
COMMIT;
