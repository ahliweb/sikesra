-- SIKESRA Seed 0004: Dummy Data for Development & Demo
-- Tenant: default, Site: default
-- Region scope: Kalimantan Tengah / Kotawaringin Barat

-- ─── Additional Official Regions ───────────────────────────────────────────

INSERT OR IGNORE INTO awcms_sikesra_official_regions
  (code, tenant_id, site_id, name, level, parent_code, is_active)
VALUES
  ('620102001', 'default', 'default', 'Mendawai',  'village', '620102', 1),
  ('620102002', 'default', 'default', 'Raja',       'village', '620102', 1),
  ('620102003', 'default', 'default', 'Baru',       'village', '620102', 1),
  ('620102004', 'default', 'default', 'Pasir Panjang', 'village', '620102', 1),
  ('620103',    'default', 'default', 'Arut Utara', 'district', '6201',   1),
  ('620103001', 'default', 'default', 'Pangkut',    'village', '620103', 1),
  ('620103002', 'default', 'default', 'Gandang',    'village', '620103', 1);

-- ─── Local Regions (RT/RW level) ──────────────────────────────────────────

INSERT OR IGNORE INTO awcms_sikesra_local_regions
  (id, tenant_id, site_id, official_village_code, level, code_local, name, is_active)
VALUES
  ('lr_rw01_sdj',  'default', 'default', '6201021005', 'rw',  'RW-01', 'RW 01 Sidorejo', 1),
  ('lr_rw02_sdj',  'default', 'default', '6201021005', 'rw',  'RW-02', 'RW 02 Sidorejo', 1),
  ('lr_rt001_sdj', 'default', 'default', '6201021005', 'rt',  'RT-001', 'RT 001', 1),
  ('lr_rt002_sdj', 'default', 'default', '6201021005', 'rt',  'RT-002', 'RT 002', 1),
  ('lr_rt003_sdj', 'default', 'default', '6201021005', 'rt',  'RT-003', 'RT 003', 1),
  ('lr_rw01_mnd',  'default', 'default', '620102001',  'rw',  'RW-01', 'RW 01 Mendawai', 1),
  ('lr_rt001_mnd', 'default', 'default', '620102001',  'rt',  'RT-001', 'RT 001 Mendawai', 1);

-- ─── Entities: Rumah Ibadah (type 01 - building) ─────────────────────────

INSERT OR IGNORE INTO awcms_sikesra_entities
  (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind,
   display_name, official_village_code, local_region_id, address_text,
   status_data, status_verification, verification_level,
   sensitivity_level, completeness_percent, source_input, created_by)
VALUES
  ('ent_masjid_al_ikhlas', 'default', 'default', '01', '0101', 'building',
   'Masjid Al-Ikhlas Sidorejo', '6201021005', 'lr_rw01_sdj',
   'Jl. Ahmad Yani No. 12, Sidorejo, Arut Selatan',
   'active', 'verified', 'kabupaten',
   'internal', 90, 'manual', 'seed'),

  ('ent_masjid_nur', 'default', 'default', '01', '0101', 'building',
   'Masjid Nurul Huda Mendawai', '620102001', 'lr_rw01_mnd',
   'Jl. Diponegoro No. 5, Mendawai',
   'active', 'submitted_regency', 'kabupaten',
   'internal', 75, 'manual', 'seed'),

  ('ent_gereja_bethel', 'default', 'default', '01', '0104', 'building',
   'Gereja Bethel Indonesia Pangkalan Bun', '6201021005', 'lr_rw02_sdj',
   'Jl. S. Parman No. 8, Sidorejo',
   'submitted', 'submitted_village', 'desa',
   'internal', 60, 'manual', 'seed'),

  ('ent_pura_darma', 'default', 'default', '01', '0103', 'building',
   'Pura Dharma Sidhi', '620102002', NULL,
   'Jl. Nusantara No. 3, Raja',
   'draft', 'unverified', 'desa',
   'internal', 40, 'manual', 'seed'),

  ('ent_vihara_avaloki', 'default', 'default', '01', '0105', 'building',
   'Vihara Avalokitesvara', '620102003', NULL,
   'Jl. Pemuda No. 22, Baru',
   'active', 'verified', 'kabupaten',
   'internal', 85, 'manual', 'seed');

-- ─── Entities: Lembaga Keagamaan (type 02 - institution) ─────────────────

INSERT OR IGNORE INTO awcms_sikesra_entities
  (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind,
   display_name, official_village_code, address_text,
   status_data, status_verification, verification_level,
   sensitivity_level, completeness_percent, source_input, created_by)
VALUES
  ('ent_mta_kotim', 'default', 'default', '02', '0201', 'institution',
   'Majelis Taklim Al-Hikmah Kotawaringin', '6201021005',
   'Jl. Ahmad Yani No. 45, Sidorejo',
   'active', 'verified', 'kabupaten',
   'internal', 80, 'manual', 'seed'),

  ('ent_yayasan_riyadh', 'default', 'default', '02', '0202', 'institution',
   'Yayasan Riyadhus Sholihin', '620102001',
   'Jl. Mangga No. 7, Mendawai',
   'submitted', 'submitted_subdistrict', 'kecamatan',
   'internal', 65, 'manual', 'seed');

