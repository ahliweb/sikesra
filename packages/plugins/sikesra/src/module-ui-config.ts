export interface ModuleSubtypeUiOption {
	code: string;
	label: string;
}

export interface ModuleFieldUiOption {
	label: string;
	value: string;
}

export interface ModuleFieldUiConfig {
	key: string;
	label: string;
	input: "text" | "textarea" | "number" | "select";
	required?: boolean;
	helperText?: string;
	placeholder?: string;
	options?: readonly ModuleFieldUiOption[];
}

export interface ModuleUiConfig {
	objectTypeCode: string;
	label: string;
	description: string;
	entityKind: "person" | "institution" | "building" | "group" | "service_record";
	subtypes: readonly ModuleSubtypeUiOption[];
	detailFields: readonly ModuleFieldUiConfig[];
}

const YA_TIDAK_OPTIONS = [
	{ label: "Ya", value: "1" },
	{ label: "Tidak", value: "0" },
] as const;

export const SIKESRA_MODULE_UI_CONFIG: readonly ModuleUiConfig[] = [
	{
		objectTypeCode: "01",
		label: "Rumah Ibadah",
		description: "Pendataan bangunan rumah ibadah dan sarana pendukungnya.",
		entityKind: "building",
		subtypes: [
			{ code: "01", label: "Masjid" },
			{ code: "02", label: "Musholla" },
			{ code: "03", label: "Surau" },
			{ code: "04", label: "Gereja" },
			{ code: "05", label: "Pura" },
			{ code: "06", label: "Wihara" },
			{ code: "07", label: "Klenteng" },
			{ code: "99", label: "Lainnya" },
		],
		detailFields: [
			{ key: "jenis_rumah_ibadah", label: "Jenis Rumah Ibadah", input: "select", required: true, options: [
				{ label: "Masjid", value: "Masjid" },
				{ label: "Musholla", value: "Musholla" },
				{ label: "Surau", value: "Surau" },
				{ label: "Gereja", value: "Gereja" },
				{ label: "Pura", value: "Pura" },
				{ label: "Wihara", value: "Wihara" },
				{ label: "Klenteng", value: "Klenteng" },
				{ label: "Lainnya", value: "Lainnya" },
			] },
			{ key: "status_pembangunan", label: "Status Pembangunan", input: "select", options: [
				{ label: "Beroperasi", value: "beroperasi" },
				{ label: "Dalam pembangunan", value: "dalam_pembangunan" },
				{ label: "Renovasi", value: "renovasi" },
			] },
			{ key: "luas_bangunan", label: "Luas Bangunan", input: "number", helperText: "Isi dalam meter persegi." },
			{ key: "luas_tanah", label: "Luas Tanah", input: "number", helperText: "Isi dalam meter persegi." },
			{ key: "kapasitas_jamaah", label: "Kapasitas Jamaah", input: "number" },
			{ key: "tahun_didirikan", label: "Tahun Didirikan", input: "number", placeholder: "Contoh: 1998" },
			{ key: "imam_nama", label: "Nama Imam/Pemuka", input: "text" },
			{ key: "pengurus_nama", label: "Nama Pengurus", input: "text" },
			{ key: "kegiatan_rutin", label: "Kegiatan Rutin", input: "textarea" },
			{ key: "sumber_dana", label: "Sumber Dana", input: "text" },
		],
	},
	{
		objectTypeCode: "02",
		label: "Lembaga Keagamaan",
		description: "Pendataan lembaga keagamaan tingkat lokal sampai kabupaten.",
		entityKind: "institution",
		subtypes: [
			{ code: "01", label: "Islam" },
			{ code: "02", label: "Kristen" },
			{ code: "03", label: "Katolik" },
			{ code: "04", label: "Hindu" },
			{ code: "05", label: "Buddha" },
			{ code: "06", label: "Konghucu" },
			{ code: "99", label: "Lainnya" },
		],
		detailFields: [
			{ key: "agama", label: "Agama", input: "select", required: true, options: [
				{ label: "Islam", value: "Islam" },
				{ label: "Kristen", value: "Kristen" },
				{ label: "Katolik", value: "Katolik" },
				{ label: "Hindu", value: "Hindu" },
				{ label: "Buddha", value: "Buddha" },
				{ label: "Konghucu", value: "Konghucu" },
				{ label: "Lainnya", value: "Lainnya" },
			] },
			{ key: "nomor_sk", label: "Nomor SK", input: "text" },
			{ key: "tanggal_sk", label: "Tanggal SK", input: "text", placeholder: "YYYY-MM-DD" },
			{ key: "nama_pimpinan", label: "Nama Pimpinan", input: "text" },
			{ key: "jumlah_pengurus", label: "Jumlah Pengurus", input: "number" },
			{ key: "jumlah_anggota", label: "Jumlah Anggota", input: "number" },
			{ key: "kegiatan_utama", label: "Kegiatan Utama", input: "textarea" },
			{ key: "sumber_dana", label: "Sumber Dana", input: "text" },
		],
	},
	{
		objectTypeCode: "03",
		label: "Pendidikan Keagamaan",
		description: "Pendataan satuan pendidikan keagamaan formal dan non-formal.",
		entityKind: "institution",
		subtypes: [
			{ code: "01", label: "TPA/TPQ" },
			{ code: "02", label: "Pondok Pesantren" },
			{ code: "99", label: "Lainnya" },
		],
		detailFields: [
			{ key: "jenis_pendidikan", label: "Jenis Pendidikan", input: "select", required: true, options: [
				{ label: "TPA/TPQ", value: "TPA/TPQ" },
				{ label: "Pondok Pesantren", value: "Pondok Pesantren" },
				{ label: "Lainnya", value: "Lainnya" },
			] },
			{ key: "jumlah_santri_lk", label: "Jumlah Santri Laki-laki", input: "number" },
			{ key: "jumlah_santri_pr", label: "Jumlah Santri Perempuan", input: "number" },
			{ key: "jumlah_guru_lk", label: "Jumlah Guru Laki-laki", input: "number" },
			{ key: "jumlah_guru_pr", label: "Jumlah Guru Perempuan", input: "number" },
			{ key: "kurikulum", label: "Kurikulum", input: "textarea" },
			{ key: "nomor_sk_operasional", label: "Nomor SK Operasional", input: "text" },
			{ key: "status_akreditasi", label: "Status Akreditasi", input: "select", options: [
				{ label: "Terakreditasi", value: "terakreditasi" },
				{ label: "Proses", value: "proses" },
				{ label: "Belum", value: "belum" },
			] },
			{ key: "sumber_dana", label: "Sumber Dana", input: "text" },
		],
	},
	{
		objectTypeCode: "04",
		label: "LKS / Lembaga Kesejahteraan Sosial",
		description: "Pendataan lembaga sosial, bantuan, dan pengasuhan.",
		entityKind: "institution",
		subtypes: [
			{ code: "01", label: "BAZNAS" },
			{ code: "02", label: "PWRI" },
			{ code: "03", label: "Panti Asuhan" },
			{ code: "04", label: "Panti Yatim" },
			{ code: "05", label: "Panti Jompo" },
			{ code: "06", label: "Rukun Kematian" },
			{ code: "07", label: "Majelis Taklim" },
			{ code: "99", label: "LKS Lainnya" },
		],
		detailFields: [
			{ key: "jenis_lks", label: "Jenis LKS", input: "select", required: true, options: [
				{ label: "BAZNAS", value: "BAZNAS" },
				{ label: "PWRI", value: "PWRI" },
				{ label: "Panti Asuhan", value: "Panti Asuhan" },
				{ label: "Panti Yatim", value: "Panti Yatim" },
				{ label: "Panti Jompo", value: "Panti Jompo" },
				{ label: "Rukun Kematian", value: "Rukun Kematian" },
				{ label: "Majelis Taklim", value: "Majelis Taklim" },
				{ label: "LKS Lainnya", value: "LKS Lainnya" },
			] },
			{ key: "nama_pimpinan", label: "Nama Pimpinan", input: "text" },
			{ key: "jumlah_pengasuh", label: "Jumlah Pengasuh", input: "number" },
			{ key: "jumlah_penerima_manfaat", label: "Jumlah Penerima Manfaat", input: "number" },
			{ key: "nomor_sk", label: "Nomor SK", input: "text" },
			{ key: "tanggal_sk", label: "Tanggal SK", input: "text", placeholder: "YYYY-MM-DD" },
			{ key: "sumber_dana", label: "Sumber Dana", input: "text" },
			{ key: "program_unggulan", label: "Program Unggulan", input: "textarea" },
		],
	},
	{
		objectTypeCode: "05",
		label: "Guru Agama",
		description: "Pendataan guru agama lintas satuan dan pembinaan.",
		entityKind: "person",
		subtypes: [
			{ code: "01", label: "Rumahan" },
			{ code: "02", label: "Lembaga" },
			{ code: "99", label: "Lainnya" },
		],
		detailFields: [
			{ key: "person_profile_id", label: "Profil Orang", input: "text", required: true, helperText: "Masukkan ID profil orang yang sudah ada. Pencarian dan pembuatan profil baru belum tersedia langsung di shell admin ini." },
			{ key: "agama", label: "Agama", input: "select", required: true, options: [
				{ label: "Islam", value: "Islam" },
				{ label: "Kristen", value: "Kristen" },
				{ label: "Katolik", value: "Katolik" },
				{ label: "Hindu", value: "Hindu" },
				{ label: "Buddha", value: "Buddha" },
				{ label: "Konghucu", value: "Konghucu" },
				{ label: "Lainnya", value: "Lainnya" },
			] },
			{ key: "status_guru", label: "Status Guru", input: "select", required: true, options: [
				{ label: "Aktif", value: "aktif" },
				{ label: "Tidak Aktif", value: "tidak_aktif" },
				{ label: "Pensiun", value: "pensiun" },
				{ label: "Almarhum", value: "almarhum" },
			] },
			{ key: "bidang_pengajaran", label: "Bidang Pengajaran", input: "text" },
			{ key: "institusi_pengajaran", label: "Institusi Pengajaran", input: "text", required: true },
			{ key: "jumlah_murid", label: "Jumlah Murid", input: "number" },
			{ key: "pendidikan_terakhir", label: "Pendidikan Terakhir", input: "text" },
			{ key: "sertifikasi", label: "Sertifikasi", input: "text" },
		],
	},
	{
		objectTypeCode: "06",
		label: "Anak Yatim",
		description: "Pendataan anak yatim, piatu, dan yatim piatu.",
		entityKind: "person",
		subtypes: [
			{ code: "01", label: "Yatim" },
			{ code: "02", label: "Piatu" },
			{ code: "03", label: "Yatim Piatu" },
		],
		detailFields: [
			{ key: "person_profile_id", label: "Profil Orang", input: "text", required: true, helperText: "Masukkan ID profil orang yang sudah ada. Detail identitas sensitif tetap dimask server-side." },
			{ key: "kategori_anak", label: "Kategori Anak", input: "select", required: true, options: [
				{ label: "Yatim", value: "yatim" },
				{ label: "Piatu", value: "piatu" },
				{ label: "Yatim Piatu", value: "yatim_piatu" },
			] },
			{ key: "status_sekolah", label: "Status Sekolah", input: "text" },
			{ key: "tingkat_pendidikan", label: "Tingkat Pendidikan", input: "text" },
			{ key: "nama_sekolah", label: "Nama Sekolah", input: "text" },
			{ key: "nama_wali", label: "Nama Wali", input: "text" },
			{ key: "hubungan_wali", label: "Hubungan Wali", input: "text", required: true },
			{ key: "alamat_wali", label: "Alamat Wali", input: "textarea" },
			{ key: "sumber_bantuan", label: "Sumber Bantuan", input: "text" },
		],
	},
	{
		objectTypeCode: "07",
		label: "Disabilitas",
		description: "Pendataan penyandang disabilitas dan kebutuhan dukungan.",
		entityKind: "person",
		subtypes: [
			{ code: "01", label: "Fisik" },
			{ code: "02", label: "Intelektual" },
			{ code: "03", label: "Mental" },
			{ code: "04", label: "Sensorik" },
		],
		detailFields: [
			{ key: "person_profile_id", label: "Profil Orang", input: "text", required: true, helperText: "Masukkan ID profil orang yang sudah ada. Detail sensitif tidak akan ditampilkan penuh pada review umum." },
			{ key: "jenis_disabilitas", label: "Jenis Disabilitas", input: "select", required: true, options: [
				{ label: "Fisik", value: "Fisik" },
				{ label: "Intelektual", value: "Intelektual" },
				{ label: "Mental", value: "Mental" },
				{ label: "Sensorik", value: "Sensorik" },
			] },
			{ key: "tingkat_keparahan", label: "Tingkat Keparahan", input: "select", required: true, options: [
				{ label: "Ringan", value: "ringan" },
				{ label: "Sedang", value: "sedang" },
				{ label: "Berat", value: "berat" },
			] },
			{ key: "alat_bantu_dibutuhkan", label: "Alat Bantu Dibutuhkan", input: "select", options: YA_TIDAK_OPTIONS },
			{ key: "jenis_alat_bantu", label: "Jenis Alat Bantu", input: "text" },
			{ key: "akses_layanan_kesehatan", label: "Akses Layanan Kesehatan", input: "text" },
			{ key: "partisipasi_sekolah_kerja", label: "Partisipasi Sekolah/Kerja", input: "text" },
			{ key: "kebutuhan_pendampingan", label: "Kebutuhan Pendampingan", input: "textarea" },
			{ key: "sumber_bantuan", label: "Sumber Bantuan", input: "text" },
		],
	},
	{
		objectTypeCode: "08",
		label: "Lansia Terlantar",
		description: "Pendataan lansia terlantar, rawan terlantar, dan mandiri berisiko.",
		entityKind: "person",
		subtypes: [
			{ code: "01", label: "Terlantar" },
			{ code: "02", label: "Rawan Terlantar" },
			{ code: "03", label: "Mandiri dengan Risiko" },
		],
		detailFields: [
			{ key: "person_profile_id", label: "Profil Orang", input: "text", required: true, helperText: "Masukkan ID profil orang yang sudah ada. Workflow pencarian dan pembuatan profil baru masih akan ditingkatkan." },
			{ key: "status_keterlantaran", label: "Status Keterlantaran", input: "select", required: true, options: [
				{ label: "Terlantar", value: "terlantar" },
				{ label: "Rawan Terlantar", value: "rawan_terlantar" },
				{ label: "Mandiri dengan Risiko", value: "mandiri_risiko" },
			] },
			{ key: "kondisi_tempat_tinggal", label: "Kondisi Tempat Tinggal", input: "textarea", required: true },
			{ key: "status_tinggal", label: "Status Tinggal", input: "select", options: [
				{ label: "Sendiri", value: "sendiri" },
				{ label: "Pasangan", value: "pasangan" },
				{ label: "Keluarga", value: "keluarga" },
				{ label: "Panti", value: "panti" },
			] },
			{ key: "sumber_penghasilan", label: "Sumber Penghasilan", input: "text" },
			{ key: "akses_jaminan_sosial", label: "Akses Jaminan Sosial", input: "text" },
			{ key: "riwayat_penyakit", label: "Riwayat Penyakit", input: "textarea" },
			{ key: "kebutuhan_prioritas", label: "Kebutuhan Prioritas", input: "textarea" },
		],
	},
] as const;

