-- SIKESRA Seed 0005: Verification Events, Audit Logs, Import Batches
-- Tenant: default, Site: default
-- Fixed: verification_events.reason → note; export_jobs.filter_json → filters_json, requested_by → created_by

-- ─── Verification Events ───────────────────────────────────────────────────

INSERT OR IGNORE INTO awcms_sikesra_verification_events
  (id, tenant_id, site_id, entity_id, actor_id, actor_role,
   verification_level, action, previous_status, next_status,
   note, request_id)
VALUES
  ('vevt_01', 'default', 'default', 'ent_masjid_al_ikhlas',
   'operator_arsel_01', 'operator', 'desa', 'submit',
   'draft', 'submitted_village', NULL, 'req_seed_001'),

  ('vevt_02', 'default', 'default', 'ent_masjid_al_ikhlas',
   'verif_desa_01', 'verifikator_desa', 'desa', 'verify',
   'submitted_village', 'submitted_subdistrict', NULL, 'req_seed_002'),

  ('vevt_03', 'default', 'default', 'ent_masjid_al_ikhlas',
   'verif_kec_01', 'verifikator_kecamatan', 'kecamatan', 'verify',
   'submitted_subdistrict', 'submitted_regency', NULL, 'req_seed_003'),

  ('vevt_04', 'default', 'default', 'ent_masjid_al_ikhlas',
   'verif_kab_01', 'verifikator_kabupaten', 'kabupaten', 'verify',
   'submitted_regency', 'verified', NULL, 'req_seed_004'),

  ('vevt_05', 'default', 'default', 'ent_mts_darul',
   'verif_kec_01', 'verifikator_kecamatan', 'kecamatan', 'revise',
   'submitted_subdistrict', 'need_revision',
   'Dokumen akta pendirian belum lengkap', 'req_seed_005'),

  ('vevt_06', 'default', 'default', 'ent_tpq_al_falah',
   'operator_arsel_01', 'operator', 'desa', 'submit',
   'draft', 'submitted_village', NULL, 'req_seed_006'),

  ('vevt_07', 'default', 'default', 'ent_tpq_al_falah',
   'verif_desa_01', 'verifikator_desa', 'desa', 'verify',
   'submitted_village', 'submitted_subdistrict', NULL, 'req_seed_007'),

  ('vevt_08', 'default', 'default', 'ent_tpq_al_falah',
   'verif_kec_01', 'verifikator_kecamatan', 'kecamatan', 'verify',
   'submitted_subdistrict', 'submitted_regency', NULL, 'req_seed_008'),

  ('vevt_09', 'default', 'default', 'ent_tpq_al_falah',
   'verif_kab_01', 'verifikator_kabupaten', 'kabupaten', 'verify',
   'submitted_regency', 'verified', NULL, 'req_seed_009'),

  ('vevt_10', 'default', 'default', 'ent_gereja_bethel',
   'operator_arsel_02', 'operator', 'desa', 'submit',
   'draft', 'submitted_village', NULL, 'req_seed_010');

-- ─── Audit Logs ────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO awcms_sikesra_audit_logs
  (id, tenant_id, site_id, action, resource_type, resource_id,
   actor_id, actor_role, success, request_id, created_at)
