import { sql } from "kysely";

import {
	buildPublicFilters,
	buildPublicMetadata,
	buildPublicSummary,
	type SikesraPublicFilters,
	type SikesraPublicMetadata,
	type SikesraPublicSummary,
} from "./shared.js";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_SITE_ID = "main";
const SAFE_SENSITIVITY_LEVELS = ["public_safe", "internal"] as const;

const STATUS_LABELS: Record<string, string> = {
	verified: "Terverifikasi",
	verified_regency: "Terverifikasi Kabupaten",
	verified_subdistrict: "Terverifikasi Kecamatan",
	verified_village: "Terverifikasi Desa/Kelurahan",
};

type ChartRow = { key: string; label: string; total: number };
type LabelRow = { label: string; total: number };

export async function getPublicMetadata(): Promise<SikesraPublicMetadata> {
	try {
		const db = await loadDb();
		const result = await sql<{
			public_enabled: number;
			public_title: string;
			public_description: string | null;
			data_scope_note: string | null;
			official_contact: string | null;
			latest_update_at: string | null;
		}>`
			SELECT
				public_enabled,
				public_title,
				public_description,
				data_scope_note,
				official_contact,
				(
					SELECT MAX(updated_at)
					FROM awcms_sikesra_entities
					WHERE tenant_id = ${DEFAULT_TENANT_ID}
						AND site_id = ${DEFAULT_SITE_ID}
						AND deleted_at IS NULL
				) AS latest_update_at
			FROM awcms_sikesra_settings
			WHERE tenant_id = ${DEFAULT_TENANT_ID}
				AND site_id = ${DEFAULT_SITE_ID}
				AND deleted_at IS NULL
			LIMIT 1
		`.execute(db as never);

		const row = result.rows[0];
		if (!row) return buildPublicMetadata();

		return {
			enabled: row.public_enabled === 1,
			title: row.public_title,
			description:
				row.public_description || "Ringkasan publik SIKESRA berbasis data agregat aman publik.",
			dataScopeNote:
				row.data_scope_note ||
				"Halaman publik hanya menampilkan data agregat aman publik yang lolos ambang supresi.",
			latestUpdateAt: row.latest_update_at,
			officialContact: row.official_contact || "",
		};
	} catch (error) {
		if (isSafePublicFallbackError(error)) return buildPublicMetadata();
		throw error;
	}
}

