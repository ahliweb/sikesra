import Database from "better-sqlite3";
import { Kysely, SqliteDialect, sql } from "kysely";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildAdminPage } from "../src/admin-pages.js";
import { buildTrustedRequestContext } from "../src/security/request-context.js";
import { SIKESRA_PERMISSION_LIST } from "../src/security/permissions.js";

let sqlite: Database.Database;
let db: Kysely<unknown>;

const moduleSmokeCases = [
	{
		objectTypeCode: "01",
		objectSubtypeCode: "01:01",
		entityKind: "building",
		displayName: "Smoke Rumah Ibadah",
		detailTable: "awcms_sikesra_rumah_ibadah_details",
		detailPatch: { jenis_rumah_ibadah: "Masjid" },
	},
	{
		objectTypeCode: "02",
		objectSubtypeCode: "02:01",
		entityKind: "institution",
		displayName: "Smoke Lembaga Keagamaan",
		detailTable: "awcms_sikesra_lembaga_keagamaan_details",
		detailPatch: { agama: "Islam" },
	},
	{
		objectTypeCode: "03",
		objectSubtypeCode: "03:01",
		entityKind: "institution",
		displayName: "Smoke Pendidikan Keagamaan",
		detailTable: "awcms_sikesra_pendidikan_keagamaan_details",
		detailPatch: { jenis_pendidikan: "TPA/TPQ" },
	},
	{
		objectTypeCode: "04",
		objectSubtypeCode: "04:01",
		entityKind: "institution",
		displayName: "Smoke LKS",
		detailTable: "awcms_sikesra_lks_details",
		detailPatch: { jenis_lks: "BAZNAS" },
	},
	{
		objectTypeCode: "05",
		objectSubtypeCode: "05:01",
		entityKind: "person",
		displayName: "Smoke Guru Agama",
		detailTable: "awcms_sikesra_guru_agama_details",
		detailPatch: {
			person_profile_mode: "create_inline",
			person_profile_full_name: "Smoke Guru Agama",
			agama: "Islam",
			status_guru: "aktif",
			institusi_pengajaran: "Madrasah Smoke",
		},
	},
	{
		objectTypeCode: "06",
		objectSubtypeCode: "06:01",
		entityKind: "person",
		displayName: "Smoke Anak Yatim",
		detailTable: "awcms_sikesra_anak_yatim_details",
		detailPatch: {
			person_profile_mode: "create_inline",
			person_profile_full_name: "Smoke Anak Yatim",
			kategori_anak: "yatim",
			hubungan_wali: "Paman",
		},
	},
	{
		objectTypeCode: "07",
		objectSubtypeCode: "07:01",
		entityKind: "person",
		displayName: "Smoke Disabilitas",
		detailTable: "awcms_sikesra_disabilitas_details",
		detailPatch: {
			person_profile_mode: "create_inline",
			person_profile_full_name: "Smoke Disabilitas",
			jenis_disabilitas: "Fisik",
			tingkat_keparahan: "ringan",
		},
	},
	{
		objectTypeCode: "08",
		objectSubtypeCode: "08:01",
		entityKind: "person",
		displayName: "Smoke Lansia",
		detailTable: "awcms_sikesra_lansia_terlantar_details",
		detailPatch: {
			person_profile_mode: "create_inline",
			person_profile_full_name: "Smoke Lansia",
			status_keterlantaran: "terlantar",
			kondisi_tempat_tinggal: "Rumah sederhana",
		},
	},
] as const;

function makeContext() {
	return buildTrustedRequestContext({
		requestId: "req-smoke",
		tenantId: "tenant-1",
		siteId: "site-1",
		userId: "admin-1",
		roles: ["admin"],
		permissions: [...SIKESRA_PERMISSION_LIST],
		regionScope: {},
	});
}

