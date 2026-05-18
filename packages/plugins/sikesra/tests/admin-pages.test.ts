import Database from "better-sqlite3";
import { Kysely, SqliteDialect, sql } from "kysely";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildAdminPage } from "../src/admin-pages.js";
import { buildTrustedRequestContext } from "../src/security/request-context.js";
import { SIKESRA_PERMISSION_LIST } from "../src/security/permissions.js";

let sqlite: Database.Database;
let db: Kysely<unknown>;

function makeContext() {
	return buildTrustedRequestContext({
		requestId: "req-admin-pages",
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
		CREATE TABLE awcms_sikesra_entities (
			id TEXT, tenant_id TEXT, site_id TEXT, sikesra_id_20 TEXT, object_type_code TEXT, object_subtype_code TEXT,
			entity_kind TEXT, display_name TEXT, official_village_code TEXT, local_region_id TEXT, address_text TEXT,
			status_data TEXT, status_verification TEXT, verification_level TEXT, sensitivity_level TEXT,
			completeness_percent INTEGER, duplicate_status TEXT, source_input TEXT, created_at TEXT, updated_at TEXT,
			verified_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT
		);
		CREATE TABLE awcms_sikesra_person_profiles (id TEXT, tenant_id TEXT, site_id TEXT, full_name TEXT, deleted_at TEXT);
		CREATE TABLE awcms_sikesra_code_sequences (id TEXT, tenant_id TEXT, site_id TEXT, official_village_code TEXT, object_type_code TEXT, object_subtype_code TEXT, last_sequence INTEGER, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_audit_logs (id TEXT, tenant_id TEXT, site_id TEXT, actor_id TEXT, actor_role TEXT, action TEXT, resource_type TEXT, resource_id TEXT, request_id TEXT, success INTEGER, reason TEXT, before_json TEXT, after_json TEXT, ip_address TEXT, user_agent TEXT, created_at TEXT);
		CREATE TABLE awcms_sikesra_rumah_ibadah_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, jenis_rumah_ibadah TEXT, status_pembangunan TEXT, luas_bangunan REAL, luas_tanah REAL, kapasitas_jamaah INTEGER, tahun_didirikan INTEGER, imam_nama TEXT, pengurus_nama TEXT, kegiatan_rutin TEXT, sumber_dana TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_verification_events (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, actor_id TEXT, actor_role TEXT, verification_level TEXT, action TEXT, previous_status TEXT, next_status TEXT, note TEXT, request_id TEXT, ip_address TEXT, created_at TEXT);
		CREATE TABLE awcms_sikesra_duplicate_candidates (id TEXT, tenant_id TEXT, site_id TEXT, entity_id_a TEXT, entity_id_b TEXT, match_signals_json TEXT, match_score REAL, risk_level TEXT, detection_source TEXT, import_batch_id TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_file_objects (id TEXT, tenant_id TEXT, site_id TEXT, r2_key TEXT, original_filename TEXT, safe_filename TEXT, mime_type TEXT, size_bytes INTEGER, checksum_sha256 TEXT, classification TEXT, document_type TEXT, is_verified INTEGER, verified_by TEXT, verified_at TEXT, superseded_by_id TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_supporting_documents (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, file_object_id TEXT, document_type TEXT, classification TEXT, is_verified INTEGER, notes TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), deleted_at TEXT, created_by TEXT, updated_by TEXT);
	`);

	sqlite.exec(`
		INSERT INTO awcms_sikesra_official_regions VALUES ('6201011001', 'tenant-1', 'site-1', 'Desa Aman', 'village', '620101', NULL);
		INSERT INTO awcms_sikesra_local_regions VALUES ('local-1', 'tenant-1', 'site-1', '6201011001', NULL, 'rw', '01', 'RW 01', NULL);
		INSERT INTO awcms_sikesra_object_types VALUES ('01', 'tenant-1', 'site-1', 'Rumah Ibadah', NULL);
		INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '01', 'tenant-1', 'site-1', 'Masjid', NULL);
	`);
});

afterEach(async () => {
	await db.destroy();
	sqlite.close();
});

describe("SIKESRA admin entity workflow", () => {
	it("shows the 8 data-type management section on the dashboard", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_object_types VALUES ('02', 'tenant-1', 'site-1', 'Lembaga Keagamaan', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('03', 'tenant-1', 'site-1', 'Pendidikan Keagamaan', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('04', 'tenant-1', 'site-1', 'LKS', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('05', 'tenant-1', 'site-1', 'Guru Agama', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('06', 'tenant-1', 'site-1', 'Anak Yatim', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('07', 'tenant-1', 'site-1', 'Disabilitas', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('08', 'tenant-1', 'site-1', 'Lansia Terlantar', NULL);
		`);

		const dashboard = await buildAdminPage(db, makeContext(), "/");
		const moduleTable = dashboard.blocks.find((block) => block.type === "table" && Array.isArray(block.rows) && block.rows.some((row) => row.objectTypeCode === "01"));

		expect(dashboard.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Kelola 8 Jenis Data SIKESRA" }),
			]),
		);
		expect(moduleTable).toEqual(
			expect.objectContaining({
				rows: expect.arrayContaining([
					expect.objectContaining({ objectTypeCode: "01", module: "Rumah Ibadah", actions: "Input Data | Lihat Daftar" }),
					expect.objectContaining({ objectTypeCode: "08", module: "Lansia Terlantar", actions: "Input Data | Lihat Daftar" }),
				]),
			}),
		);
	});

	it("opens a module-preset create form and a module-filtered list from the dashboard", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-dashboard-01', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Dashboard', '6201011001', 'local-1', 'Jl. Dashboard', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-dashboard-02', 'tenant-1', 'site-1', NULL, '02', '01', 'institution', 'Lembaga Dashboard', '6201011001', 'local-1', 'Jl. Dashboard 2', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-03', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_object_types VALUES ('02', 'tenant-1', 'site-1', 'Lembaga Keagamaan', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '02', 'tenant-1', 'site-1', 'Islam', NULL);
		`);

		const createForm = await buildAdminPage(db, makeContext(), "/", {
			type: "block_action",
			values: { action_id: "dashboard:input_module", objectTypeCode: "02" },
		});
		const filteredList = await buildAdminPage(db, makeContext(), "/", {
			type: "block_action",
			values: { action_id: "dashboard:view_module", objectTypeCode: "01" },
		});
		const createFormBlock = createForm.blocks.find((block) => block.type === "form");
		const createFields = Array.isArray(createFormBlock?.fields) ? createFormBlock.fields : [];
		const listTable = filteredList.blocks.find((block) => block.type === "table");
		const listRows = Array.isArray(listTable?.rows) ? listTable.rows : [];

		expect(createFields.find((field) => field.action_id === "objectTypeCode")).toEqual(
			expect.objectContaining({ value: "02", description: expect.stringContaining("Lembaga Keagamaan") }),
		);
		expect(createFields.find((field) => field.action_id === "agama")).toEqual(
			expect.objectContaining({ label: "Agama" }),
		);
		expect(listRows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ displayName: "Masjid Dashboard" }),
			]),
		);
		expect(listRows.some((row) => row.displayName === "Lembaga Dashboard")).toBe(false);
	});

	it("shows a dedicated per-type list view with type-specific heading and input action", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_object_types VALUES ('04', 'tenant-1', 'site-1', 'LKS', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '04', 'tenant-1', 'site-1', 'BAZNAS', NULL);
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-lks-1', 'tenant-1', 'site-1', NULL, '04', '01', 'institution', 'LKS A', '6201011001', 'local-1', 'Jl. LKS', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-ri-1', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Campur', '6201011001', 'local-1', 'Jl. Masjid', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-03', NULL, NULL, 'admin-1', 'admin-1');
		`);

		const typeList = await buildAdminPage(db, makeContext(), "/entities", {
			type: "block_action",
			values: { action_id: "entities:view_type_list", objectTypeCode: "04" },
		});
		const actionsBlock = typeList.blocks.find((block) => block.type === "actions" && Array.isArray(block.elements) && block.elements.some((element) => element.action_id === "entities:start_create_module"));
		const tableBlock = typeList.blocks.find((block) => block.type === "table");
		const rows = Array.isArray(tableBlock?.rows) ? tableBlock.rows : [];

		expect(typeList.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Daftar LKS / Lembaga Kesejahteraan Sosial" }),
				expect.objectContaining({ type: "context", text: expect.stringContaining("hanya menampilkan data") }),
			]),
		);
		expect(actionsBlock).toEqual(
			expect.objectContaining({
				elements: expect.arrayContaining([
					expect.objectContaining({ action_id: "entities:start_create_module", objectTypeCode: "04", label: "Input Data Baru LKS / Lembaga Kesejahteraan Sosial" }),
				]),
			}),
		);
		expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({ displayName: "LKS A" })]));
		expect(rows.some((row) => row.displayName === "Masjid Campur")).toBe(false);
	});

	it("shows a person-specific input form with inline profile fields from a module entry point", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_object_types VALUES ('05', 'tenant-1', 'site-1', 'Guru Agama', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '05', 'tenant-1', 'site-1', 'Rumahan', NULL);
		`);

		const createForm = await buildAdminPage(db, makeContext(), "/", {
			type: "block_action",
			values: { action_id: "dashboard:input_module", objectTypeCode: "05" },
		});
		const formBlock = createForm.blocks.find((block) => block.type === "form");
		const formFields = Array.isArray(formBlock?.fields) ? formBlock.fields : [];

		expect(createForm.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Input Guru Agama" }),
			]),
		);
		expect(formFields).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ action_id: "person_profile_mode", label: "Aksi Profil Orang" }),
				expect.objectContaining({ action_id: "person_profile_full_name", label: "Nama Lengkap Profil Orang" }),
				expect.objectContaining({ action_id: "status_guru", label: "Status Guru" }),
			]),
		);
	});

	it("creates institution and person module drafts from type-specific forms", async () => {
		sqlite.exec(`
			CREATE TABLE awcms_sikesra_lembaga_keagamaan_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, agama TEXT, nomor_sk TEXT, tanggal_sk TEXT, nama_pimpinan TEXT, jumlah_pengurus INTEGER, jumlah_anggota INTEGER, kegiatan_utama TEXT, sumber_dana TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			CREATE TABLE awcms_sikesra_guru_agama_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, agama TEXT, status_guru TEXT, bidang_pengajaran TEXT, institusi_pengajaran TEXT, jumlah_murid INTEGER, pendidikan_terakhir TEXT, sertifikasi TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			INSERT INTO awcms_sikesra_object_types VALUES ('02', 'tenant-1', 'site-1', 'Lembaga Keagamaan', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('05', 'tenant-1', 'site-1', 'Guru Agama', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '02', 'tenant-1', 'site-1', 'Islam', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '05', 'tenant-1', 'site-1', 'Rumahan', NULL);
		`);

		await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:create_draft",
				objectTypeCode: "02",
				objectSubtypeCode: "02:01",
				displayName: "Lembaga Form Khusus",
				officialVillageCode: "6201011001",
				agama: "Islam",
			},
		});

		await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:create_draft",
				objectTypeCode: "05",
				objectSubtypeCode: "05:01",
				displayName: "Guru Form Khusus",
				officialVillageCode: "6201011001",
				person_profile_mode: "create_inline",
				person_profile_full_name: "Guru Form Khusus",
				agama: "Islam",
				status_guru: "aktif",
				institusi_pengajaran: "Madrasah Form",
			},
		});

		const institutionDetail = await sql<{ agama: string }>`
			SELECT agama FROM awcms_sikesra_lembaga_keagamaan_details WHERE entity_id IN (
				SELECT id FROM awcms_sikesra_entities WHERE display_name = 'Lembaga Form Khusus' LIMIT 1
			) LIMIT 1
		`.execute(db);
		const personDetail = await sql<{ person_profile_id: string; status_guru: string }>`
			SELECT person_profile_id, status_guru FROM awcms_sikesra_guru_agama_details WHERE entity_id IN (
				SELECT id FROM awcms_sikesra_entities WHERE display_name = 'Guru Form Khusus' LIMIT 1
			) LIMIT 1
		`.execute(db);

		expect(institutionDetail.rows[0]?.agama).toBe("Islam");
		expect(personDetail.rows[0]?.status_guru).toBe("aktif");
		expect(personDetail.rows[0]?.person_profile_id).toContain("person_");
	});

	it("creates a draft from the admin entities page and exposes edit/archive actions", async () => {
		const response = await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:create_draft",
				objectTypeCode: "01",
				objectSubtypeCode: "01:01",
				entityKind: "building",
				displayName: "Masjid Admin",
				officialVillageCode: "6201011001",
			},
		});

		expect(response.toast).toEqual({ message: "Draft entitas berhasil dibuat", type: "success" });
		const wizardActions = response.blocks.find((block) => block.type === "actions");
		expect(response.blocks).toEqual(expect.arrayContaining([expect.objectContaining({ type: "header", text: "Masjid Admin" })]));
		expect(wizardActions).toEqual(
			expect.objectContaining({
				elements: expect.arrayContaining([expect.objectContaining({ label: "▶ 6. Review" })]),
			}),
		);
	});

	it("rejects a mismatched module and subtype pair in the create flow", async () => {
		const response = await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:create_draft",
				objectTypeCode: "01",
				objectSubtypeCode: "06:01",
				entityKind: "building",
				displayName: "Masjid Salah Subjenis",
				officialVillageCode: "6201011001",
			},
		});

		expect(response.toast).toEqual({
			message: "Subjenis data tidak cocok dengan modul yang dipilih",
			type: "error",
		});
		expect(response.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "banner", title: "Subjenis Tidak Sesuai" }),
			]),
		);
	});

	it("archives and restores an entity through admin actions", async () => {
		await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:create_draft",
				objectTypeCode: "01",
				objectSubtypeCode: "01:01",
				entityKind: "building",
				displayName: "Masjid Arsip UI",
				officialVillageCode: "6201011001",
			},
		});

		const created = await sql<{ id: string }>`
			SELECT id FROM awcms_sikesra_entities WHERE display_name = 'Masjid Arsip UI' LIMIT 1
		`.execute(db);
		const entityId = created.rows[0]?.id;
		if (!entityId) throw new Error("Expected entity to be created");

		const archived = await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:archive_submit",
				entityId,
				reason: "Arsip dari admin workflow",
				confirmed: "true",
			},
		});
		const restored = await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:restore_submit",
				entityId,
				reason: "Pulih dari admin workflow",
				confirmed: "true",
			},
		});

		expect(archived.toast).toEqual({ message: "Entitas berhasil diarsipkan", type: "success" });
		expect(restored.toast).toEqual({ message: "Entitas berhasil dipulihkan", type: "success" });
	});

	it("shows duplicate warnings in entity detail and validation views", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-a', 'tenant-1', 'site-1', '62010110010101000001', '01', '01', 'building', 'Masjid A', '6201011001', 'local-1', 'Jl. A', 'draft', 'draft', NULL, 'internal', 100, 'candidate', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1'),
			('entity-b', 'tenant-1', 'site-1', '62010110010101000002', '01', '01', 'building', 'Masjid B', '6201011001', 'local-1', 'Jl. B', 'draft', 'draft', NULL, 'internal', 100, 'candidate', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_duplicate_candidates VALUES
			('dup-1', 'tenant-1', 'site-1', 'entity-a', 'entity-b', '["same_name","same_village"]', 0.91, 'high', 'system', NULL, '2026-01-03', '2026-01-03', NULL, 'admin-1', 'admin-1');
		`);

		const detail = await buildAdminPage(db, makeContext(), "/entities", {
			type: "block_action",
			values: { action_id: "entities:view", entityId: "entity-a" },
		});
		const validation = await buildAdminPage(db, makeContext(), "/entities", {
			type: "block_action",
			values: { action_id: "entities:validate", entityId: "entity-a" },
		});

		expect(detail.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "banner", title: "Sinyal Duplikat Terdeteksi" }),
			]),
		);
			expect(validation.blocks).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ type: "banner", title: "Peringatan Duplikat" }),
				]),
			);
		});

	it("shows a document step and registers document metadata for an entity", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-doc', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Dokumen', '6201011001', 'local-1', 'Jl. Dok', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
		`);

		const documentStep = await buildAdminPage(db, makeContext(), "/entities", {
			type: "block_action",
			values: { action_id: "entities:open_documents", entityId: "entity-doc" },
		});
		const registered = await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:document_register",
				entityId: "entity-doc",
				fileName: "ktp.pdf",
				documentType: "ktp",
				classification: "restricted",
				contentBase64: Buffer.from("pdf-data", "utf8").toString("base64"),
			},
		});
		const stored = await sql<{ total: number }>`
			SELECT COUNT(*) as total
			FROM awcms_sikesra_supporting_documents
			WHERE entity_id = 'entity-doc'
		`.execute(db);

		expect(documentStep.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Dokumen Pendukung" }),
				expect.objectContaining({ type: "banner", title: "Workflow Upload Dokumen" }),
				expect.objectContaining({ type: "form" }),
			]),
		);
		const formBlock = documentStep.blocks.find((block) => block.type === "form");
		const formFields = Array.isArray(formBlock?.fields) ? formBlock.fields : [];
		expect(formFields.find((field) => field.action_id === "mimeType")).toBeUndefined();
		expect(formFields.find((field) => field.action_id === "sizeBytes")).toBeUndefined();
		expect(formFields.find((field) => field.action_id === "contentBase64")).toEqual(
			expect.objectContaining({ label: "Konten File Base64 (opsional untuk shell ini)" }),
		);
		expect(registered.toast).toEqual({ message: "Dokumen berhasil dicatat", type: "success" });
		expect(stored.rows[0]?.total).toBe(1);
	});

	it("prepares a guided upload handoff when file content is not provided", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-doc-prep', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Upload', '6201011001', 'local-1', 'Jl. Upload', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
		`);

		const prepared = await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:document_register",
				entityId: "entity-doc-prep",
				fileName: "kk.pdf",
				documentType: "kk",
				classification: "restricted",
			},
		});
		const pendingFiles = await sql<{ total: number; id: string | null }>`
			SELECT COUNT(*) as total, MAX(id) as id
			FROM awcms_sikesra_file_objects
			WHERE tenant_id = 'tenant-1' AND site_id = 'site-1'
		`.execute(db);

		expect(prepared.toast).toEqual({ message: "Handoff upload siap digunakan", type: "info" });
		expect(prepared.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "banner", title: "Handoff Upload API" }),
				expect.objectContaining({ type: "fields" }),
			]),
		);
		const handoffFields = prepared.blocks.find((block) => block.type === "fields");
		expect(handoffFields).toEqual(
			expect.objectContaining({
				fields: expect.arrayContaining([
					expect.objectContaining({ label: "Entity ID", value: "entity-doc-prep" }),
					expect.objectContaining({ label: "File Object ID", value: expect.stringContaining("doc_") }),
					expect.objectContaining({ label: "API Complete Upload", value: expect.stringContaining("/v1/documents/complete") }),
				]),
			}),
		);
		expect(pendingFiles.rows[0]?.total).toBe(1);
		expect(pendingFiles.rows[0]?.id).toContain("doc_");
	});

	it("keeps invalid file-name errors inside the document step", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-doc-invalid', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Invalid', '6201011001', 'local-1', 'Jl. Invalid', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
		`);

		const invalid = await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:document_register",
				entityId: "entity-doc-invalid",
				fileName: "scan.heic",
				documentType: "kk",
				classification: "restricted",
			},
		});

		expect(invalid.toast).toEqual({
			message: "Tipe file belum didukung dari nama file yang diberikan.",
			type: "error",
		});
		expect(invalid.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "banner", title: "Dokumen Tidak Valid" }),
				expect.objectContaining({ type: "header", text: "Dokumen Pendukung" }),
			]),
		);
	});

	it("shows a friendly required-input error for incomplete document handoff forms", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-doc-missing', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Missing', '6201011001', 'local-1', 'Jl. Missing', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
		`);

		const missing = await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:document_register",
				entityId: "entity-doc-missing",
				fileName: "ktp.pdf",
				classification: "restricted",
			},
		});

		expect(missing.toast).toEqual({
			message: "Nama file, jenis dokumen, dan entity ID wajib diisi.",
			type: "error",
		});
		expect(missing.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "banner", title: "Dokumen Tidak Valid" }),
			]),
		);
	});

	it("shows operator-friendly module choices in create flow and registry filters", async () => {
		const createPage = await buildAdminPage(db, makeContext(), "/entities", {
			type: "block_action",
			values: { action_id: "entities:start_create" },
		});
		const registryPage = await buildAdminPage(db, makeContext(), "/entities");

		const createForm = createPage.blocks.find((block) => block.type === "form");
		const createFields = Array.isArray(createForm?.fields) ? createForm.fields : [];
		const registryForm = registryPage.blocks.find((block) => block.type === "form");
		const registryFields = Array.isArray(registryForm?.fields) ? registryForm.fields : [];
		const moduleField = createFields.find((field) => field.action_id === "objectTypeCode");
		const registryModuleField = registryFields.find((field) => field.action_id === "objectTypeCode");

		expect(createPage.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Pilihan 8 Modul Data" }),
			]),
		);
		expect(createFields.find((field) => field.action_id === "entityKind")).toBeUndefined();
		expect(moduleField).toEqual(
			expect.objectContaining({
				type: "select",
				label: "Modul Data SIKESRA",
				options: expect.arrayContaining([
					expect.objectContaining({ label: "Rumah Ibadah", value: "01" }),
					expect.objectContaining({ label: "Lembaga Keagamaan", value: "02" }),
					expect.objectContaining({ label: "Pendidikan Keagamaan", value: "03" }),
					expect.objectContaining({ label: "LKS / Lembaga Kesejahteraan Sosial", value: "04" }),
					expect.objectContaining({ label: "Guru Agama", value: "05" }),
					expect.objectContaining({ label: "Anak Yatim", value: "06" }),
					expect.objectContaining({ label: "Disabilitas", value: "07" }),
					expect.objectContaining({ label: "Lansia Terlantar", value: "08" }),
				]),
			}),
		);
		expect(registryModuleField).toEqual(
			expect.objectContaining({
				type: "select",
				label: "Filter Modul Data SIKESRA",
				options: expect.arrayContaining([
					expect.objectContaining({ label: "Rumah Ibadah", value: "01" }),
					expect.objectContaining({ label: "Guru Agama", value: "05" }),
				]),
			}),
		);
	});

	it("renders a clearer registry filter surface with reset action", async () => {
		const registryPage = await buildAdminPage(db, makeContext(), "/entities");
		const filterHelp = registryPage.blocks.find((block) => block.type === "fields" && Array.isArray(block.fields) && block.fields.some((field) => field.label === "Modul Data"));
		const filterForm = registryPage.blocks.find((block) => block.type === "form");
		const filterFields = Array.isArray(filterForm?.fields) ? filterForm.fields : [];
		const resetActions = registryPage.blocks.find((block) => block.type === "actions" && Array.isArray(block.elements) && block.elements.some((element) => element.action_id === "entities:reset_filters"));

		expect(registryPage.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Filter Daftar Data" }),
			]),
		);
		expect(filterHelp).toEqual(
			expect.objectContaining({
				fields: expect.arrayContaining([
					expect.objectContaining({ label: "Modul Data", value: "Pilih 1 dari 8 jenis data SIKESRA" }),
				]),
			}),
		);
		expect(filterFields).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ action_id: "keyword", label: "Kata Kunci Pencarian", description: expect.stringContaining("nama entitas") }),
				expect.objectContaining({ action_id: "objectTypeCode", label: "Filter Modul Data SIKESRA", description: expect.stringContaining("8 jenis data") }),
				expect.objectContaining({ action_id: "statusData", label: "Filter Status Data" }),
				expect.objectContaining({ action_id: "statusVerification", label: "Filter Status Verifikasi" }),
				expect.objectContaining({ action_id: "duplicateStatus", label: "Filter Status Duplikat" }),
				expect.objectContaining({ action_id: "sensitivityLevel", label: "Filter Sensitivitas Data", value: "" }),
			]),
		);
		expect(resetActions).toEqual(
			expect.objectContaining({
				elements: expect.arrayContaining([
					expect.objectContaining({ action_id: "entities:reset_filters", label: "Reset Filter" }),
				]),
			}),
		);
	});

	it("opens the correct entity detail from a Registry row using the real entity ID payload", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-registry-1', 'tenant-1', 'site-1', '62010110010101000999', '01', '01', 'building', 'Masjid Registry', '6201011001', 'local-1', 'Jl. Registry', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_rumah_ibadah_details VALUES
			('detail-registry-1', 'tenant-1', 'site-1', 'entity-registry-1', 'Masjid', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-01', '2026-01-02', NULL, 'admin-1', 'admin-1');
		`);

		const registry = await buildAdminPage(db, makeContext(), "/entities");
		const tableBlock = registry.blocks.find((block) => block.type === "table");
		const rows = Array.isArray(tableBlock?.rows) ? tableBlock.rows : [];
		const targetRow = rows.find((row) => row.displayName === "Masjid Registry");

		expect(targetRow).toEqual(
			expect.objectContaining({
				id: "entity-registry-1",
				sikesraId: "62010110010101000999",
			}),
		);

		const detail = await buildAdminPage(db, makeContext(), "/entities", {
			type: "block_action",
			values: { action_id: "entities:view", id: "entity-registry-1" },
		});

		expect(detail.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Masjid Registry" }),
				expect.objectContaining({ type: "context", text: "ID: 62010110010101000999" }),
			]),
		);
	});

	it("shows a next-page action that preserves registry filters when more than 50 rows exist", async () => {
		for (let index = 0; index < 55; index++) {
			sqlite.exec(`
				INSERT INTO awcms_sikesra_entities VALUES
				('entity-admin-page-${index}', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Admin Page ${index}', '6201011001', 'local-1', 'Jl. Admin ${index}', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-${String((index % 28) + 1).padStart(2, "0")}', NULL, NULL, 'admin-1', 'admin-1');
			`);
		}

		const firstPage = await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: { action_id: "entities:filter", objectTypeCode: "01", statusData: "draft" },
		});
		const nextButtonBlock = firstPage.blocks.find((block) => block.type === "actions" && Array.isArray(block.elements) && block.elements.some((element) => element.action_id === "entities:next_page"));

		expect(nextButtonBlock).toEqual(
			expect.objectContaining({
				elements: expect.arrayContaining([
					expect.objectContaining({
						action_id: "entities:next_page",
						objectTypeCode: "01",
						statusData: "draft",
						cursor: expect.any(String),
					}),
				]),
			}),
		);
	});

	it.each([
		{
			objectTypeCode: "05",
			tableName: "awcms_sikesra_guru_agama_details",
			entityId: "entity-guru",
			displayName: "Ustadz Ahmad",
			detailValues: "'detail-guru', 'tenant-1', 'site-1', 'entity-guru', 'person-05', 'Islam', 'aktif', 'Tahfiz', 'Madrasah A', 20, 'S1', 'Sudah', '2026-01-01', '2026-01-02', NULL, 'admin-1', 'admin-1'",
			expectedLabel: "Status Guru",
		},
		{
			objectTypeCode: "06",
			tableName: "awcms_sikesra_anak_yatim_details",
			entityId: "entity-anak",
			displayName: "Anak Yatim A",
			detailValues: "'detail-anak', 'tenant-1', 'site-1', 'entity-anak', 'person-06', 'yatim', 'aktif', 'SMP', 'SMP 1', 'Pak Wali', 'Paman', 'Jl. Wali', 'Baznas', '2026-01-01', '2026-01-02', NULL, 'admin-1', 'admin-1'",
			expectedLabel: "Kategori Anak",
		},
		{
			objectTypeCode: "07",
			tableName: "awcms_sikesra_disabilitas_details",
			entityId: "entity-disabilitas",
			displayName: "Warga Disabilitas",
			detailValues: "'detail-disabilitas', 'tenant-1', 'site-1', 'entity-disabilitas', 'person-07', 'Sensorik', 'sedang', 1, 'Tongkat', 'Puskesmas', 'Sekolah', 'Pendamping keluarga', 'Baznas', '2026-01-01', '2026-01-02', NULL, 'admin-1', 'admin-1'",
			expectedLabel: "Jenis Disabilitas",
		},
		{
			objectTypeCode: "08",
			tableName: "awcms_sikesra_lansia_terlantar_details",
			entityId: "entity-lansia",
			displayName: "Lansia A",
			detailValues: "'detail-lansia', 'tenant-1', 'site-1', 'entity-lansia', 'person-08', 'terlantar', 'Rumah sederhana', 'sendiri', 'Tidak tetap', 'BPJS', 'Hipertensi', 'Makanan dan obat', '2026-01-01', '2026-01-02', NULL, 'admin-1', 'admin-1'",
			expectedLabel: "Status Keterlantaran",
		},
	])("renders person-profile workflow guidance for module $objectTypeCode", async (scenario) => {
		sqlite.exec(`
			CREATE TABLE awcms_sikesra_guru_agama_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, agama TEXT, status_guru TEXT, bidang_pengajaran TEXT, institusi_pengajaran TEXT, jumlah_murid INTEGER, pendidikan_terakhir TEXT, sertifikasi TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			CREATE TABLE awcms_sikesra_anak_yatim_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, kategori_anak TEXT, status_sekolah TEXT, tingkat_pendidikan TEXT, nama_sekolah TEXT, nama_wali TEXT, hubungan_wali TEXT, alamat_wali TEXT, sumber_bantuan TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			CREATE TABLE awcms_sikesra_disabilitas_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, jenis_disabilitas TEXT, tingkat_keparahan TEXT, alat_bantu_dibutuhkan INTEGER, jenis_alat_bantu TEXT, akses_layanan_kesehatan TEXT, partisipasi_sekolah_kerja TEXT, kebutuhan_pendampingan TEXT, sumber_bantuan TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			CREATE TABLE awcms_sikesra_lansia_terlantar_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, status_keterlantaran TEXT, kondisi_tempat_tinggal TEXT, status_tinggal TEXT, sumber_penghasilan TEXT, akses_jaminan_sosial TEXT, riwayat_penyakit TEXT, kebutuhan_prioritas TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			INSERT INTO awcms_sikesra_object_types VALUES ('05', 'tenant-1', 'site-1', 'Guru Agama', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('06', 'tenant-1', 'site-1', 'Anak Yatim', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('07', 'tenant-1', 'site-1', 'Disabilitas', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('08', 'tenant-1', 'site-1', 'Lansia Terlantar', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '05', 'tenant-1', 'site-1', 'Rumahan', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '06', 'tenant-1', 'site-1', 'Yatim', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '07', 'tenant-1', 'site-1', 'Fisik', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '08', 'tenant-1', 'site-1', 'Terlantar', NULL);
			INSERT INTO awcms_sikesra_entities VALUES
			('${scenario.entityId}', 'tenant-1', 'site-1', NULL, '${scenario.objectTypeCode}', '01', 'person', '${scenario.displayName}', '6201011001', 'local-1', 'Jl. Person', 'draft', 'draft', NULL, 'internal', 50, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO ${scenario.tableName} VALUES (${scenario.detailValues});
		`);

		const detailEdit = await buildAdminPage(db, makeContext(), "/entities", {
			type: "block_action",
			values: { action_id: "entities:edit_details", entityId: scenario.entityId },
		});
		const detailForm = detailEdit.blocks.find((block) => block.type === "form");
		const detailFields = Array.isArray(detailForm?.fields) ? detailForm.fields : [];
		const personProfileModeField = detailFields.find((field) => field.action_id === "person_profile_mode");
		const personProfileFullNameField = detailFields.find((field) => field.action_id === "person_profile_full_name");
		const personProfileField = detailFields.find((field) => field.action_id === "person_profile_id");
		const exampleDomainField = detailFields.find((field) => field.label === scenario.expectedLabel);
		const workflowFields = detailEdit.blocks.find((block) => block.type === "fields" && Array.isArray(block.fields) && block.fields.some((field) => field.label === "Link profil yang sudah ada"));

		expect(detailEdit.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Workflow Profil Orang" }),
				expect.objectContaining({ type: "banner", title: "Status Implementasi Saat Ini" }),
			]),
		);
		expect(personProfileField).toEqual(
			expect.objectContaining({
				label: "Profil Orang",
				description: expect.stringContaining("Wajib diisi."),
			}),
		);
		expect(personProfileModeField).toEqual(
			expect.objectContaining({
				label: "Aksi Profil Orang",
				type: "select",
			}),
		);
		expect(personProfileFullNameField).toEqual(
			expect.objectContaining({
				label: "Nama Lengkap Profil Orang",
			}),
		);
		expect(workflowFields).toEqual(
			expect.objectContaining({
				fields: expect.arrayContaining([
					expect.objectContaining({ label: "Link profil yang sudah ada", value: expect.stringContaining("Profil Orang") }),
					expect.objectContaining({ label: "Buat profil orang dari form ini", value: "Didukung sekarang tanpa perlu mengetik ID teknis manual" }),
					expect.objectContaining({ label: "Cari profil yang sudah ada", value: "Belum tersedia langsung di shell admin ini" }),
				]),
			}),
		);
		expect(exampleDomainField).toBeDefined();
	});

	it.each([
		{
			objectTypeCode: "05",
			entityId: "entity-inline-guru",
			displayName: "Guru Inline",
			detailTable: "awcms_sikesra_guru_agama_details",
			patch: {
				person_profile_mode: "create_inline",
				person_profile_full_name: "Guru Inline",
				agama: "Islam",
				status_guru: "aktif",
				institusi_pengajaran: "Madrasah Inline",
			},
		},
		{
			objectTypeCode: "06",
			entityId: "entity-inline-anak",
			displayName: "Anak Inline",
			detailTable: "awcms_sikesra_anak_yatim_details",
			patch: {
				person_profile_mode: "create_inline",
				person_profile_full_name: "Anak Inline",
				kategori_anak: "yatim",
				hubungan_wali: "Paman",
			},
		},
		{
			objectTypeCode: "07",
			entityId: "entity-inline-disabilitas",
			displayName: "Disabilitas Inline",
			detailTable: "awcms_sikesra_disabilitas_details",
			patch: {
				person_profile_mode: "create_inline",
				person_profile_full_name: "Disabilitas Inline",
				jenis_disabilitas: "Sensorik",
				tingkat_keparahan: "sedang",
			},
		},
		{
			objectTypeCode: "08",
			entityId: "entity-inline-lansia",
			displayName: "Lansia Inline",
			detailTable: "awcms_sikesra_lansia_terlantar_details",
			patch: {
				person_profile_mode: "create_inline",
				person_profile_full_name: "Lansia Inline",
				status_keterlantaran: "terlantar",
				kondisi_tempat_tinggal: "Rumah sederhana",
			},
		},
	])("creates person profiles inline for module $objectTypeCode through the admin detail flow", async (scenario) => {
		sqlite.exec(`
			CREATE TABLE awcms_sikesra_guru_agama_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, agama TEXT, status_guru TEXT, bidang_pengajaran TEXT, institusi_pengajaran TEXT, jumlah_murid INTEGER, pendidikan_terakhir TEXT, sertifikasi TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			CREATE TABLE awcms_sikesra_anak_yatim_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, kategori_anak TEXT, status_sekolah TEXT, tingkat_pendidikan TEXT, nama_sekolah TEXT, nama_wali TEXT, hubungan_wali TEXT, alamat_wali TEXT, sumber_bantuan TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			CREATE TABLE awcms_sikesra_disabilitas_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, jenis_disabilitas TEXT, tingkat_keparahan TEXT, alat_bantu_dibutuhkan INTEGER, jenis_alat_bantu TEXT, akses_layanan_kesehatan TEXT, partisipasi_sekolah_kerja TEXT, kebutuhan_pendampingan TEXT, sumber_bantuan TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			CREATE TABLE awcms_sikesra_lansia_terlantar_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, status_keterlantaran TEXT, kondisi_tempat_tinggal TEXT, status_tinggal TEXT, sumber_penghasilan TEXT, akses_jaminan_sosial TEXT, riwayat_penyakit TEXT, kebutuhan_prioritas TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			INSERT INTO awcms_sikesra_object_types VALUES ('05', 'tenant-1', 'site-1', 'Guru Agama', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('06', 'tenant-1', 'site-1', 'Anak Yatim', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('07', 'tenant-1', 'site-1', 'Disabilitas', NULL);
			INSERT INTO awcms_sikesra_object_types VALUES ('08', 'tenant-1', 'site-1', 'Lansia Terlantar', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '05', 'tenant-1', 'site-1', 'Rumahan', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '06', 'tenant-1', 'site-1', 'Yatim', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '07', 'tenant-1', 'site-1', 'Fisik', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '08', 'tenant-1', 'site-1', 'Terlantar', NULL);
			INSERT INTO awcms_sikesra_entities VALUES
			('${scenario.entityId}', 'tenant-1', 'site-1', NULL, '${scenario.objectTypeCode}', '01', 'person', '${scenario.displayName}', '6201011001', 'local-1', 'Jl. Person', 'draft', 'draft', NULL, 'internal', 0, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
		`);

		const response = await buildAdminPage(db, makeContext(), "/entities", {
			type: "form_submit",
			values: {
				action_id: "entities:update_section",
				entityId: scenario.entityId,
				section: "details",
				...scenario.patch,
			},
		});

		const linkedProfile = await sql<{ person_profile_id: string }>`
			SELECT person_profile_id
			FROM ${sql.ref(scenario.detailTable)}
			WHERE entity_id = ${scenario.entityId}
			LIMIT 1
		`.execute(db);
		const personProfileId = linkedProfile.rows[0]?.person_profile_id;
		const createdProfile = await sql<{ id: string; full_name: string }>`
			SELECT id, full_name
			FROM awcms_sikesra_person_profiles
			WHERE id = ${personProfileId ?? ""}
			LIMIT 1
		`.execute(db);

		expect(response.toast).toEqual({ message: "Draft berhasil diperbarui", type: "success" });
		expect(personProfileId).toContain("person_");
		expect(createdProfile.rows[0]).toEqual(
			expect.objectContaining({ id: personProfileId, full_name: scenario.displayName }),
		);
	});

	it("shows wizard step navigation and review summary for an entity", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-review', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Review', '6201011001', 'local-1', 'Jl. Review', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_rumah_ibadah_details VALUES
			('detail-review', 'tenant-1', 'site-1', 'entity-review', 'Masjid', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-01', '2026-01-02', NULL, 'admin-1', 'admin-1');
		`);

		const detail = await buildAdminPage(db, makeContext(), "/entities", {
			type: "block_action",
			values: { action_id: "entities:view", entityId: "entity-review" },
		});
		const review = await buildAdminPage(db, makeContext(), "/entities", {
			type: "block_action",
			values: { action_id: "entities:open_review", entityId: "entity-review" },
		});

		const detailWizard = detail.blocks.find((block) => block.type === "actions");
		expect(detail.blocks).toEqual(expect.arrayContaining([expect.objectContaining({ type: "header", text: "Progress Wizard" })]));
		expect(detailWizard).toEqual(
			expect.objectContaining({
				elements: expect.arrayContaining([expect.objectContaining({ label: "▶ 6. Review" })]),
			}),
		);
		expect(review.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Review dan Submit" }),
				expect.objectContaining({ type: "banner" }),
				expect.objectContaining({ type: "stats" }),
			]),
		);
	});

	it("opens the correct verification review using the real entity ID payload", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-verify-1', 'tenant-1', 'site-1', '62010110010101009999', '01', '01', 'building', 'Masjid Verifikasi', '6201011001', 'local-1', 'Jl. Verify', 'draft', 'submitted_village', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
		`);

		const queue = await buildAdminPage(db, makeContext(), "/verification");
		const queueTable = queue.blocks.find((block) => block.type === "table");
		const rows = Array.isArray(queueTable?.rows) ? queueTable.rows : [];
		const targetRow = rows.find((row) => row.displayName === "Masjid Verifikasi");

		expect(targetRow).toEqual(
			expect.objectContaining({
				entityId: "entity-verify-1",
				id: "62010110010101009999",
			}),
		);

		const review = await buildAdminPage(db, makeContext(), "/verification", {
			type: "block_action",
			values: { action_id: "verification:review", entityId: "entity-verify-1" },
		});

		expect(review.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Review: Masjid Verifikasi" }),
				expect.objectContaining({ type: "context", text: "ID: 62010110010101009999" }),
			]),
		);
	});

	it.each([
		{ decision: "verify", expectedStatus: "verified", expectedToast: "Verifikasi berhasil disimpan" },
		{ decision: "need_revision", expectedStatus: "needs_revision", expectedToast: "Permintaan revisi berhasil disimpan" },
		{ decision: "reject", expectedStatus: "rejected", expectedToast: "Penolakan berhasil disimpan" },
	])("submits verification decision '$decision' through the admin handler", async ({ decision, expectedStatus, expectedToast }) => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-decision', 'tenant-1', 'site-1', '62010110010101007777', '01', '01', 'building', 'Masjid Keputusan', '6201011001', 'local-1', 'Jl. Keputusan', 'draft', 'pending_verification', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
		`);

		const response = await buildAdminPage(db, makeContext(), "/verification", {
			type: "form_submit",
			values: {
				action_id: "verification:submit_decision",
				entityId: "entity-decision",
				decision,
				note: "Catatan verifikasi",
			},
		});
		const entityRow = await sql<{ status_verification: string }>`
			SELECT status_verification
			FROM awcms_sikesra_entities
			WHERE id = 'entity-decision'
			LIMIT 1
		`.execute(db);

		expect(response.toast).toEqual({ message: expectedToast, type: "success" });
		expect(entityRow.rows[0]?.status_verification).toBe(expectedStatus);
	});

	it("returns to the verification queue from the review screen", async () => {
		const queue = await buildAdminPage(db, makeContext(), "/verification", {
			type: "block_action",
			values: { action_id: "verification:back_to_queue" },
		});

		expect(queue.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Antrian Verifikasi" }),
			]),
		);
	});

	it("blocks submit form when high-risk duplicate readiness fails even after validation passes", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-submit-blocked', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Blok Submit', '6201011001', 'local-1', 'Jl. Blok', 'draft', 'draft', NULL, 'internal', 100, 'candidate', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_rumah_ibadah_details VALUES
			('detail-submit-blocked', 'tenant-1', 'site-1', 'entity-submit-blocked', 'Masjid', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-01', '2026-01-02', NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-other', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Lain', '6201011001', 'local-1', 'Jl. Lain', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_duplicate_candidates VALUES
			('dup-submit-1', 'tenant-1', 'site-1', 'entity-submit-blocked', 'entity-other', '["same_name"]', 0.95, 'high', 'system', NULL, '2026-01-03', '2026-01-03', NULL, 'admin-1', 'admin-1');
		`);

		const submitView = await buildAdminPage(db, makeContext(), "/entities", {
			type: "block_action",
			values: { action_id: "entities:open_submit", entityId: "entity-submit-blocked" },
		});

		expect(submitView.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Ajukan Verifikasi" }),
				expect.objectContaining({ type: "banner", title: "Belum Bisa Diajukan" }),
			]),
		);
	});

	it("renders dedicated operations subpages for documents, imports, and reports", async () => {
		sqlite.exec(`
			CREATE TABLE awcms_sikesra_import_batches (id TEXT, tenant_id TEXT, site_id TEXT, r2_key TEXT, original_filename TEXT, sheet_name TEXT, row_count INTEGER, valid_row_count INTEGER, invalid_row_count INTEGER, promoted_row_count INTEGER, status TEXT, object_type_code TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			CREATE TABLE awcms_sikesra_export_jobs (id TEXT, tenant_id TEXT, site_id TEXT, report_type TEXT, filters_json TEXT, fields_json TEXT, field_sensitivity_json TEXT, format TEXT, reason TEXT, total_rows INTEGER, r2_key TEXT, status TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		`);
		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-docops', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Operasi', '6201011001', 'local-1', 'Jl. Operasi', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_file_objects VALUES
			('file-ops-1', 'tenant-1', 'site-1', 'r2/doc-1', 'ktp.pdf', 'ktp.pdf', 'application/pdf', 1024, NULL, 'restricted', 'ktp', 0, NULL, NULL, NULL, '2026-01-01', '2026-01-02', NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_supporting_documents VALUES
			('doc-ops-1', 'tenant-1', 'site-1', 'entity-docops', 'file-ops-1', 'ktp', 'restricted', 1, NULL, '2026-01-02', '2026-01-02', NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_import_batches VALUES
			('batch-ops-1', 'tenant-1', 'site-1', 'r2/import-1', 'import.csv', 'Sheet1', 10, 8, 2, 0, 'validated', '01', '2026-01-02', '2026-01-02', NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_export_jobs VALUES
			('job-ops-1', 'tenant-1', 'site-1', 'entity_summary', '{}', '[]', '[]', 'csv', NULL, 50, NULL, 'ready', '2026-01-02', '2026-01-02', NULL, 'admin-1', 'admin-1');
		`);

		const documents = await buildAdminPage(db, makeContext(), "/operations/documents");
		const imports = await buildAdminPage(db, makeContext(), "/operations/imports");
		const reports = await buildAdminPage(db, makeContext(), "/operations/reports");

		expect(documents.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Kelola Dokumen" }),
				expect.objectContaining({ type: "stats" }),
				expect.objectContaining({ type: "table" }),
			]),
		);
		expect(imports.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Import Excel" }),
				expect.objectContaining({ type: "stats" }),
				expect.objectContaining({ type: "table" }),
			]),
		);
		expect(reports.blocks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "header", text: "Laporan & Export SIKESRA" }),
				expect.objectContaining({ type: "form" }),
				expect.objectContaining({ type: "table" }),
			]),
		);
	});
});
