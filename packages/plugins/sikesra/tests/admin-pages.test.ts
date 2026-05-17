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
		CREATE TABLE awcms_sikesra_person_profiles (id TEXT);
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
				label: "Modul Data",
				options: expect.arrayContaining([
					expect.objectContaining({ label: "Rumah Ibadah", value: "01" }),
					expect.objectContaining({ label: "Guru Agama", value: "05" }),
				]),
			}),
		);
	});

	it("renders readable module detail labels including person profile context", async () => {
		sqlite.exec(`
			CREATE TABLE awcms_sikesra_guru_agama_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, person_profile_id TEXT, agama TEXT, status_guru TEXT, bidang_pengajaran TEXT, institusi_pengajaran TEXT, jumlah_murid INTEGER, pendidikan_terakhir TEXT, sertifikasi TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
			INSERT INTO awcms_sikesra_object_types VALUES ('05', 'tenant-1', 'site-1', 'Guru Agama', NULL);
			INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '05', 'tenant-1', 'site-1', 'Rumahan', NULL);
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-guru', 'tenant-1', 'site-1', NULL, '05', '01', 'person', 'Ustadz Ahmad', '6201011001', 'local-1', 'Jl. Guru', 'draft', 'draft', NULL, 'internal', 50, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_guru_agama_details VALUES
			('detail-guru', 'tenant-1', 'site-1', 'entity-guru', 'person-05', 'Islam', 'aktif', 'Tahfiz', 'Madrasah A', 20, 'S1', 'Sudah', '2026-01-01', '2026-01-02', NULL, 'admin-1', 'admin-1');
		`);

		const detailEdit = await buildAdminPage(db, makeContext(), "/entities", {
			type: "block_action",
			values: { action_id: "entities:edit_details", entityId: "entity-guru" },
		});
		const detailForm = detailEdit.blocks.find((block) => block.type === "form");
		const detailFields = Array.isArray(detailForm?.fields) ? detailForm.fields : [];
		const personProfileField = detailFields.find((field) => field.action_id === "person_profile_id");
		const statusGuruField = detailFields.find((field) => field.action_id === "status_guru");

		expect(personProfileField).toEqual(
			expect.objectContaining({
				label: "Person Profile",
				description: expect.stringContaining("Wajib diisi."),
			}),
		);
		expect(statusGuruField).toEqual(
			expect.objectContaining({
				type: "select",
				label: "Status Guru",
			}),
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