beforeEach(() => {
	sqlite = new Database(":memory:");
	db = new Kysely({ dialect: new SqliteDialect({ database: sqlite }) });
	sqlite.exec(`
		CREATE TABLE awcms_sikesra_official_regions (code TEXT, tenant_id TEXT, site_id TEXT, name TEXT, level TEXT, parent_code TEXT, deleted_at TEXT);
		CREATE TABLE awcms_sikesra_local_regions (id TEXT, tenant_id TEXT, site_id TEXT, official_village_code TEXT, parent_id TEXT, level TEXT, code_local TEXT, name TEXT, deleted_at TEXT);
		CREATE TABLE awcms_sikesra_object_types (code TEXT, tenant_id TEXT, site_id TEXT, name TEXT, deleted_at TEXT);
		CREATE TABLE awcms_sikesra_object_subtypes (code TEXT, type_code TEXT, tenant_id TEXT, site_id TEXT, name TEXT, deleted_at TEXT);
		CREATE TABLE awcms_sikesra_entities (id TEXT, tenant_id TEXT, site_id TEXT, sikesra_id_20 TEXT, object_type_code TEXT, object_subtype_code TEXT, entity_kind TEXT, display_name TEXT, official_village_code TEXT, local_region_id TEXT, address_text TEXT, status_data TEXT, status_verification TEXT, verification_level TEXT, sensitivity_level TEXT, completeness_percent INTEGER, duplicate_status TEXT, source_input TEXT, created_at TEXT, updated_at TEXT, verified_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_person_profiles (id TEXT, tenant_id TEXT, site_id TEXT, full_name TEXT, deleted_at TEXT);
		CREATE TABLE awcms_sikesra_code_sequences (id TEXT, tenant_id TEXT, site_id TEXT, official_village_code TEXT, object_type_code TEXT, object_subtype_code TEXT, last_sequence INTEGER, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_audit_logs (id TEXT, tenant_id TEXT, site_id TEXT, actor_id TEXT, actor_role TEXT, action TEXT, resource_type TEXT, resource_id TEXT, request_id TEXT, success INTEGER, reason TEXT, before_json TEXT, after_json TEXT, ip_address TEXT, user_agent TEXT, created_at TEXT);
		CREATE TABLE awcms_sikesra_verification_events (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, actor_id TEXT, actor_role TEXT, verification_level TEXT, action TEXT, previous_status TEXT, next_status TEXT, note TEXT, request_id TEXT, ip_address TEXT, created_at TEXT);
		CREATE TABLE awcms_sikesra_duplicate_candidates (id TEXT, tenant_id TEXT, site_id TEXT, entity_id_a TEXT, entity_id_b TEXT, match_signals_json TEXT, match_score REAL, risk_level TEXT, detection_source TEXT, import_batch_id TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_file_objects (id TEXT, tenant_id TEXT, site_id TEXT, r2_key TEXT, original_filename TEXT, safe_filename TEXT, mime_type TEXT, size_bytes INTEGER, checksum_sha256 TEXT, classification TEXT, document_type TEXT, is_verified INTEGER, verified_by TEXT, verified_at TEXT, superseded_by_id TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_supporting_documents (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, file_object_id TEXT, document_type TEXT, classification TEXT, is_verified INTEGER, notes TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_rumah_ibadah_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, jenis_rumah_ibadah TEXT, status_pembangunan TEXT, luas_bangunan REAL, luas_tanah REAL, kapasitas_jamaah INTEGER, tahun_didirikan INTEGER, imam_nama TEXT, pengurus_nama TEXT, kegiatan_rutin TEXT, sumber_dana TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_lembaga_keagamaan_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, agama TEXT, nomor_sk TEXT, tanggal_sk TEXT, nama_pimpinan TEXT, jumlah_pengurus INTEGER, jumlah_anggota INTEGER, kegiatan_utama TEXT, sumber_dana TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_pendidikan_keagamaan_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, jenis_pendidikan TEXT, jumlah_santri_lk INTEGER, jumlah_santri_pr INTEGER, jumlah_guru_lk INTEGER, jumlah_guru_pr INTEGER, kurikulum TEXT, nomor_sk_operasional TEXT, status_akreditasi TEXT, sumber_dana TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_lks_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, jenis_lks TEXT, nama_pimpinan TEXT, jumlah_pengasuh INTEGER, jumlah_penerima_manfaat INTEGER, nomor_sk TEXT, tanggal_sk TEXT, sumber_dana TEXT, program_unggulan TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_guru_agama_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, agama TEXT, status_guru TEXT, bidang_pengajaran TEXT, institusi_pengajaran TEXT, jumlah_murid INTEGER, pendidikan_terakhir TEXT, sertifikasi TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_anak_yatim_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, kategori_anak TEXT, status_sekolah TEXT, tingkat_pendidikan TEXT, nama_sekolah TEXT, nama_wali TEXT, hubungan_wali TEXT, alamat_wali TEXT, sumber_bantuan TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_disabilitas_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, jenis_disabilitas TEXT, tingkat_keparahan TEXT, alat_bantu_dibutuhkan INTEGER, jenis_alat_bantu TEXT, akses_layanan_kesehatan TEXT, partisipasi_sekolah_kerja TEXT, kebutuhan_pendampingan TEXT, sumber_bantuan TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_lansia_terlantar_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, status_keterlantaran TEXT, kondisi_tempat_tinggal TEXT, status_tinggal TEXT, sumber_penghasilan TEXT, akses_jaminan_sosial TEXT, riwayat_penyakit TEXT, kebutuhan_prioritas TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
	`);

	sqlite.exec(`
		INSERT INTO awcms_sikesra_official_regions VALUES ('6201011001', 'tenant-1', 'site-1', 'Desa Aman', 'village', '620101', NULL);
		INSERT INTO awcms_sikesra_local_regions VALUES ('local-1', 'tenant-1', 'site-1', '6201011001', NULL, 'rw', '01', 'RW 01', NULL);
		INSERT INTO awcms_sikesra_object_types VALUES ('01', 'tenant-1', 'site-1', 'Rumah Ibadah', NULL);
		INSERT INTO awcms_sikesra_object_types VALUES ('02', 'tenant-1', 'site-1', 'Lembaga Keagamaan', NULL);
		INSERT INTO awcms_sikesra_object_types VALUES ('03', 'tenant-1', 'site-1', 'Pendidikan Keagamaan', NULL);
		INSERT INTO awcms_sikesra_object_types VALUES ('04', 'tenant-1', 'site-1', 'LKS', NULL);
		INSERT INTO awcms_sikesra_object_types VALUES ('05', 'tenant-1', 'site-1', 'Guru Agama', NULL);
		INSERT INTO awcms_sikesra_object_types VALUES ('06', 'tenant-1', 'site-1', 'Anak Yatim', NULL);
		INSERT INTO awcms_sikesra_object_types VALUES ('07', 'tenant-1', 'site-1', 'Disabilitas', NULL);
		INSERT INTO awcms_sikesra_object_types VALUES ('08', 'tenant-1', 'site-1', 'Lansia Terlantar', NULL);
		INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '01', 'tenant-1', 'site-1', 'Masjid', NULL);
		INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '02', 'tenant-1', 'site-1', 'Islam', NULL);
		INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '03', 'tenant-1', 'site-1', 'TPA/TPQ', NULL);
		INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '04', 'tenant-1', 'site-1', 'BAZNAS', NULL);
		INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '05', 'tenant-1', 'site-1', 'Rumahan', NULL);
		INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '06', 'tenant-1', 'site-1', 'Yatim', NULL);
		INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '07', 'tenant-1', 'site-1', 'Fisik', NULL);
		INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '08', 'tenant-1', 'site-1', 'Terlantar', NULL);
	`);
});