export async function getPublicFilters(): Promise<SikesraPublicFilters> {
	try {
		const db = await loadDb();
		const threshold = await getSuppressionThreshold(db);
		const [districts, villages, objectTypes, years, statuses] = await Promise.all([
			sql<{ code: string; name: string }>`
				SELECT district.code, district.name
				FROM awcms_sikesra_entities entity
				JOIN awcms_sikesra_official_regions village
					ON village.tenant_id = entity.tenant_id
					AND village.site_id = entity.site_id
					AND village.code = entity.official_village_code
				JOIN awcms_sikesra_official_regions district
					ON district.tenant_id = village.tenant_id
					AND district.site_id = village.site_id
					AND district.code = village.parent_code
				WHERE ${publicEntityWhereSql()}
				GROUP BY district.code, district.name
				HAVING COUNT(*) >= ${threshold}
				ORDER BY district.name ASC
			`.execute(db as never),
			sql<{ code: string; district_code: string; name: string }>`
				SELECT village.code, village.parent_code AS district_code, village.name
				FROM awcms_sikesra_entities entity
				JOIN awcms_sikesra_official_regions village
					ON village.tenant_id = entity.tenant_id
					AND village.site_id = entity.site_id
					AND village.code = entity.official_village_code
				WHERE ${publicEntityWhereSql()}
				GROUP BY village.code, village.parent_code, village.name
				HAVING COUNT(*) >= ${threshold}
				ORDER BY village.name ASC
			`.execute(db as never),
			sql<{ code: string; name: string }>`
				SELECT object_type.code, object_type.name
				FROM awcms_sikesra_entities entity
				JOIN awcms_sikesra_object_types object_type
					ON object_type.tenant_id = entity.tenant_id
					AND object_type.site_id = entity.site_id
					AND object_type.code = entity.object_type_code
				WHERE ${publicEntityWhereSql()}
				GROUP BY object_type.code, object_type.name
				HAVING COUNT(*) >= ${threshold}
				ORDER BY object_type.code ASC
			`.execute(db as never),
			sql<{ year: number }>`
				SELECT CAST(substr(updated_at, 1, 4) AS INTEGER) AS year
				FROM awcms_sikesra_entities
				WHERE ${publicEntityWhereSql()}
				GROUP BY CAST(substr(updated_at, 1, 4) AS INTEGER)
				ORDER BY year DESC
			`.execute(db as never),
			sql<{ code: string; total: number }>`
				SELECT status_verification AS code, COUNT(*) AS total
				FROM awcms_sikesra_entities
				WHERE ${publicEntityWhereSql()}
				GROUP BY status_verification
				ORDER BY total DESC
			`.execute(db as never),
		]);

		return {
			districts: districts.rows,
			villages: villages.rows.map((row) => ({
				code: row.code,
				districtCode: row.district_code,
				name: row.name,
			})),
			objectTypes: objectTypes.rows,
			years: years.rows
				.map((row: { year: number }) => row.year)
				.filter((year: number) => Number.isFinite(year)),
			statuses: statuses.rows
				.filter((row: { code: string; total: number }) => row.total >= threshold)
				.map((row: { code: string }) => ({
					code: row.code,
					label: STATUS_LABELS[row.code] || row.code,
				})),
		};
	} catch (error) {
		if (isSafePublicFallbackError(error)) return buildPublicFilters();
		throw error;
	}
}