-- ─── Entities: Pendidikan Keagamaan (type 03 - institution) ──────────────

INSERT OR IGNORE INTO awcms_sikesra_entities
  (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind,
   display_name, official_village_code, address_text,
   status_data, status_verification, verification_level,
   sensitivity_level, completeness_percent, source_input, created_by)
VALUES
  ('ent_tpq_al_falah', 'default', 'default', '03', '0301', 'institution',
   'TPQ Al-Falah Sidorejo', '6201021005',
   'Jl. Merdeka No. 3, RT 001, Sidorejo',
   'active', 'verified', 'kabupaten',
   'internal', 95, 'manual', 'seed'),

  ('ent_mts_darul', 'default', 'default', '03', '0302', 'institution',
   'MTs Darul Ulum Pangkalan Bun', '620102002',
   'Jl. Hasanuddin No. 12, Raja',
   'active', 'need_revision', 'kecamatan',
   'internal', 70, 'manual', 'seed');

-- ─── Entities: LKS Panti (type 04 - institution) ─────────────────────────

INSERT OR IGNORE INTO awcms_sikesra_entities
  (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind,
   display_name, official_village_code, address_text,
   status_data, status_verification, verification_level,
   sensitivity_level, completeness_percent, source_input, created_by)
VALUES
  ('ent_panti_asuhan_nur', 'default', 'default', '04', '0401', 'institution',
   'Panti Asuhan Nurul Iman', '6201021005',
   'Jl. Barito No. 9, Sidorejo',
   'active', 'verified', 'kabupaten',
   'internal', 88, 'manual', 'seed');

-- ─── Entities: Guru Agama (type 05 - person) ─────────────────────────────

INSERT OR IGNORE INTO awcms_sikesra_entities
  (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind,
   display_name, official_village_code,
   status_data, status_verification, verification_level,
   sensitivity_level, completeness_percent, source_input, created_by)
VALUES
  ('ent_guru_ahmad', 'default', 'default', '05', '0501', 'person',
   'Ustadz Ahmad Fauzi', '6201021005',
   'active', 'verified', 'kabupaten',
   'restricted', 85, 'manual', 'seed'),

  ('ent_guru_sari', 'default', 'default', '05', '0501', 'person',
   'Ibu Sari Wulandari', '620102001',
   'submitted', 'submitted_village', 'desa',
   'restricted', 50, 'manual', 'seed');

-- ─── Entities: Anak Yatim (type 06 - person) ─────────────────────────────

INSERT OR IGNORE INTO awcms_sikesra_entities
  (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind,
   display_name, official_village_code,
   status_data, status_verification, verification_level,
   sensitivity_level, completeness_percent, source_input, created_by)
VALUES
  ('ent_yatim_001', 'default', 'default', '06', '0601', 'person',
   'Anak Yatim #001', '6201021005',
   'active', 'verified', 'kabupaten',
   'highly_restricted', 90, 'manual', 'seed'),

  ('ent_yatim_002', 'default', 'default', '06', '0601', 'person',
   'Anak Yatim #002', '6201021005',
   'active', 'verified', 'kabupaten',
   'highly_restricted', 80, 'manual', 'seed'),

  ('ent_yatim_003', 'default', 'default', '06', '0601', 'person',
   'Anak Yatim #003', '620102001',
   'draft', 'unverified', 'desa',
   'highly_restricted', 30, 'manual', 'seed');

-- ─── Entities: Disabilitas (type 07 - person) ────────────────────────────

INSERT OR IGNORE INTO awcms_sikesra_entities
  (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind,
   display_name, official_village_code,
   status_data, status_verification, verification_level,
   sensitivity_level, completeness_percent, source_input, created_by)
VALUES
  ('ent_dis_001', 'default', 'default', '07', '0701', 'person',
   'Penyandang Disabilitas #001', '6201021005',
   'active', 'verified', 'kabupaten',
   'restricted', 92, 'import', 'seed'),

  ('ent_dis_002', 'default', 'default', '07', '0702', 'person',
   'Penyandang Disabilitas #002', '620102002',
   'submitted', 'submitted_subdistrict', 'kecamatan',
   'restricted', 65, 'manual', 'seed');

-- ─── Entities: Lansia Terlantar (type 08 - person) ───────────────────────

INSERT OR IGNORE INTO awcms_sikesra_entities
  (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind,
   display_name, official_village_code,
   status_data, status_verification, verification_level,
   sensitivity_level, completeness_percent, source_input, created_by)
VALUES
  ('ent_lansia_001', 'default', 'default', '08', '0801', 'person',
   'Lansia Terlantar #001', '6201021005',
   'active', 'verified', 'kabupaten',
   'restricted', 88, 'manual', 'seed'),

  ('ent_lansia_002', 'default', 'default', '08', '0801', 'person',
   'Lansia Terlantar #002', '620102003',
   'submitted', 'submitted_village', 'desa',
   'restricted', 55, 'manual', 'seed');
