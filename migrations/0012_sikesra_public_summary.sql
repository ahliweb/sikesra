-- SIKESRA Migration 0012: Optional public summary views
-- D1-compatible SQL; PostgreSQL-friendly design
-- These views provide a stable aggregate-safe base for future public summary services.

CREATE VIEW awcms_sikesra_public_summary_base_v AS
SELECT
  tenant_id,
  site_id,
  id AS entity_id,
  object_type_code,
  object_subtype_code,
  official_village_code,
  local_region_id,
  status_data,
  status_verification,
  verified_at,
  updated_at,
  sensitivity_level
FROM awcms_sikesra_entities
WHERE deleted_at IS NULL
  AND status_data = 'active'
  AND status_verification = 'verified'
  AND sensitivity_level IN ('public_safe', 'internal');

CREATE VIEW awcms_sikesra_public_summary_by_object_type_v AS
SELECT
  tenant_id,
  site_id,
  object_type_code,
  COUNT(*) AS total_entities,
  COUNT(DISTINCT official_village_code) AS active_villages,
  MAX(COALESCE(verified_at, updated_at)) AS latest_update_at
FROM awcms_sikesra_public_summary_base_v
GROUP BY tenant_id, site_id, object_type_code;

CREATE VIEW awcms_sikesra_public_summary_by_village_v AS
SELECT
  tenant_id,
  site_id,
  official_village_code,
  COUNT(*) AS total_entities,
  MAX(COALESCE(verified_at, updated_at)) AS latest_update_at
FROM awcms_sikesra_public_summary_base_v
GROUP BY tenant_id, site_id, official_village_code;
