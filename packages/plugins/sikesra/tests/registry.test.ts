import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Kysely, SqliteDialect } from "kysely";

import {
	getEntityDetail,
	listEntities,
	type EntityDetailResponse,
} from "../src/services/entities.js";
import {
	listLocalRegions,
	listOfficialRegions,
} from "../src/services/regions.js";
import { buildTrustedRequestContext } from "../src/security/request-context.js";
import { SIKESRA_PERMISSION_LIST } from "../src/security/permissions.js";

let sqlite: Database.Database;
let db: Kysely<unknown>;

function makeContext(overrides: Partial<Parameters<typeof buildTrustedRequestContext>[0]> = {}) {
	return buildTrustedRequestContext({
		requestId: "req-registry",
		tenantId: "tenant-1",
		siteId: "site-1",
		userId: "admin-1",
		roles: ["admin"],
		permissions: [...SIKESRA_PERMISSION_LIST],
		regionScope: {},
		...overrides,
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
			religion_attribute TEXT,
			neglected_attribute TEXT,
			desil_attribute TEXT
		);
		CREATE TABLE awcms_sikesra_rumah_ibadah_details (
			entity_id TEXT,
			tenant_id TEXT,
			site_id TEXT,
			jenis_rumah_ibadah TEXT,
			created_by TEXT,
			updated_by TEXT,
			deleted_at TEXT
		);
	`);

	sqlite.exec(`
		INSERT INTO awcms_sikesra_official_regions VALUES
		('6201', 'tenant-1', 'site-1', 'Kabupaten A', 'regency', NULL, NULL),
		('620101', 'tenant-1', 'site-1', 'Kecamatan A', 'district', '6201', NULL),
		('6201011001', 'tenant-1', 'site-1', 'Desa Aman', 'village', '620101', NULL),
		('6201011002', 'tenant-1', 'site-1', 'Desa Rahasia', 'village', '620101', NULL);
		INSERT INTO awcms_sikesra_local_regions VALUES
		('local-1', 'tenant-1', 'site-1', '6201011001', NULL, 'rw', '01', 'RW 01', NULL);
		INSERT INTO awcms_sikesra_object_types VALUES
		('01', 'tenant-1', 'site-1', 'Rumah Ibadah', NULL);
		INSERT INTO awcms_sikesra_object_subtypes VALUES
		('01', '01', 'tenant-1', 'site-1', 'Masjid', NULL);
		INSERT INTO awcms_sikesra_entities VALUES
		('entity-1', 'tenant-1', 'site-1', '62010110010101000001', '01', '01', 'building', 'Masjid Raya', '6201011001', 'local-1', 'Jl. Aman', 'active', 'verified', 'regency', 'public_safe', 100, 'none', 'manual', '2026-01-01', '2026-01-02', '2026-01-03', NULL, 'Islam', NULL, NULL),
		('entity-2', 'tenant-1', 'site-1', '62010110020101000002', '01', '01', 'person', 'Ahmad Rahasia', '6201011002', NULL, 'Jl. Rahasia', 'active', 'verified', 'regency', 'restricted', 80, 'candidate', 'manual', '2026-01-01', '2026-01-02', '2026-01-03', NULL, 'Islam', NULL, NULL);
		INSERT INTO awcms_sikesra_rumah_ibadah_details VALUES
		('entity-1', 'tenant-1', 'site-1', 'Masjid', 'creator', 'updater', NULL);
	`);
});

afterEach(async () => {
	await db.destroy();
	sqlite.close();
});

describe("SIKESRA region and registry services", () => {
	it("lists official regions with level filters", async () => {
		const items = await listOfficialRegions(db, makeContext(), { level: "village" });
		expect(items).toHaveLength(2);
		expect(items[0]?.level).toBe("village");
	});

	it("lists local regions constrained by village scope", async () => {
		const items = await listLocalRegions(
			db,
			makeContext({ regionScope: { villageCodes: ["6201011001"] } }),
			{},
		);
		expect(items).toHaveLength(1);
		expect(items[0]?.officialVillageCode).toBe("6201011001");
	});

	it("lists entities and masks protected person names without reveal permission", async () => {
		const reader = makeContext({ permissions: ["awcms:sikesra:entity:read"] });
		const listed = await listEntities(db, reader, {});
		expect(listed.items).toHaveLength(2);
		const protectedEntity = listed.items.find((item) => item.id === "entity-2");
		expect(protectedEntity?.displayName).not.toBe("Ahmad Rahasia");
		expect(protectedEntity?.masked).toBe(true);
	});

	it("filters entities by region scope", async () => {
		const result = await listEntities(
			db,
			makeContext({
				permissions: ["awcms:sikesra:entity:read"],
				regionScope: { villageCodes: ["6201011001"] },
			}),
			{},
		);
		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.id).toBe("entity-1");
	});

	it("returns entity detail with access flags and safe summary", async () => {
		const detail = (await getEntityDetail(
			db,
			makeContext({
				permissions: [
					"awcms:sikesra:entity:read",
					"awcms:sikesra:entity:update",
					"awcms:sikesra:verification:submit",
					"awcms:sikesra:code:generate",
				],
			}),
			"entity-1",
		)) as EntityDetailResponse;

		expect(detail.entity.id).toBe("entity-1");
		expect(detail.access.canEdit).toBe(true);
		expect(detail.access.canVerify).toBe(false);
		expect(detail.summary.addressText).toBeNull();
		expect(detail.details).toEqual(expect.objectContaining({ jenis_rumah_ibadah: "Masjid" }));
	});

	it("excludes out-of-scope entities from the registry list", async () => {
		const result = await listEntities(
			db,
			makeContext({
				permissions: ["awcms:sikesra:entity:read"],
				regionScope: { villageCodes: ["6201011001"] },
			}),
			{ officialVillageCode: "6201011002" },
		);
		expect(result.items).toHaveLength(0);
	});
});