const MODULE_UI_CONFIG_MAP = new Map(
	SIKESRA_MODULE_UI_CONFIG.map((config) => [config.objectTypeCode, config]),
);

export function listModuleUiConfigs(): readonly ModuleUiConfig[] {
	return SIKESRA_MODULE_UI_CONFIG;
}

export function getModuleUiConfig(objectTypeCode: string): ModuleUiConfig | undefined {
	return MODULE_UI_CONFIG_MAP.get(objectTypeCode);
}

export function getModuleUiFieldConfig(
	objectTypeCode: string,
	fieldKey: string,
): ModuleFieldUiConfig | undefined {
	return getModuleUiConfig(objectTypeCode)?.detailFields.find((field) => field.key === fieldKey);
}

export function getModuleSubtypeLabel(objectTypeCode: string, subtypeCode: string): string {
	const subtype = getModuleUiConfig(objectTypeCode)?.subtypes.find((item) => item.code === subtypeCode);
	return subtype?.label ?? subtypeCode;
}

export function getModuleSubtypeOptions(objectTypeCode?: string): Array<{ label: string; value: string }> {
	if (objectTypeCode) {
		return (getModuleUiConfig(objectTypeCode)?.subtypes ?? []).map((subtype) => ({
			label: subtype.label,
			value: subtype.code,
		}));
	}

	return SIKESRA_MODULE_UI_CONFIG.flatMap((moduleConfig) =>
		moduleConfig.subtypes.map((subtype) => ({
			label: `${moduleConfig.label}: ${subtype.label}`,
			value: `${moduleConfig.objectTypeCode}:${subtype.code}`,
		})),
	);
}

export function hasModuleSubtype(objectTypeCode: string, subtypeCode: string): boolean {
	return getModuleUiConfig(objectTypeCode)?.subtypes.some((subtype) => subtype.code === subtypeCode) ?? false;
}

export function getEntityKindLabel(entityKind: string): string {
	switch (entityKind) {
		case "person":
			return "Perorangan";
		case "institution":
			return "Lembaga";
		case "building":
			return "Bangunan";
		case "group":
			return "Kelompok";
		case "service_record":
			return "Catatan Layanan";
		default:
			return entityKind;
	}
}
