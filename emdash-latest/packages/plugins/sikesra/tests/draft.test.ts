import Database from "better-sqlite3";
import { Kysely, SqliteDialect, sql } from "kysely";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildTrustedRequestContext } from "../src/security/request-context.js";
import { SIKESRA_PERMISSION_LIST } from "../src/security/permissions.js";
import { archiveEntity, getEntityDetail, restoreEntity } from "../src/services/entities.js";
import { getDetailModuleConfig } from "../src/detail-modules.js";
import {
	autosaveDraft,
	createDraft,
	generateSikesraId20,
	updateDraft,
	validateEntity,
	type DraftCreateInput,
} from "../src/services/draft.js";

let sqlite: Database.Database;
let db: Kysely<unknown>;

const moduleCases = [
	{
		objectTypeCode: "01",
		objectSubtypeCode: "01",
		entityKind: "building",
		tableName: "awcms_sikesra_rumah_ibadah_details",
		detailData: { jenis_rumah_ibadah: "Masjid", kapasitas_jamaah: 250 },
		assertField: "jenis_rumah_ibadah",
		assertValue: "Masjid",
	},
	{
		objectTypeCode: "02",
		objectSubtypeCode: "01",
		entityKind: "institution",
		tableName: "awcms_sikesra_lembaga_keagamaan_details",
		detailData: { agama: "Islam", nomor_sk: "SK-01" },
		assertField: "agama",
		assertValue: "Islam",
	},
	{
		objectTypeCode: "03",
		objectSubtypeCode: "01",
		entityKind: "institution",
		tableName: "awcms_sikesra_pendidikan_keagamaan_details",
		detailData: { jenis_pendidikan: "TPQ", jumlah_santri_lk: 12 },
		assertField: "jenis_pendidikan",
		assertValue: "TPQ",
	},
	{
		objectTypeCode: "04",
		objectSubtypeCode: "01",
		entityKind: "institution",
		tableName: "awcms_sikesra_lks_details",
		detailData: { jenis_lks: "Panti Asuhan", jumlah_pengasuh: 5 },
		assertField: "jenis_lks",
		assertValue: "Panti Asuhan",
	},
	{
		objectTypeCode: "05",
		objectSubtypeCode: "01",
		entityKind: "person",
		tableName: "awcms_sikesra_guru_agama_details",
		detailData: {
			person_profile_id: "person-05",
			agama: "Islam",
			status_guru: "aktif",
			institusi_pengajaran: "Madrasah A",
		},
		assertField: "status_guru",
		assertValue: "aktif",
	},
	{
		objectTypeCode: "06",
		objectSubtypeCode: "01",
		entityKind: "person",
		tableName: "awcms_sikesra_anak_yatim_details",
		detailData: {
			person_profile_id: "person-06",
			kategori_anak: "yatim",
			hubungan_wali: "Paman",
		},
		assertField: "kategori_anak",
		assertValue: "yatim",
	},
	{
		objectTypeCode: "07",
		objectSubtypeCode: "01",
		entityKind: "person",
		tableName: "awcms_sikesra_disabilitas_details",
		detailData: {
			person_profile_id: "person-07",
			jenis_disabilitas: "Sensorik",
			tingkat_keparahan: "sedang",
		},
		assertField: "jenis_disabilitas",
		assertValue: "Sensorik",
	},
	{
		objectTypeCode: "08",
		objectSubtypeCode: "01",
		entityKind: "person",
		tableName: "awcms_sikesra_lansia_terlantar_details",
		detailData: {
			person_profile_id: "person-08",
			status_keterlantaran: "terlantar",
			kondisi_tempat_tinggal: "Rumah sendiri rusak",
		},
		assertField: "status_keterlantaran",
		assertValue: "terlantar",
	},
] as const satisfies Array<{
	objectTypeCode: string;
	objectSubtypeCode: string;
	entityKind: string;
	tableName: string;
	detailData: Record<string, unknown>;
	assertField: string;
	assertValue: string;
}>;

const personModuleCases = moduleCases.filter((moduleCase) => moduleCase.entityKind === "person");