export async function getPublicSummary(): Promise<SikesraPublicSummary> {
	try {
		const db = await loadDb();
		const threshold = await getSuppressionThreshold(db);
		const [kpisResult, typeRows, regionRows, verificationRows, attributeRows] = await Promise.all([
			sql<{
				total_entities: number;
				verified_entities: number;
				active_villages: number;
				latest_update_at: string | null;
			}>`
				SELECT
					COUNT(*) AS total_entities,
					COUNT(*) AS verified_entities,
					COUNT(DISTINCT official_village_code) AS active_villages,
					MAX(updated_at) AS latest_update_at
				FROM awcms_sikesra_entities
				WHERE ${publicEntityWhereSql()}
			`.execute(db as never),
			sql<{ key: string; label: string; total: number }>`
				SELECT object_type.code AS key, object_type.name AS label, COUNT(*) AS total
				FROM awcms_sikesra_entities entity
				JOIN awcms_sikesra_object_types object_type
					ON object_type.tenant_id = entity.tenant_id
					AND object_type.site_id = entity.site_id
					AND object_type.code = entity.object_type_code
				WHERE ${publicEntityWhereSql()}
				GROUP BY object_type.code, object_type.name
				ORDER BY total DESC, object_type.code ASC
			`.execute(db as never),
			sql<{ key: string; label: string; total: number }>`
				SELECT district.code AS key, district.name AS label, COUNT(*) AS total
				FROM awcms_sikesra_entities entity
				JOIN awcms_sikesra_official_regions village
					ON village.tenant_id = entity.tenant_id
					AND village.site_id = entity.site_id
					AND village.code = entity.official_village_code
				JOIN awcms_sikesra_official_regions district
					ON district.tenant_id = village.tenant_id
					AND district.site_id = village.site_id
					AND district.code = village.parent_code
				WHERE ${publicEntityWhereSql()}
				GROUP BY district.code, district.name
				ORDER BY total DESC, district.name ASC
			`.execute(db as never),
			sql<{ key: string; label: string; total: number }>`
				SELECT status_verification AS key, status_verification AS label, COUNT(*) AS total
				FROM awcms_sikesra_entities
				WHERE ${publicEntityWhereSql()}
				GROUP BY status_verification
				ORDER BY total DESC, status_verification ASC
			`.execute(db as never),
			sql<{ key: string; label: string; total: number }>`
				SELECT religion_attribute AS key, religion_attribute AS label, COUNT(*) AS total
				FROM awcms_sikesra_entities
				WHERE ${publicEntityWhereSql()}
					AND religion_attribute IS NOT NULL
					AND religion_attribute != ''
				GROUP BY religion_attribute
				ORDER BY total DESC, religion_attribute ASC
			`.execute(db as never),
		]);

		const kpis = kpisResult.rows[0];
		const { items: byObjectType, suppressedCells: typeSuppressed } = suppressRows<LabelRow>(
			typeRows.rows,
			threshold,
		);
		const { items: byRegion, suppressedCells: regionSuppressed } = suppressRows<LabelRow>(
			regionRows.rows,
			threshold,
		);
		const { items: byVerificationStatus, suppressedCells: verificationSuppressed } = suppressRows(
			verificationRows.rows.map((row: ChartRow) => ({
				...row,
				label: STATUS_LABELS[row.key] || row.label,
			})),
			threshold,
		);
		const { items: bySafeAttribute, suppressedCells: attributeSuppressed } = suppressRows<LabelRow>(
			attributeRows.rows,
			threshold,
		);

		return {
			kpis: {
				totalEntities: Number(kpis?.total_entities ?? 0),
				verifiedEntities: Number(kpis?.verified_entities ?? 0),
				activeVillages: Number(kpis?.active_villages ?? 0),
				latestUpdateAt: kpis?.latest_update_at ?? null,
			},
			suppression: {
				threshold,
				suppressedCells:
					typeSuppressed + regionSuppressed + verificationSuppressed + attributeSuppressed,
			},
			charts: {
				byObjectType,
				byRegion,
				byVerificationStatus,
				bySafeAttribute,
			},
			caveat:
				"Halaman publik hanya menampilkan data agregat aktif, terverifikasi, dan aman publik dengan supresi sel kecil.",
		};
	} catch (error) {
		if (isSafePublicFallbackError(error)) return buildPublicSummary();
		throw error;
	}
}

async function getSuppressionThreshold(db: unknown): Promise<number> {
	const result = await sql<{ small_cell_threshold: number }>`
		SELECT small_cell_threshold
		FROM awcms_sikesra_settings
		WHERE tenant_id = ${DEFAULT_TENANT_ID}
			AND site_id = ${DEFAULT_SITE_ID}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	return Number(result.rows[0]?.small_cell_threshold ?? 5);
}

async function loadDb() {
	const runtime = await import("emdash/runtime");
	return runtime.getDb();
}

function publicEntityWhereSql() {
	return sql`
		tenant_id = ${DEFAULT_TENANT_ID}
		AND site_id = ${DEFAULT_SITE_ID}
		AND deleted_at IS NULL
		AND status_data = 'active'
		AND status_verification = 'verified'
		AND sensitivity_level IN (${SAFE_SENSITIVITY_LEVELS[0]}, ${SAFE_SENSITIVITY_LEVELS[1]})
	`;
}

function suppressRows<T extends { label: string; total: number }>(
	rows: T[],
	threshold: number,
): { items: Array<T & { suppressed?: boolean }>; suppressedCells: number } {
	let suppressedCells = 0;
	const items = rows.map((row) => {
		if (Number(row.total) >= threshold) return row;
		suppressedCells += 1;
		return {
			...row,
			total: 0,
			suppressed: true,
		};
	});
	return { items, suppressedCells };
}

function isSafePublicFallbackError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const message = error.message.toLowerCase();
	return (
		message.includes("no such table") ||
		((message.includes("does not exist") || message.includes("doesn't exist")) &&
			(message.includes("relation") || message.includes("table"))) ||
		message.includes("database not configured") ||
		message.includes("cannot find package 'emdash/runtime'")
	);
}