VALUES
  ('alog_001', 'default', 'default', 'entity.create', 'entity', 'ent_masjid_al_ikhlas',
   'operator_arsel_01', 'operator', 1, 'req_seed_001', datetime('now', '-10 days')),

  ('alog_002', 'default', 'default', 'entity.submit', 'entity', 'ent_masjid_al_ikhlas',
   'operator_arsel_01', 'operator', 1, 'req_seed_002', datetime('now', '-9 days')),

  ('alog_003', 'default', 'default', 'verification.verify', 'entity', 'ent_masjid_al_ikhlas',
   'verif_desa_01', 'verifikator_desa', 1, 'req_seed_003', datetime('now', '-8 days')),

  ('alog_004', 'default', 'default', 'verification.verify', 'entity', 'ent_masjid_al_ikhlas',
   'verif_kec_01', 'verifikator_kecamatan', 1, 'req_seed_004', datetime('now', '-7 days')),

  ('alog_005', 'default', 'default', 'verification.verify', 'entity', 'ent_masjid_al_ikhlas',
   'verif_kab_01', 'verifikator_kabupaten', 1, 'req_seed_005', datetime('now', '-6 days')),

  ('alog_006', 'default', 'default', 'entity.create', 'entity', 'ent_tpq_al_falah',
   'operator_arsel_01', 'operator', 1, 'req_seed_006', datetime('now', '-5 days')),

  ('alog_007', 'default', 'default', 'verification.revise', 'entity', 'ent_mts_darul',
   'verif_kec_01', 'verifikator_kecamatan', 1, 'req_seed_007', datetime('now', '-3 days')),

  ('alog_008', 'default', 'default', 'entity.create', 'entity', 'ent_yatim_001',
   'operator_arsel_02', 'operator', 1, 'req_seed_008', datetime('now', '-2 days')),

  ('alog_009', 'default', 'default', 'settings.update', 'settings', 'default',
   'admin_01', 'admin', 1, 'req_seed_009', datetime('now', '-1 day')),

  ('alog_010', 'default', 'default', 'entity.create', 'entity', 'ent_gereja_bethel',
   'operator_arsel_02', 'operator', 1, 'req_seed_010', datetime('now', '-12 hours')),

  ('alog_011', 'default', 'default', 'entity.create', 'entity', 'ent_dis_001',
   'operator_arsel_01', 'operator', 1, 'req_seed_011', datetime('now', '-6 hours')),

  ('alog_012', 'default', 'default', 'export.create', 'export_job', 'expjob_001',
   'admin_01', 'admin', 1, 'req_seed_012', datetime('now', '-2 hours'));

-- ─── Import Batches ────────────────────────────────────────────────────────

INSERT OR IGNORE INTO awcms_sikesra_import_batches
  (id, tenant_id, site_id, r2_key, original_filename, sheet_name,
   row_count, valid_row_count, invalid_row_count, promoted_row_count,
   status, object_type_code, created_by, created_at)
VALUES
  ('batch_001', 'default', 'default',
   'tenants/default/imports/batch_001/data-rumah-ibadah-2025.xlsx',
   'data-rumah-ibadah-2025.xlsx', 'Sheet1',
   50, 47, 3, 47, 'promoted', '01', 'operator_arsel_01',
   datetime('now', '-30 days')),

  ('batch_002', 'default', 'default',
   'tenants/default/imports/batch_002/data-anak-yatim-2026.xlsx',
   'data-anak-yatim-2026.xlsx', 'Data Yatim',
   120, 110, 10, 0, 'validated', '06', 'operator_arsel_02',
   datetime('now', '-2 days')),

  ('batch_003', 'default', 'default',
   'tenants/default/imports/batch_003/data-disabilitas-q1.xlsx',
   'data-disabilitas-q1.xlsx', 'Disabilitas',
   35, 0, 0, 0, 'uploaded', '07', 'operator_arsel_01',
   datetime('now', '-1 hour'));

-- ─── Export Jobs ───────────────────────────────────────────────────────────

INSERT OR IGNORE INTO awcms_sikesra_export_jobs
  (id, tenant_id, site_id, report_type, format, status,
   total_rows, filters_json, created_by, created_at)
VALUES
  ('expjob_001', 'default', 'default',
   'entity_summary', 'xlsx', 'ready',
   64, '{"objectType":null,"village":null}', 'admin_01',
   datetime('now', '-2 hours')),

  ('expjob_002', 'default', 'default',
   'verification_status', 'csv', 'pending',
   0, '{"level":"verified"}', 'admin_01',
   datetime('now', '-30 minutes'));

-- ─── Settings: Update public configuration ─────────────────────────────────

UPDATE awcms_sikesra_settings
SET
  public_enabled = 1,
  public_title = 'SIKESRA Kotawaringin Barat',
  public_description = 'Data Sistem Informasi Kesejahteraan Rakyat Kabupaten Kotawaringin Barat, Kalimantan Tengah. Data disajikan secara agregat dan telah melalui proses verifikasi berjenjang.',
  data_scope_note = 'Data mencakup wilayah Kabupaten Kotawaringin Barat, Provinsi Kalimantan Tengah.',
  official_contact = 'Kantor Sekretariat Daerah Kabupaten Kotawaringin Barat',
  small_cell_threshold = 5,
  max_upload_bytes = 10485760,
  export_max_sync_rows = 5000,
  require_reason_for_highly_restricted_download = 1,
  updated_at = datetime('now')
WHERE tenant_id = 'default' AND site_id = 'default' AND deleted_at IS NULL;
