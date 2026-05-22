export interface SikesraDetailModuleConfig {
	objectTypeCode: string;
	tableName: string;
	fields: readonly string[];
	requiredFields: readonly string[];
}

export const SIKESRA_DETAIL_MODULES: Record<string, SikesraDetailModuleConfig> = {
	"01": {
		objectTypeCode: "01",
		tableName: "awcms_sikesra_rumah_ibadah_details",
		fields: [
			"jenis_rumah_ibadah",
			"status_pembangunan",
			"luas_bangunan",
			"luas_tanah",
			"kapasitas_jamaah",
			"tahun_didirikan",
			"imam_nama",
			"pengurus_nama",
			"kegiatan_rutin",
			"sumber_dana",
		],
		requiredFields: ["jenis_rumah_ibadah"],
	},
	"02": {
		objectTypeCode: "02",
		tableName: "awcms_sikesra_lembaga_keagamaan_details",
		fields: [
			"agama",
			"nomor_sk",
			"tanggal_sk",
			"nama_pimpinan",
			"jumlah_pengurus",
			"jumlah_anggota",
			"kegiatan_utama",
			"sumber_dana",
		],
		requiredFields: ["agama"],
	},
	"03": {
		objectTypeCode: "03",
		tableName: "awcms_sikesra_pendidikan_keagamaan_details",
		fields: [
			"jenis_pendidikan",
			"jumlah_santri_lk",
			"jumlah_santri_pr",
			"jumlah_guru_lk",
			"jumlah_guru_pr",
			"kurikulum",
			"nomor_sk_operasional",
			"status_akreditasi",
			"sumber_dana",
		],
		requiredFields: ["jenis_pendidikan"],
	},
	"04": {
		objectTypeCode: "04",
		tableName: "awcms_sikesra_lks_details",
		fields: [
			"jenis_lks",
			"nama_pimpinan",
			"jumlah_pengasuh",
			"jumlah_penerima_manfaat",
			"nomor_sk",
			"tanggal_sk",
			"sumber_dana",
			"program_unggulan",
		],
		requiredFields: ["jenis_lks"],
	},
	"05": {
		objectTypeCode: "05",
		tableName: "awcms_sikesra_guru_agama_details",
		fields: [
			"person_profile_id",
			"agama",
			"status_guru",
			"bidang_pengajaran",
			"institusi_pengajaran",
			"jumlah_murid",
			"pendidikan_terakhir",
			"sertifikasi",
		],
		requiredFields: ["person_profile_id", "agama", "status_guru", "institusi_pengajaran"],
	},
	"06": {
		objectTypeCode: "06",
		tableName: "awcms_sikesra_anak_yatim_details",
		fields: [
			"person_profile_id",
			"kategori_anak",
			"status_sekolah",
			"tingkat_pendidikan",
			"nama_sekolah",
			"nama_wali",
			"hubungan_wali",
			"alamat_wali",
			"sumber_bantuan",
		],
		requiredFields: ["person_profile_id", "kategori_anak", "hubungan_wali"],
	},
	"07": {
		objectTypeCode: "07",
		tableName: "awcms_sikesra_disabilitas_details",
		fields: [
			"person_profile_id",
			"jenis_disabilitas",
			"tingkat_keparahan",
			"alat_bantu_dibutuhkan",
			"jenis_alat_bantu",
			"akses_layanan_kesehatan",
			"partisipasi_sekolah_kerja",
			"kebutuhan_pendampingan",
			"sumber_bantuan",
		],
		requiredFields: ["person_profile_id", "jenis_disabilitas", "tingkat_keparahan"],
	},
	"08": {
		objectTypeCode: "08",
		tableName: "awcms_sikesra_lansia_terlantar_details",
		fields: [
			"person_profile_id",
			"status_keterlantaran",
			"kondisi_tempat_tinggal",
			"status_tinggal",
			"sumber_penghasilan",
			"akses_jaminan_sosial",
			"riwayat_penyakit",
			"kebutuhan_prioritas",
		],
		requiredFields: ["person_profile_id", "status_keterlantaran", "kondisi_tempat_tinggal"],
	},
};

export function getDetailModuleConfig(objectTypeCode: string) {
	return SIKESRA_DETAIL_MODULES[objectTypeCode];
}
