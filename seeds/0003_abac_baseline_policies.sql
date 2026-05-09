-- SIKESRA Seed 0003: Baseline ABAC Policies
-- Repeatable seed using INSERT OR IGNORE
-- Replace 'default' tenant_id/site_id with app-configured values

-- Policy: Default deny for archived records except restore/correction
INSERT OR IGNORE INTO awcms_sikesra_abac_policies (id, tenant_id, site_id, name, description, effect, priority, resource_type, actions_json, is_active)
VALUES
  ('abac_deny_archived', 'default', 'default', 'Deny update on archived records', 'Prevent modification of archived entities except restore and correction', 'deny', 100, 'entity', '["update","delete","submit","verify"]', 1);

INSERT OR IGNORE INTO awcms_sikesra_abac_policy_conditions (id, tenant_id, site_id, policy_id, attribute_category, attribute_name, operator, value_json, sort_order)
VALUES
  ('abac_cond_archived_1', 'default', 'default', 'abac_deny_archived', 'resource', 'status_data', 'equals', '"archived"', 1);

-- Policy: Deny public route entity detail access
INSERT OR IGNORE INTO awcms_sikesra_abac_policies (id, tenant_id, site_id, name, description, effect, priority, resource_type, actions_json, is_active)
VALUES
  ('abac_deny_public_detail', 'default', 'default', 'Deny public entity detail access', 'Prevent public/anonymous users from accessing entity detail', 'deny', 90, 'entity', '["read","detail"]', 1);

INSERT OR IGNORE INTO awcms_sikesra_abac_policy_conditions (id, tenant_id, site_id, policy_id, attribute_category, attribute_name, operator, value_json, sort_order)
VALUES
  ('abac_cond_public_1', 'default', 'default', 'abac_deny_public_detail', 'subject', 'roles', 'in', '["public"]', 1);

-- Policy: Deny cross-region access
INSERT OR IGNORE INTO awcms_sikesra_abac_policies (id, tenant_id, site_id, name, description, effect, priority, resource_type, actions_json, is_active)
VALUES
  ('abac_deny_cross_region', 'default', 'default', 'Deny cross-region access', 'Prevent users from accessing entities outside their authorized region scope', 'deny', 80, 'entity', '["read","update","verify"]', 1);

-- Policy: Allow verifiers at matching level
INSERT OR IGNORE INTO awcms_sikesra_abac_policies (id, tenant_id, site_id, name, description, effect, priority, resource_type, actions_json, is_active)
VALUES
  ('abac_allow_verification', 'default', 'default', 'Allow verification at matching level', 'Allow verifiers to act on entities at their authorized verification level', 'allow', 50, 'entity', '["verify","submit"]', 1);

-- Policy: Deny highly restricted export without explicit clearance
INSERT OR IGNORE INTO awcms_sikesra_abac_policies (id, tenant_id, site_id, name, description, effect, priority, resource_type, actions_json, is_active)
VALUES
  ('abac_deny_highly_restricted_export', 'default', 'default', 'Deny highly restricted export', 'Prevent export of highly restricted data without explicit permission', 'deny', 70, 'export', '["create","download"]', 1);

-- Policy: Deny local region changes that affect sikesra_id_20
INSERT OR IGNORE INTO awcms_sikesra_abac_policies (id, tenant_id, site_id, name, description, effect, priority, resource_type, actions_json, is_active)
VALUES
  ('abac_deny_region_id_mutation', 'default', 'default', 'Deny local region id mutation', 'Prevent local region changes from altering sikesra_id_20', 'deny', 85, 'entity', '["update"]', 1);

-- Policy: Allow entity read for authenticated users with scope
INSERT OR IGNORE INTO awcms_sikesra_abac_policies (id, tenant_id, site_id, name, description, effect, priority, resource_type, actions_json, is_active)
VALUES
  ('abac_allow_scoped_read', 'default', 'default', 'Allow scoped entity read', 'Allow authenticated users to read entities within their scope', 'allow', 10, 'entity', '["read"]', 1);

-- Policy: Allow entity create for authorized roles
INSERT OR IGNORE INTO awcms_sikesra_abac_policies (id, tenant_id, site_id, name, description, effect, priority, resource_type, actions_json, is_active)
VALUES
  ('abac_allow_create', 'default', 'default', 'Allow entity create', 'Allow authorized roles to create entities within their scope', 'allow', 10, 'entity', '["create"]', 1);
