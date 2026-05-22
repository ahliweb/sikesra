import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildTrustedRequestContext } from "../src/security/request-context.js";
import { getSettings, updateSettings } from "../src/services/settings.js";

let sqlite: Database.Database;
let db: Kysely<unknown>;

function makeContext(permissions: string[]) {
	return buildTrustedRequestContext({
		requestId: "req-settings",
		tenantId: "00000000-0000-0000-0000-000000000001",
		siteId: "main",
		userId: "admin-1",
		roles: ["admin"],
		permissions,
		regionScope: {},
	});
}

beforeEach(() => {
	sqlite = new Database(":memory:");
	db = new Kysely({ dialect: new SqliteDialect({ database: sqlite }) });

	sqlite.exec(`
		CREATE TABLE awcms_sikesra_settings (
			id TEXT PRIMARY KEY,
			tenant_id TEXT NOT NULL,
			site_id TEXT NOT NULL,
			public_enabled INTEGER NOT NULL DEFAULT 0,
			public_title TEXT NOT NULL DEFAULT 'SIKESRA',
			public_description TEXT,
			data_scope_note TEXT,
			official_contact TEXT,
			small_cell_threshold INTEGER NOT NULL DEFAULT 5,
			max_upload_bytes INTEGER NOT NULL DEFAULT 10485760,
			allowed_mime_types_json TEXT,
			export_max_sync_rows INTEGER NOT NULL DEFAULT 5000,
			require_reason_for_highly_restricted_download INTEGER NOT NULL DEFAULT 1,
			feature_flags_json TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT,
			UNIQUE(tenant_id, site_id)
		);
		CREATE TABLE awcms_sikesra_audit_logs (
			id TEXT PRIMARY KEY,
			tenant_id TEXT NOT NULL,
			site_id TEXT NOT NULL,
			actor_id TEXT,
			actor_role TEXT,
			action TEXT NOT NULL,
			resource_type TEXT,
			resource_id TEXT,
			request_id TEXT,
			success INTEGER NOT NULL DEFAULT 1,
			reason TEXT,
			before_json TEXT,
			after_json TEXT,
			ip_address TEXT,
			user_agent TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT,
			deleted_at TEXT,
			created_by TEXT,
			updated_by TEXT
		);
	`);
});

afterEach(async () => {
	await db.destroy();
	sqlite.close();
});

describe("SIKESRA settings compatibility", () => {
	it("prefers canonical settings when canonical and legacy rows both exist", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_settings (id, tenant_id, site_id, public_title, small_cell_threshold, updated_at)
			VALUES ('legacy-settings', 'default', 'default', 'Legacy Title', 3, '2026-01-01');
			INSERT INTO awcms_sikesra_settings (id, tenant_id, site_id, public_title, small_cell_threshold, updated_at)
			VALUES ('canonical-settings', '00000000-0000-0000-0000-000000000001', 'main', 'Canonical Title', 9, '2026-01-02');
		`);

		const settings = await getSettings(db, makeContext(["awcms:sikesra:settings:read"]));

		expect(settings.publicTitle).toBe("Canonical Title");
		expect(settings.smallCellThreshold).toBe(9);
	});

	it("upserts canonical settings from a legacy-only row before updating", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_settings (id, tenant_id, site_id, public_title, official_contact, small_cell_threshold, updated_at)
			VALUES ('legacy-settings', 'default', 'default', 'Legacy Title', 'legacy@example.test', 3, '2026-01-01');
		`);

		const updated = await updateSettings(
			db,
			makeContext(["awcms:sikesra:settings:read", "awcms:sikesra:settings:update"]),
			{ publicTitle: "Updated Canonical Title", smallCellThreshold: 7 },
			"normalize settings",
		);

		const canonicalRow = sqlite
			.prepare(
				"SELECT public_title, small_cell_threshold FROM awcms_sikesra_settings WHERE tenant_id = ? AND site_id = ?",
			)
			.get("00000000-0000-0000-0000-000000000001", "main") as
			| { public_title: string; small_cell_threshold: number }
			| undefined;

		expect(updated.publicTitle).toBe("Updated Canonical Title");
		expect(updated.smallCellThreshold).toBe(7);
		expect(canonicalRow).toEqual({
			public_title: "Updated Canonical Title",
			small_cell_threshold: 7,
		});
	});

	it("revives a soft-deleted canonical row before applying updates", async () => {
		sqlite.exec(`
			INSERT INTO awcms_sikesra_settings (id, tenant_id, site_id, public_title, official_contact, small_cell_threshold, deleted_at, updated_at)
			VALUES ('canonical-settings', '00000000-0000-0000-0000-000000000001', 'main', 'Deleted Canonical', 'stale@example.test', 4, '2026-01-01', '2026-01-01');
			INSERT INTO awcms_sikesra_settings (id, tenant_id, site_id, public_title, official_contact, small_cell_threshold, updated_at)
			VALUES ('legacy-settings', 'default', 'default', 'Legacy Title', 'legacy@example.test', 3, '2026-01-01');
		`);

		const updated = await updateSettings(
			db,
			makeContext(["awcms:sikesra:settings:read", "awcms:sikesra:settings:update"]),
			{ publicTitle: "Revived Canonical Title" },
			"revive settings",
		);

		const canonicalRow = sqlite
			.prepare(
				"SELECT public_title, official_contact, deleted_at FROM awcms_sikesra_settings WHERE tenant_id = ? AND site_id = ?",
			)
			.get("00000000-0000-0000-0000-000000000001", "main") as
			| { public_title: string; official_contact: string; deleted_at: string | null }
			| undefined;

		expect(updated.publicTitle).toBe("Revived Canonical Title");
		expect(canonicalRow).toEqual({
			public_title: "Revived Canonical Title",
			official_contact: "legacy@example.test",
			deleted_at: null,
		});
	});
});