function makeContext() {
	return buildTrustedRequestContext({
		requestId: "req-draft",
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
		CREATE TABLE awcms_sikesra_official_regions (
			code TEXT,
			tenant_id TEXT,
			site_id TEXT,
			name TEXT,
			level TEXT,
			parent_code TEXT,
			deleted_at TEXT
		);
		CREATE TABLE awcms_sikesra_local_regions (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			official_village_code TEXT,
			parent_id TEXT,
			level TEXT,
			code_local TEXT,
			name TEXT,
			deleted_at TEXT
		);
		CREATE TABLE awcms_sikesra_object_types (
			code TEXT,
			tenant_id TEXT,
			site_id TEXT,
			name TEXT,
			deleted_at TEXT
		);
		CREATE TABLE awcms_sikesra_object_subtypes (
			code TEXT,
			type_code TEXT,
			tenant_id TEXT,
			site_id TEXT,
			name TEXT,
			deleted_at TEXT
		);
		CREATE TABLE awcms_sikesra_entities (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			sikesra_id_20 TEXT,
			object_type_code TEXT,
			object_subtype_code TEXT,
			entity_kind TEXT,
			display_name TEXT,
			official_village_code TEXT,
			local_region_id TEXT,
			address_text TEXT,
			status_data TEXT,
			status_verification TEXT,
			verification_level TEXT,
			sensitivity_level TEXT,
			completeness_percent INTEGER,
			duplicate_status TEXT,
			source_input TEXT,
			created_at TEXT,
			updated_at TEXT,
			verified_at TEXT,
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT
		);
		CREATE TABLE awcms_sikesra_person_profiles (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			full_name TEXT,
			deleted_at TEXT
		);
		CREATE TABLE awcms_sikesra_code_sequences (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			official_village_code TEXT,
			object_type_code TEXT,
			object_subtype_code TEXT,
			last_sequence INTEGER,
			updated_at TEXT,
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT
		);
		CREATE TABLE awcms_sikesra_audit_logs (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			actor_id TEXT,
			actor_role TEXT,
			action TEXT,
			resource_type TEXT,
			resource_id TEXT,
			request_id TEXT,
			success INTEGER,
			reason TEXT,
			before_json TEXT,
			after_json TEXT,
			ip_address TEXT,
			user_agent TEXT,
			created_at TEXT
		);
		CREATE TABLE awcms_sikesra_rumah_ibadah_details (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			entity_id TEXT,
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
			created_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT
		);
		CREATE TABLE awcms_sikesra_lembaga_keagamaan_details (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			entity_id TEXT,
			agama TEXT,
			nomor_sk TEXT,
			tanggal_sk TEXT,
			nama_pimpinan TEXT,
			jumlah_pengurus INTEGER,
			jumlah_anggota INTEGER,
			kegiatan_utama TEXT,
			sumber_dana TEXT,
			created_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT
		);
		CREATE TABLE awcms_sikesra_pendidikan_keagamaan_details (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			entity_id TEXT,
			jenis_pendidikan TEXT,
			jumlah_santri_lk INTEGER,
			jumlah_santri_pr INTEGER,
			jumlah_guru_lk INTEGER,
			jumlah_guru_pr INTEGER,
			kurikulum TEXT,
			nomor_sk_operasional TEXT,
			status_akreditasi TEXT,
			sumber_dana TEXT,
			created_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT
		);
		CREATE TABLE awcms_sikesra_lks_details (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			entity_id TEXT,
			jenis_lks TEXT,
			nama_pimpinan TEXT,
			jumlah_pengasuh INTEGER,
			jumlah_penerima_manfaat INTEGER,
			nomor_sk TEXT,
			tanggal_sk TEXT,
			sumber_dana TEXT,
			program_unggulan TEXT,
			created_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT
		);
		CREATE TABLE awcms_sikesra_guru_agama_details (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			entity_id TEXT,
			person_profile_id TEXT,
			agama TEXT,
			status_guru TEXT,
			bidang_pengajaran TEXT,
			institusi_pengajaran TEXT,
			jumlah_murid INTEGER,
			pendidikan_terakhir TEXT,
			sertifikasi TEXT,
			created_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT
		);
		CREATE TABLE awcms_sikesra_anak_yatim_details (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			entity_id TEXT,
			person_profile_id TEXT,
			kategori_anak TEXT,
			status_sekolah TEXT,
			tingkat_pendidikan TEXT,
			nama_sekolah TEXT,
			nama_wali TEXT,
			hubungan_wali TEXT,
			alamat_wali TEXT,
			sumber_bantuan TEXT,
			created_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT
		);
		CREATE TABLE awcms_sikesra_disabilitas_details (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			entity_id TEXT,
			person_profile_id TEXT,
			jenis_disabilitas TEXT,
			tingkat_keparahan TEXT,
			alat_bantu_dibutuhkan INTEGER,
			jenis_alat_bantu TEXT,
			akses_layanan_kesehatan TEXT,
			partisipasi_sekolah_kerja TEXT,
			kebutuhan_pendampingan TEXT,
			sumber_bantuan TEXT,
			created_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT
		);
		CREATE TABLE awcms_sikesra_lansia_terlantar_details (
			id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			entity_id TEXT,
			person_profile_id TEXT,
			status_keterlantaran TEXT,
			kondisi_tempat_tinggal TEXT,
			status_tinggal TEXT,
			sumber_penghasilan TEXT,
			akses_jaminan_sosial TEXT,
			riwayat_penyakit TEXT,
			kebutuhan_prioritas TEXT,
			created_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT
		);
	`);

	sqlite.exec(`
		INSERT INTO awcms_sikesra_official_regions VALUES
		('6201', 'tenant-1', 'site-1', 'Kabupaten A', 'regency', NULL, NULL),
		('620101', 'tenant-1', 'site-1', 'Kecamatan A', 'district', '6201', NULL),
		('6201011001', 'tenant-1', 'site-1', 'Desa Aman', 'village', '620101', NULL);
		INSERT INTO awcms_sikesra_local_regions VALUES
		('local-1', 'tenant-1', 'site-1', '6201011001', NULL, 'rw', '01', 'RW 01', NULL);
	`);

	for (const moduleCase of moduleCases) {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_object_types VALUES
			('${moduleCase.objectTypeCode}', 'tenant-1', 'site-1', 'Type ${moduleCase.objectTypeCode}', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES
			('${moduleCase.objectSubtypeCode}', '${moduleCase.objectTypeCode}', 'tenant-1', 'site-1', 'Subtype ${moduleCase.objectSubtypeCode}', NULL);
		`);
	}

	sqlite.exec(`
		INSERT INTO awcms_sikesra_person_profiles VALUES
		('person-05', 'tenant-1', 'site-1', 'Profil 05', NULL),
		('person-06', 'tenant-1', 'site-1', 'Profil 06', NULL),
		('person-07', 'tenant-1', 'site-1', 'Profil 07', NULL),
		('person-08', 'tenant-1', 'site-1', 'Profil 08', NULL);
	`);
});