afterEach(async () => {
	await db.destroy();
	sqlite.close();
});

describe("SIKESRA smoke workflow", () => {
	it.each(moduleSmokeCases)("runs create, detail update, validate, registry filter, and detail open for module $objectTypeCode", async (scenario) => {
		const ctx = makeContext();

		await buildAdminPage(db, ctx, "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:create_draft",
				objectTypeCode: scenario.objectTypeCode,
				objectSubtypeCode: scenario.objectSubtypeCode,
				entityKind: scenario.entityKind,
				displayName: scenario.displayName,
				officialVillageCode: "6201011001",
			},
		});

		const createdEntity = await sql<{ id: string }>`
			SELECT id
			FROM awcms_sikesra_entities
			WHERE display_name = ${scenario.displayName}
			LIMIT 1
		`.execute(db);
		const entityId = createdEntity.rows[0]?.id;
		if (!entityId) throw new Error(`Expected entity to be created for ${scenario.objectTypeCode}`);

		await buildAdminPage(db, ctx, "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:update_section",
				entityId,
				section: "details",
				...scenario.detailPatch,
			},
		});

		const validation = await buildAdminPage(db, ctx, "/entities", {
			type: "block_action",
			values: { action_id: "entities:validate", entityId },
		});
		const registry = await buildAdminPage(db, ctx, "/entities", {
			type: "form_submit",
			values: { action_id: "entities:filter", objectTypeCode: scenario.objectTypeCode },
		});
		const detail = await buildAdminPage(db, ctx, "/entities", {
			type: "block_action",
			values: { action_id: "entities:view", entityId },
		});
		const detailRow = await sql<Record<string, unknown>>`
			SELECT * FROM ${sql.ref(scenario.detailTable)} WHERE entity_id = ${entityId} LIMIT 1
		`.execute(db);

		expect(validation.blocks).toEqual(expect.arrayContaining([expect.objectContaining({ type: "header", text: "Hasil Validasi" })]));
		const registryTable = registry.blocks.find((block) => block.type === "table");
		const registryRows = Array.isArray(registryTable?.rows) ? registryTable.rows : [];
		expect(registryRows).toEqual(expect.arrayContaining([expect.objectContaining({ id: entityId, displayName: scenario.displayName })]));
		expect(detail.blocks).toEqual(expect.arrayContaining([expect.objectContaining({ type: "header", text: scenario.displayName })]));
		expect(detailRow.rows[0]).toBeDefined();
	});
});
