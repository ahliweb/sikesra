-- SIKESRA Migration 0004: MVP Detail Modules
-- Eight detail tables, one per MVP object type
-- D1-compatible SQL; PostgreSQL-friendly design

-- Type 01: Rumah Ibadah (Houses of Worship)
CREATE TABLE awcms_sikesra_rumah_ibadah_details (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  jenis_rumah_ibadah TEXT,
  status_pembangunan TEXT,
  luas_bangunan REAL,
  luas_tanah REAL,
  kapasitas_jamaah INTEGER,
  tahun_didirikan INTEGER,
  imam_nama TEXT,
  pengurus_nama TEXT,
  kegiatan_rutin TEXT,
  sumber_dana TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id)
);

CREATE INDEX idx_rumah_ibadah_entity ON awcms_sikesra_rumah_ibadah_details(tenant_id, site_id, entity_id, deleted_at);

-- Type 02: Lembaga Keagamaan (Religious Institutions)
CREATE TABLE awcms_sikesra_lembaga_keagamaan_details (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  agama TEXT,
  nomor_sk TEXT,
  tanggal_sk TEXT,
  nama_pimpinan TEXT,
  jumlah_pengurus INTEGER,
  jumlah_anggota INTEGER,
  kegiatan_utama TEXT,
  sumber_dana TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id)
);

CREATE INDEX idx_lembaga_keagamaan_entity ON awcms_sikesra_lembaga_keagamaan_details(tenant_id, site_id, entity_id, deleted_at);

-- Type 03: Pendidikan Keagamaan (Religious Education)
CREATE TABLE awcms_sikesra_pendidikan_keagamaan_details (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  jenis_pendidikan TEXT,
  jumlah_santri_lk INTEGER,
  jumlah_santri_pr INTEGER,
  jumlah_guru_lk INTEGER,
  jumlah_guru_pr INTEGER,
  kurikulum TEXT,
  nomor_sk_operasional TEXT,
  status_akreditasi TEXT,
  sumber_dana TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id)
);

CREATE INDEX idx_pendidikan_keagamaan_entity ON awcms_sikesra_pendidikan_keagamaan_details(tenant_id, site_id, entity_id, deleted_at);

-- Type 04: Lembaga Kesejahteraan Sosial (Social Welfare Institutions)
CREATE TABLE awcms_sikesra_lks_details (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  jenis_lks TEXT,
  nama_pimpinan TEXT,
  jumlah_pengasuh INTEGER,
  jumlah_penerima_manfaat INTEGER,
  nomor_sk TEXT,
  tanggal_sk TEXT,
  sumber_dana TEXT,
  program_unggulan TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id)
);

CREATE INDEX idx_lks_entity ON awcms_sikesra_lks_details(tenant_id, site_id, entity_id, deleted_at);

-- Type 05: Guru Agama (Religious Teachers)
CREATE TABLE awcms_sikesra_guru_agama_details (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  person_profile_id TEXT,
  agama TEXT,
  status_guru TEXT CHECK (status_guru IN ('aktif','tidak_aktif','pensiun','almarhum')),
  bidang_pengajaran TEXT,
  institusi_pengajaran TEXT,
  jumlah_murid INTEGER,
  pendidikan_terakhir TEXT,
  sertifikasi TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id),
  FOREIGN KEY (person_profile_id) REFERENCES awcms_sikesra_person_profiles(id)
);

CREATE INDEX idx_guru_agama_entity ON awcms_sikesra_guru_agama_details(tenant_id, site_id, entity_id, deleted_at);

-- Type 06: Anak Yatim (Orphans)
CREATE TABLE awcms_sikesra_anak_yatim_details (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  person_profile_id TEXT,
  kategori_anak TEXT CHECK (kategori_anak IN ('yatim','piatu','yatim_piatu')),
  status_sekolah TEXT,
  tingkat_pendidikan TEXT,
  nama_sekolah TEXT,
  nama_wali TEXT,
  hubungan_wali TEXT,
  alamat_wali TEXT,
  sumber_bantuan TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id),
  FOREIGN KEY (person_profile_id) REFERENCES awcms_sikesra_person_profiles(id)
);

CREATE INDEX idx_anak_yatim_entity ON awcms_sikesra_anak_yatim_details(tenant_id, site_id, entity_id, deleted_at);

-- Type 07: Disabilitas (Persons with Disabilities)
CREATE TABLE awcms_sikesra_disabilitas_details (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  person_profile_id TEXT,
  jenis_disabilitas TEXT,
  tingkat_keparahan TEXT CHECK (tingkat_keparahan IN ('ringan','sedang','berat')),
  alat_bantu_dibutuhkan INTEGER NOT NULL DEFAULT 0,
  jenis_alat_bantu TEXT,
  akses_layanan_kesehatan TEXT,
  partisipasi_sekolah_kerja TEXT,
  kebutuhan_pendampingan TEXT,
  sumber_bantuan TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id),
  FOREIGN KEY (person_profile_id) REFERENCES awcms_sikesra_person_profiles(id)
);

CREATE INDEX idx_disabilitas_entity ON awcms_sikesra_disabilitas_details(tenant_id, site_id, entity_id, deleted_at);

-- Type 08: Lansia Terlantar (Neglected Elderly)
CREATE TABLE awcms_sikesra_lansia_terlantar_details (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  person_profile_id TEXT,
  status_keterlantaran TEXT CHECK (status_keterlantaran IN ('terlantar','rawan_terlantar','mandiri_risiko')),
  kondisi_tempat_tinggal TEXT,
  status_tinggal TEXT CHECK (status_tinggal IN ('sendiri','pasangan','keluarga','panti')),
  sumber_penghasilan TEXT,
  akses_jaminan_sosial TEXT,
  riwayat_penyakit TEXT,
  kebutuhan_prioritas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (entity_id) REFERENCES awcms_sikesra_entities(id),
  FOREIGN KEY (person_profile_id) REFERENCES awcms_sikesra_person_profiles(id)
);

CREATE INDEX idx_lansia_terlantar_entity ON awcms_sikesra_lansia_terlantar_details(tenant_id, site_id, entity_id, deleted_at);