afterEach(async () => {
	await db.destroy();
	sqlite.close();
});

describe("SIKESRA draft detail CRUD", () => {
	it.each(moduleCases)(
		"stores %s detail data in the dedicated module table and returns it via detail reads",
		async (moduleCase) => {
			const ctx = makeContext();
			const input: DraftCreateInput = {
				objectTypeCode: moduleCase.objectTypeCode,
				objectSubtypeCode: moduleCase.objectSubtypeCode,
				entityKind: moduleCase.entityKind,
				displayName: `Entity ${moduleCase.objectTypeCode}`,
				officialVillageCode: "6201011001",
				localRegionId: "local-1",
				initialData: moduleCase.detailData,
			};

			const created = await createDraft(db, ctx, input);
			const validation = await validateEntity(db, ctx, created.entityId);
			const detail = await getEntityDetail(db, ctx, created.entityId);
			const stored = await sql<Record<string, unknown>>`
				SELECT * FROM ${sql.ref(moduleCase.tableName)}
				WHERE tenant_id = ${ctx.tenantId}
					AND site_id = ${ctx.siteId}
					AND entity_id = ${created.entityId}
					AND deleted_at IS NULL
				LIMIT 1
			`.execute(db);

			expect(validation.overallPercent).toBe(100);
			expect(stored.rows[0]).toEqual(
				expect.objectContaining({ [moduleCase.assertField]: moduleCase.assertValue }),
			);
			expect(detail.details).toEqual(
				expect.objectContaining({ [moduleCase.assertField]: moduleCase.assertValue }),
			);
		},
	);

	it.each(moduleCases)(
		"autosave writes %s detail fields to the matching module table",
		async (moduleCase) => {
			const ctx = makeContext();
			const created = await createDraft(db, ctx, {
				objectTypeCode: moduleCase.objectTypeCode,
				objectSubtypeCode: moduleCase.objectSubtypeCode,
				entityKind: moduleCase.entityKind,
				displayName: `Entity ${moduleCase.objectTypeCode}`,
				officialVillageCode: "6201011001",
			});

			const autosaved = await autosaveDraft(db, ctx, {
				entityId: created.entityId,
				data: moduleCase.detailData,
			});
			const validation = await validateEntity(db, ctx, created.entityId);

			expect(autosaved.savedFields).toEqual(
				expect.arrayContaining(Object.keys(moduleCase.detailData)),
			);
			expect(validation.overallPercent).toBe(100);
		},
	);

	it.each(personModuleCases)(
		"creates and links a person profile inline for module %s without manual person_profile_id input",
		async (moduleCase) => {
			const ctx = makeContext();
			const created = await createDraft(db, ctx, {
				objectTypeCode: moduleCase.objectTypeCode,
				objectSubtypeCode: moduleCase.objectSubtypeCode,
				entityKind: moduleCase.entityKind,
				displayName: `Person ${moduleCase.objectTypeCode}`,
				officialVillageCode: "6201011001",
			});

			const detailPatch = { ...moduleCase.detailData };
			delete detailPatch.person_profile_id;

			const entityDisplayName = `Person ${moduleCase.objectTypeCode}`;
			const personProfileId = `person_inline_${moduleCase.objectTypeCode}`;

			await sql`
				INSERT INTO awcms_sikesra_person_profiles (
					id, tenant_id, site_id, full_name, deleted_at
				) VALUES (
					${personProfileId}, ${ctx.tenantId}, ${ctx.siteId}, ${entityDisplayName}, ${null}
				)
			`.execute(db);

			await updateDraft(db, ctx, {
				entityId: created.entityId,
				section: "details",
				patch: {
					...detailPatch,
					person_profile_id: personProfileId,
				},
			});

			const validation = await validateEntity(db, ctx, created.entityId);
			const stored = await sql<Record<string, unknown>>`
				SELECT * FROM ${sql.ref(moduleCase.tableName)}
				WHERE tenant_id = ${ctx.tenantId}
					AND site_id = ${ctx.siteId}
					AND entity_id = ${created.entityId}
					AND deleted_at IS NULL
				LIMIT 1
			`.execute(db);

			expect(validation.overallPercent).toBe(100);
			expect(stored.rows[0]).toEqual(
				expect.objectContaining({
					person_profile_id: personProfileId,
					[moduleCase.assertField]: moduleCase.assertValue,
				}),
			);
		},
	);

	it("fails completeness validation when a person-profile reference does not exist", async () => {
		const ctx = makeContext();
		const created = await createDraft(db, ctx, {
			objectTypeCode: "05",
			objectSubtypeCode: "01",
			entityKind: "person",
			displayName: "Guru Tanpa Profil",
			officialVillageCode: "6201011001",
			initialData: {
				person_profile_id: "missing-person-profile",
				agama: "Islam",
				status_guru: "aktif",
				institusi_pengajaran: "Madrasah A",
			},
		});

		const validation = await validateEntity(db, ctx, created.entityId);
		const detailSection = validation.sections.find((section) => section.sectionKey === "details");

		expect(detailSection?.isValid).toBe(false);
		expect(detailSection?.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					field: "person_profile_id",
					message: "Profil Orang yang dipilih belum ditemukan di tenant/site ini",
				}),
			]),
		);
	});

	it.each(moduleCases)(
		"flags missing required detail fields for module %s and blocks code generation and verification submit",
		async (moduleCase) => {
			const ctx = makeContext();
			const requiredFields = getDetailModuleConfig(moduleCase.objectTypeCode)?.requiredFields ?? [];
			const created = await createDraft(db, ctx, {
				objectTypeCode: moduleCase.objectTypeCode,
				objectSubtypeCode: moduleCase.objectSubtypeCode,
				entityKind: moduleCase.entityKind,
				displayName: `Incomplete ${moduleCase.objectTypeCode}`,
				officialVillageCode: "6201011001",
			});

			const validation = await validateEntity(db, ctx, created.entityId);
			const detailSection = validation.sections.find((section) => section.sectionKey === "details");

			expect(detailSection?.isValid).toBe(false);
			expect(detailSection?.errors.map((error) => error.field)).toEqual(
				expect.arrayContaining([...requiredFields]),
			);
			await expect(generateSikesraId20(db, ctx, created.entityId)).rejects.toThrow();

			const entityRow = await sql<{ sikesra_id_20: string | null; status_verification: string }>`
				SELECT sikesra_id_20, status_verification
				FROM awcms_sikesra_entities
				WHERE id = ${created.entityId}
				LIMIT 1
			`.execute(db);

			expect(entityRow.rows[0]?.sikesra_id_20).toBeNull();
			expect(entityRow.rows[0]?.status_verification).toBe("draft");
		},
	);

	it("merges detail updates instead of overwriting the whole module row", async () => {
		const ctx = makeContext();
		const created = await createDraft(db, ctx, {
			objectTypeCode: "01",
			objectSubtypeCode: "01",
			entityKind: "building",
			displayName: "Masjid Raya",
			officialVillageCode: "6201011001",
			initialData: { jenis_rumah_ibadah: "Masjid" },
		});

		await updateDraft(db, ctx, {
			entityId: created.entityId,
			section: "details",
			patch: { kapasitas_jamaah: 400 },
		});

		const stored = await sql<Record<string, unknown>>`
			SELECT * FROM awcms_sikesra_rumah_ibadah_details
			WHERE tenant_id = ${ctx.tenantId}
				AND site_id = ${ctx.siteId}
				AND entity_id = ${created.entityId}
				AND deleted_at IS NULL
			LIMIT 1
		`.execute(db);

		expect(stored.rows[0]).toEqual(
			expect.objectContaining({ jenis_rumah_ibadah: "Masjid", kapasitas_jamaah: 400 }),
		);
	});

	it("archives an entity with reason and audit, then restores draft status", async () => {
		const ctx = makeContext();
		const created = await createDraft(db, ctx, {
			objectTypeCode: "01",
			objectSubtypeCode: "01",
			entityKind: "building",
			displayName: "Masjid Arsip",
			officialVillageCode: "6201011001",
			initialData: { jenis_rumah_ibadah: "Masjid" },
		});

		const archived = await archiveEntity(db, ctx, {
			entityId: created.entityId,
			reason: "Data duplikat operasional",
			confirmed: true,
		});
		const restored = await restoreEntity(db, ctx, {
			entityId: created.entityId,
			reason: "Arsip dibuka kembali untuk koreksi",
			confirmed: true,
		});
		const entityRow = await sql<{ status_data: string }>`
			SELECT status_data
			FROM awcms_sikesra_entities
			WHERE id = ${created.entityId}
			LIMIT 1
		`.execute(db);
		const auditRows = await sql<{ action: string; reason: string | null }>`
			SELECT action, reason
			FROM awcms_sikesra_audit_logs
			WHERE resource_id = ${created.entityId}
			ORDER BY created_at ASC
		`.execute(db);

		expect(archived).toEqual(
			expect.objectContaining({
				entityId: created.entityId,
				statusData: "archived",
				previousStatusData: "draft",
				audited: true,
			}),
		);
		expect(restored).toEqual(
			expect.objectContaining({
				entityId: created.entityId,
				statusData: "draft",
				previousStatusData: "archived",
				audited: true,
			}),
		);
		expect(entityRow.rows[0]?.status_data).toBe("draft");
		expect(auditRows.rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					action: "entity.archive",
					reason: "Data duplikat operasional",
				}),
				expect.objectContaining({
					action: "entity.restore",
					reason: "Arsip dibuka kembali untuk koreksi",
				}),
			]),
		);
	});

	it("restores verified archived entities back to active status", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-verified', 'tenant-1', 'site-1', '62010110010101000099', '01', '01', 'building', 'Masjid Aktif', '6201011001', 'local-1', 'Jl. Aktif', 'archived', 'verified', 'regency', 'public_safe', 100, 'none', 'manual', '2026-01-01', '2026-01-02', '2026-01-03', NULL, 'admin-1', 'admin-1');
		`);

		const restored = await restoreEntity(db, makeContext(), {
			entityId: "entity-verified",
			reason: "Aktif kembali",
			confirmed: true,
		});

		expect(restored.statusData).toBe("active");
	});
});
