/**
 * #328: Production database migration check for all SIKESRA input tables.
 *
 * Verifies that all 10 required SIKESRA tables exist with expected key columns
 * after running migrations. Uses in-memory SQLite to simulate D1 schema.
 */
import { readFileSync } from "node:fs";

import Database from "better-sqlite3";
import { Kysely, SqliteDialect, sql } from "kysely";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let sqlite: Database.Database;
let db: Kysely<unknown>;

const REQUIRED_TABLES = [
	"awcms_sikesra_entities",
	"awcms_sikesra_person_profiles",
	"awcms_sikesra_rumah_ibadah_details",
	"awcms_sikesra_lembaga_keagamaan_details",
	"awcms_sikesra_pendidikan_keagamaan_details",
	"awcms_sikesra_lks_details",
	"awcms_sikesra_guru_agama_details",
	"awcms_sikesra_anak_yatim_details",
	"awcms_sikesra_disabilitas_details",
	"awcms_sikesra_lansia_terlantar_details",
] as const;

const REQUIRED_COLUMNS: Record<string, string[]> = {
	awcms_sikesra_entities: [
		"id",
		"tenant_id",
		"site_id",
		"object_type_code",
		"object_subtype_code",
		"entity_kind",
		"display_name",
		"official_village_code",
		"status_data",
		"status_verification",
		"sensitivity_level",
		"completeness_percent",
	],
	awcms_sikesra_person_profiles: ["id", "tenant_id", "site_id", "full_name", "sensitivity_level"],
	awcms_sikesra_rumah_ibadah_details: ["id", "entity_id", "jenis_rumah_ibadah"],
	awcms_sikesra_lembaga_keagamaan_details: ["id", "entity_id", "agama"],
	awcms_sikesra_pendidikan_keagamaan_details: ["id", "entity_id", "jenis_pendidikan"],
	awcms_sikesra_lks_details: ["id", "entity_id", "jenis_lks"],
	awcms_sikesra_guru_agama_details: ["id", "entity_id", "person_profile_id", "agama", "status_guru"],
	awcms_sikesra_anak_yatim_details: ["id", "entity_id", "person_profile_id", "kategori_anak"],
	awcms_sikesra_disabilitas_details: ["id", "entity_id", "person_profile_id", "jenis_disabilitas"],
	awcms_sikesra_lansia_terlantar_details: ["id", "entity_id", "person_profile_id", "status_keterlantaran"],
};

function loadMigrationSql(filename: string): string {
	const migrationPath = new URL(`../migrations/${filename}`, import.meta.url);
	return readFileSync(migrationPath, "utf8");
}

beforeEach(() => {
	sqlite = new Database(":memory:");
	db = new Kysely({ dialect: new SqliteDialect({ database: sqlite }) });

	// Apply migrations 0001-0004 which create the required tables
	const migrations = [
		"0001_sikesra_settings_and_master.sql",
		"0002_sikesra_regions.sql",
		"0003_sikesra_entities_core.sql",
		"0004_sikesra_detail_modules.sql",
	];

	for (const migration of migrations) {
		const migrationSql = loadMigrationSql(migration);
		// Strip BEGIN/COMMIT for SQLite in-memory execution
		const cleaned = migrationSql
			.replace(/^\s*BEGIN;\s*$/gm, "")
			.replace(/^\s*COMMIT;\s*$/gm, "");
		sqlite.exec(cleaned);
	}
});

afterEach(async () => {
	await db.destroy();
	sqlite.close();
});

describe("SIKESRA production migration check (#328)", () => {
	it("all 10 required input tables exist after migrations 0001-0004", () => {
		const existingTables = sqlite
			.prepare(
				`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'awcms_sikesra_%' ORDER BY name`,
			)
			.all() as { name: string }[];

		const tableNames = existingTables.map((row) => row.name);

		for (const required of REQUIRED_TABLES) {
			expect(tableNames, `Missing required table: ${required}`).toContain(required);
		}
	});

	it.each(REQUIRED_TABLES)("table %s has all required key columns", (tableName) => {
		const columns = sqlite
			.prepare(`PRAGMA table_info('${tableName}')`)
			.all() as { name: string }[];

		const columnNames = columns.map((col) => col.name);
		const requiredCols = REQUIRED_COLUMNS[tableName] ?? [];

		for (const col of requiredCols) {
			expect(columnNames, `Table ${tableName} missing column: ${col}`).toContain(col);
		}
	});

	it("entities table has correct CHECK constraints for status_data", async () => {
		// Seed FK dependency
		sqlite.exec(
			`INSERT INTO awcms_sikesra_official_regions (code, tenant_id, site_id, name, level) VALUES ('6201', 't', 's', 'Test', 'village')`,
		);

		// Valid insert should succeed
		await expect(
			sql`INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, status_data, status_verification, sensitivity_level, completeness_percent, source_input) VALUES ('test-1', 't', 's', '01', '01', 'building', 'Test', '6201', 'draft', 'pending', 'internal', 0, 'manual')`.execute(
				db,
			),
		).resolves.toBeDefined();

		// Invalid status_data should fail
		await expect(
			sql`INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, status_data, status_verification, sensitivity_level, completeness_percent, source_input) VALUES ('test-2', 't', 's', '01', '01', 'building', 'Test', '6201', 'INVALID', 'pending', 'internal', 0, 'manual')`.execute(
				db,
			),
		).rejects.toThrow();
	});

	it("migration files all have BEGIN/COMMIT wrapping", () => {
		const migrationFiles = [
			"0001_sikesra_settings_and_master.sql",
			"0002_sikesra_regions.sql",
			"0003_sikesra_entities_core.sql",
			"0004_sikesra_detail_modules.sql",
		];

		for (const file of migrationFiles) {
			const content = loadMigrationSql(file);
			expect(content, `${file} missing BEGIN`).toContain("BEGIN;");
			expect(content, `${file} missing COMMIT`).toContain("COMMIT;");
		}
	});

	it("detail tables have entity_id foreign key column", () => {
		const detailTables = REQUIRED_TABLES.filter((name) => name.endsWith("_details"));

		for (const table of detailTables) {
			const columns = sqlite.prepare(`PRAGMA table_info('${table}')`).all() as { name: string }[];
			const columnNames = columns.map((col) => col.name);
			expect(columnNames, `${table} missing entity_id`).toContain("entity_id");
		}
	});

	it("person-linked detail tables have person_profile_id column", () => {
		const personTables = [
			"awcms_sikesra_guru_agama_details",
			"awcms_sikesra_anak_yatim_details",
			"awcms_sikesra_disabilitas_details",
			"awcms_sikesra_lansia_terlantar_details",
		];

		for (const table of personTables) {
			const columns = sqlite.prepare(`PRAGMA table_info('${table}')`).all() as { name: string }[];
			const columnNames = columns.map((col) => col.name);
			expect(columnNames, `${table} missing person_profile_id`).toContain("person_profile_id");
		}
	});
});
