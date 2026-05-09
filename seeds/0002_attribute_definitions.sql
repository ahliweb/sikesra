-- SIKESRA Seed 0002: Core Attribute Definitions
-- Repeatable seed using INSERT OR IGNORE
-- Replace 'default' tenant_id/site_id with app-configured values

-- Religion attributes
INSERT OR IGNORE INTO awcms_sikesra_attribute_definitions (id, tenant_id, site_id, code, name, category, value_type, applicable_entity_kinds, sort_order)
VALUES
  ('attr_religion', 'default', 'default', 'religion', 'Agama', 'religion', 'code_list', 'all', 1),
  ('attr_religion_islam', 'default', 'default', 'religion_islam_count', 'Jumlah Islam', 'religion', 'number', 'all', 2),
  ('attr_religion_christian_count', 'default', 'default', 'religion_christian_count', 'Jumlah Kristen', 'religion', 'number', 'all', 3);

-- Demographics attributes
INSERT OR IGNORE INTO awcms_sikesra_attribute_definitions (id, tenant_id, site_id, code, name, category, value_type, applicable_entity_kinds, sort_order)
VALUES
  ('attr_neglected', 'default', 'default', 'neglected_status', 'Status Keterlantaran', 'demographics', 'code_list', 'person', 10),
  ('attr_desil', 'default', 'default', 'desil_level', 'Tingkat Desil', 'demographics', 'number', 'person', 11),
  ('attr_extreme_poverty', 'default', 'default', 'extreme_poverty', 'Kemiskinan Ekstrem', 'demographics', 'boolean', 'person', 12);

-- Welfare attributes
INSERT OR IGNORE INTO awcms_sikesra_attribute_definitions (id, tenant_id, site_id, code, name, category, value_type, applicable_entity_kinds, sort_order)
VALUES
  ('attr_spm', 'default', 'default', 'spm_status', 'Status SPM', 'welfare', 'code_list', 'all', 20),
  ('attr_pkh', 'default', 'default', 'pkh_status', 'Penerima PKH', 'welfare', 'boolean', 'person', 21),
  ('attr_bpnt', 'default', 'default', 'bpnt_status', 'Penerima BPNT', 'welfare', 'boolean', 'person', 22),
  ('attr_bpjs_pbi', 'default', 'default', 'bpjs_pbi_status', 'Penerima BPJS PBI', 'health', 'boolean', 'person', 23);

-- Sensitivity classification attribute
INSERT OR IGNORE INTO awcms_sikesra_attribute_definitions (id, tenant_id, site_id, code, name, category, value_type, applicable_entity_kinds, sort_order)
VALUES
  ('attr_sensitivity', 'default', 'default', 'sensitivity_level', 'Tingkat Sensitivitas', 'sensitivity', 'code_list', 'all', 30);

-- Region scope attributes
INSERT OR IGNORE INTO awcms_sikesra_attribute_definitions (id, tenant_id, site_id, code, name, category, value_type, applicable_entity_kinds, sort_order)
VALUES
  ('attr_region_province', 'default', 'default', 'region_province', 'Cakupan Provinsi', 'region', 'code_list', 'all', 40),
  ('attr_region_regency', 'default', 'default', 'region_regency', 'Cakupan Kabupaten/Kota', 'region', 'code_list', 'all', 41),
  ('attr_region_district', 'default', 'default', 'region_district', 'Cakupan Kecamatan', 'region', 'code_list', 'all', 42),
  ('attr_region_village', 'default', 'default', 'region_village', 'Cakupan Desa/Kelurahan', 'region', 'code_list', 'all', 43),
  ('attr_region_local', 'default', 'default', 'region_local', 'Cakupan Wilayah Lokal', 'region', 'code_list', 'all', 44);

-- Source input attribute
INSERT OR IGNORE INTO awcms_sikesra_attribute_definitions (id, tenant_id, site_id, code, name, category, value_type, applicable_entity_kinds, sort_order)
VALUES
  ('attr_source', 'default', 'default', 'source_input', 'Sumber Input Data', 'source', 'code_list', 'all', 50);

-- Verification level attribute
INSERT OR IGNORE INTO awcms_sikesra_attribute_definitions (id, tenant_id, site_id, code, name, category, value_type, applicable_entity_kinds, sort_order)
VALUES
  ('attr_verification', 'default', 'default', 'verification_level', 'Tingkat Verifikasi', 'verification', 'code_list', 'all', 60),
  ('attr_verification_status', 'default', 'default', 'verification_status', 'Status Verifikasi', 'verification', 'code_list', 'all', 61);

-- Health attributes
INSERT OR IGNORE INTO awcms_sikesra_attribute_definitions (id, tenant_id, site_id, code, name, category, value_type, applicable_entity_kinds, sort_order)
VALUES
  ('attr_disability_type', 'default', 'default', 'disability_type', 'Jenis Disabilitas', 'health', 'code_list', 'person', 70),
  ('attr_disability_severity', 'default', 'default', 'disability_severity', 'Tingkat Keparahan Disabilitas', 'health', 'code_list', 'person', 71);

-- Education attributes
INSERT OR IGNORE INTO awcms_sikesra_attribute_definitions (id, tenant_id, site_id, code, name, category, value_type, applicable_entity_kinds, sort_order)
VALUES
  ('attr_education_level', 'default', 'default', 'education_level', 'Tingkat Pendidikan', 'education', 'code_list', 'person', 80),
  ('attr_school_participation', 'default', 'default', 'school_participation', 'Partisipasi Sekolah', 'education', 'code_list', 'person', 81);

-- Economic attributes
INSERT OR IGNORE INTO awcms_sikesra_attribute_definitions (id, tenant_id, site_id, code, name, category, value_type, applicable_entity_kinds, sort_order)
VALUES
  ('attr_income_source', 'default', 'default', 'income_source', 'Sumber Penghasilan', 'economic', 'code_list', 'person', 90),
  ('attr_social_assistance', 'default', 'default', 'social_assistance', 'Bantuan Sosial Diterima', 'economic', 'code_list', 'all', 91);
