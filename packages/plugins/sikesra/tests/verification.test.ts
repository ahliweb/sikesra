import Database from "better-sqlite3";
import { Kysely, SqliteDialect, sql } from "kysely";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildTrustedRequestContext } from "../src/security/request-context.js";
import { SIKESRA_PERMISSION_LIST } from "../src/security/permissions.js";
import { createDraft } from "../src/services/draft.js";
import { submitForVerification } from "../src/services/verification.js";

let sqlite: Database.Database;
let db: Kysely<unknown>;

function makeContext() {
	return buildTrustedRequestContext({
		requestId: "req-verification",
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
		CREATE TABLE awcms_sikesra_rumah_ibadah_details (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, jenis_rumah_ibadah TEXT, status_pembangunan TEXT, luas_bangunan REAL, luas_tanah REAL, kapasitas_jamaah INTEGER, tahun_didirikan INTEGER, imam_nama TEXT, pengurus_nama TEXT, kegiatan_rutin TEXT, sumber_dana TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_duplicate_candidates (id TEXT, tenant_id TEXT, site_id TEXT, entity_id_a TEXT, entity_id_b TEXT, match_signals_json TEXT, match_score REAL, risk_level TEXT, detection_source TEXT, import_batch_id TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, created_by TEXT, updated_by TEXT);
		CREATE TABLE awcms_sikesra_verification_events (id TEXT, tenant_id TEXT, site_id TEXT, entity_id TEXT, actor_id TEXT, actor_role TEXT, verification_level TEXT, action TEXT, previous_status TEXT, next_status TEXT, note TEXT, request_id TEXT, ip_address TEXT, created_at TEXT);
		CREATE TABLE awcms_sikesra_audit_logs (id TEXT, tenant_id TEXT, site_id TEXT, actor_id TEXT, actor_role TEXT, action TEXT, resource_type TEXT, resource_id TEXT, request_id TEXT, success INTEGER, reason TEXT, before_json TEXT, after_json TEXT, ip_address TEXT, user_agent TEXT, created_at TEXT);
	`);

	sqlite.exec(`
		INSERT INTO awcms_sikesra_official_regions VALUES ('6201011001', 'tenant-1', 'site-1', 'Desa Aman', 'village', '620101', NULL);
		INSERT INTO awcms_sikesra_object_types VALUES ('01', 'tenant-1', 'site-1', 'Rumah Ibadah', NULL);
		INSERT INTO awcms_sikesra_object_subtypes VALUES ('01', '01', 'tenant-1', 'site-1', 'Masjid', NULL);
	`);
});

afterEach(async () => {
	await db.destroy();
	sqlite.close();
});

describe("SIKESRA verification submit gating", () => {
	it("allows valid submit when validation passes and no high-risk duplicates exist", async () => {
		const ctx = makeContext();
		const created = await createDraft(db, ctx, {
			objectTypeCode: "01",
			objectSubtypeCode: "01",
			entityKind: "building",
			displayName: "Masjid Valid",
			officialVillageCode: "6201011001",
			initialData: { jenis_rumah_ibadah: "Masjid" },
		});

		const submitted = await submitForVerification(db, ctx, { entityId: created.entityId });
		const entityRow = await sql<{ status_verification: string }>`
			SELECT status_verification FROM awcms_sikesra_entities WHERE id = ${created.entityId} LIMIT 1
		`.execute(db);

		expect(submitted.nextStatus).toBe("pending_verification");
		expect(entityRow.rows[0]?.status_verification).toBe("pending_verification");
	});

	it("blocks submit when required validation is still failing", async () => {
		const ctx = makeContext();
		const created = await createDraft(db, ctx, {
			objectTypeCode: "01",
			objectSubtypeCode: "01",
			entityKind: "building",
			displayName: "Masjid Belum Lengkap",
			officialVillageCode: "6201011001",
		});

		await expect(submitForVerification(db, ctx, { entityId: created.entityId })).rejects.toThrow(
			"Submit diblokir karena masih ada field wajib yang belum lengkap",
		);

		const auditRows = await sql<{ action: string; success: number; reason: string | null }>`
			SELECT action, success, reason
			FROM awcms_sikesra_audit_logs
			WHERE resource_id = ${created.entityId}
				AND action = 'security.access_denied'
			ORDER BY created_at DESC
			LIMIT 1
		`.execute(db);

		expect(auditRows.rows[0]).toEqual(
			expect.objectContaining({
				action: "security.access_denied",
				success: 0,
				reason: "Submit diblokir karena masih ada field wajib yang belum lengkap",
			}),
		);
	});

	it("blocks submit when high-risk duplicate candidates remain", async () => {
		const ctx = makeContext();
		const created = await createDraft(db, ctx, {
			objectTypeCode: "01",
			objectSubtypeCode: "01",
			entityKind: "building",
			displayName: "Masjid Duplikat",
			officialVillageCode: "6201011001",
			initialData: { jenis_rumah_ibadah: "Masjid" },
		});

		sqlite.exec(`
			INSERT INTO awcms_sikesra_entities VALUES
			('entity-other', 'tenant-1', 'site-1', NULL, '01', '01', 'building', 'Masjid Pembanding', '6201011001', NULL, 'Jl. Pembanding', 'draft', 'draft', NULL, 'internal', 100, 'none', 'manual', '2026-01-01', '2026-01-02', NULL, NULL, 'admin-1', 'admin-1');
			INSERT INTO awcms_sikesra_duplicate_candidates VALUES
			('dup-high-1', 'tenant-1', 'site-1', '${created.entityId}', 'entity-other', '["same_name"]', 0.98, 'high', 'system', NULL, '2026-01-03', '2026-01-03', NULL, 'admin-1', 'admin-1');
		`);

		await expect(submitForVerification(db, ctx, { entityId: created.entityId })).rejects.toThrow(
			"Submit diblokir karena ada kandidat duplikat berisiko tinggi yang harus ditinjau",
		);

		const auditRows = await sql<{ action: string; success: number; reason: string | null }>`
			SELECT action, success, reason
			FROM awcms_sikesra_audit_logs
			WHERE resource_id = ${created.entityId}
				AND action = 'security.access_denied'
			ORDER BY created_at DESC
			LIMIT 1
		`.execute(db);

		expect(auditRows.rows[0]).toEqual(
			expect.objectContaining({
				action: "security.access_denied",
				success: 0,
				reason: "Submit diblokir karena ada kandidat duplikat berisiko tinggi yang harus ditinjau",
			}),
		);
	});
});
