import { sql } from "kysely";

import {
	evaluateAbac,
	buildAbacSubject,
	type AbacResource,
} from "../security/abac.js";
import {
	maskAddress,
	maskProtectedName,
	type MaskingContext,
} from "../security/masking.js";
import {
	SIKESRA_PERMISSIONS,
	type SikesraPermission,
} from "../security/permissions.js";
import type { SikesraRequestContext } from "../security/request-context.js";
import { checkRegionScope, guardRoute } from "../security/route-guard.js";

export interface EntityListFilters {
	keyword?: string;
	objectTypeCode?: string;
	objectSubtypeCode?: string;
	districtCode?: string;
	officialVillageCode?: string;
	localRegionId?: string;
	statusData?: string;
	statusVerification?: string;
	sensitivityLevel?: string;
	sourceInput?: string;
	duplicateStatus?: string;
	limit?: number;
}

export interface RegionBreadcrumb {
	village?: { code: string; name: string };
	district?: { code: string; name: string };
	local?: { id: string; name: string; level: string } | null;
}

export interface EntitySummary {
	id: string;
	sikesraId20: string | null;
	objectTypeCode: string;
	objectTypeName: string;
	objectSubtypeCode: string;
	objectSubtypeName: string;
	entityKind: string;
	displayName: string;
	masked: boolean;
	officialRegion: RegionBreadcrumb;
	localRegion?: RegionBreadcrumb["local"];
	statusData: string;
	statusVerification: string;
	verificationLevel: string | null;
	sensitivityLevel: string;
	completenessPercent: number;
	duplicateStatus: string | null;
	sourceInput: string;
	createdAt: string;
	updatedAt: string;
}

export interface EntityDetailResponse {
	entity: EntitySummary;
	summary: Record<string, unknown>;
	details?: Record<string, unknown>;
	attributes?: Array<Record<string, unknown>>;
	documents?: Array<Record<string, unknown>>;
	verification?: { status: string; level: string | null; verifiedAt: string | null };
	benefits?: Array<Record<string, unknown>>;
	audit?: Array<Record<string, unknown>>;
	access: {
		canEdit: boolean;
		canSubmit: boolean;
		canVerify: boolean;
		canGenerateCode: boolean;
		canRevealSensitive: boolean;
		canDownloadDocuments: boolean;
		deniedActions: Array<{ action: string; reasonCode: string }>;
	};
}

interface EntityRow {
	id: string;
	sikesra_id_20: string | null;
	object_type_code: string;
	object_type_name: string;
	object_subtype_code: string;
	object_subtype_name: string;
	entity_kind: string;
	display_name: string;
	official_village_code: string;
	village_name: string;
	district_code: string | null;
	district_name: string | null;
	local_region_id: string | null;
	local_region_name: string | null;
	local_region_level: string | null;
	address_text: string | null;
	status_data: string;
	status_verification: string;
	verification_level: string | null;
	sensitivity_level: string;
	completeness_percent: number;
	duplicate_status: string | null;
	source_input: string;
	created_at: string;
	updated_at: string;
	verified_at: string | null;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const DETAIL_TABLES: Record<string, string> = {
	"01": "awcms_sikesra_rumah_ibadah_details",
	"02": "awcms_sikesra_lembaga_keagamaan_details",
	"03": "awcms_sikesra_pendidikan_keagamaan_details",
	"04": "awcms_sikesra_lks_details",
	"05": "awcms_sikesra_guru_agama_details",
	"06": "awcms_sikesra_anak_yatim_details",
	"07": "awcms_sikesra_disabilitas_details",
	"08": "awcms_sikesra_lansia_terlantar_details",
};

export async function listEntities(
	db: unknown,
	ctx: SikesraRequestContext,
	filters: EntityListFilters,
): Promise<{ items: EntitySummary[]; nextCursor?: string }> {
	const denied = guardRoute(ctx, "entity:read");
	if (!denied.allowed) return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const limit = Math.min(Math.max(filters.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
	const result = await sql<EntityRow>`
		SELECT
			entity.id,
			entity.sikesra_id_20,
			entity.object_type_code,
			object_type.name AS object_type_name,
			entity.object_subtype_code,
			object_subtype.name AS object_subtype_name,
			entity.entity_kind,
			entity.display_name,
			entity.official_village_code,
			village.name AS village_name,
			district.code AS district_code,
			district.name AS district_name,
			entity.local_region_id,
			local_region.name AS local_region_name,
			local_region.level AS local_region_level,
			entity.address_text,
			entity.status_data,
			entity.status_verification,
			entity.verification_level,
			entity.sensitivity_level,
			entity.completeness_percent,
			entity.duplicate_status,
			entity.source_input,
			entity.created_at,
			entity.updated_at,
			entity.verified_at
		FROM awcms_sikesra_entities entity
		JOIN awcms_sikesra_object_types object_type
			ON object_type.tenant_id = entity.tenant_id
			AND object_type.site_id = entity.site_id
			AND object_type.code = entity.object_type_code
		JOIN awcms_sikesra_object_subtypes object_subtype
			ON object_subtype.tenant_id = entity.tenant_id
			AND object_subtype.site_id = entity.site_id
			AND object_subtype.type_code = entity.object_type_code
			AND object_subtype.code = entity.object_subtype_code
		JOIN awcms_sikesra_official_regions village
			ON village.tenant_id = entity.tenant_id
			AND village.site_id = entity.site_id
			AND village.code = entity.official_village_code
		LEFT JOIN awcms_sikesra_official_regions district
			ON district.tenant_id = village.tenant_id
			AND district.site_id = village.site_id
			AND district.code = village.parent_code
		LEFT JOIN awcms_sikesra_local_regions local_region
			ON local_region.id = entity.local_region_id
			AND local_region.deleted_at IS NULL
		WHERE ${buildEntityWhereSql(ctx, filters)}
		ORDER BY entity.updated_at DESC, entity.id DESC
		LIMIT ${limit + 1}
	`.execute(db as never);

	const rows = result.rows;
	const hasMore = rows.length > limit;
	const items = rows.slice(0, limit).map((row) => mapEntitySummary(row, ctx));

	return {
		items,
		nextCursor: hasMore ? rows[limit]?.id : undefined,
	};
}

export async function getEntityDetail(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<EntityDetailResponse> {
	const denied = guardRoute(ctx, "entity:read");
	if (!denied.allowed) return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const result = await sql<EntityRow>`
		SELECT
			entity.id,
			entity.sikesra_id_20,
			entity.object_type_code,
			object_type.name AS object_type_name,
			entity.object_subtype_code,
			object_subtype.name AS object_subtype_name,
			entity.entity_kind,
			entity.display_name,
			entity.official_village_code,
			village.name AS village_name,
			district.code AS district_code,
			district.name AS district_name,
			entity.local_region_id,
			local_region.name AS local_region_name,
			local_region.level AS local_region_level,
			entity.address_text,
			entity.status_data,
			entity.status_verification,
			entity.verification_level,
			entity.sensitivity_level,
			entity.completeness_percent,
			entity.duplicate_status,
			entity.source_input,
			entity.created_at,
			entity.updated_at,
			entity.verified_at
		FROM awcms_sikesra_entities entity
		JOIN awcms_sikesra_object_types object_type
			ON object_type.tenant_id = entity.tenant_id
			AND object_type.site_id = entity.site_id
			AND object_type.code = entity.object_type_code
		JOIN awcms_sikesra_object_subtypes object_subtype
			ON object_subtype.tenant_id = entity.tenant_id
			AND object_subtype.site_id = entity.site_id
			AND object_subtype.type_code = entity.object_type_code
			AND object_subtype.code = entity.object_subtype_code
		JOIN awcms_sikesra_official_regions village
			ON village.tenant_id = entity.tenant_id
			AND village.site_id = entity.site_id
			AND village.code = entity.official_village_code
		LEFT JOIN awcms_sikesra_official_regions district
			ON district.tenant_id = village.tenant_id
			AND district.site_id = village.site_id
			AND district.code = village.parent_code
		LEFT JOIN awcms_sikesra_local_regions local_region
			ON local_region.id = entity.local_region_id
			AND local_region.deleted_at IS NULL
		WHERE entity.tenant_id = ${ctx.tenantId}
			AND entity.site_id = ${ctx.siteId}
			AND entity.deleted_at IS NULL
			AND entity.id = ${entityId}
		LIMIT 1
	`.execute(db as never);

	const row = result.rows[0];
	if (!row) return throwRouteError("NOT_FOUND", "Entity not found", 404);
	if (!checkRegionScope(ctx, row.official_village_code, row.local_region_id || undefined)) {
		return throwRouteError("NOT_FOUND", "Entity not found", 404);
	}

	const abac = evaluateAbac(
		{
			subject: buildAbacSubject(ctx),
			resource: buildAbacResource(row),
			action: "read",
			environment: {
				requestId: ctx.requestId,
				ipAddress: ctx.ipAddress,
				userAgent: ctx.userAgent,
			},
		},
		[],
		ctx,
	);
	if (!abac.allowed) return throwRouteError("NOT_FOUND", "Entity not found", 404);

	const detailTable = DETAIL_TABLES[row.object_type_code];
	const detailRecord = detailTable ? await getDetailRecord(db, ctx, detailTable, row.id) : undefined;
	const masking = buildMaskingContext(ctx);

	return {
		entity: mapEntitySummary(row, ctx),
		summary: {
			addressText: maskAddress(row.address_text, masking),
			sourceInput: row.source_input,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			districtCode: row.district_code,
			districtName: row.district_name,
		},
		details: detailRecord,
		verification: {
			status: row.status_verification,
			level: row.verification_level,
			verifiedAt: row.verified_at,
		},
		access: buildAccessFlags(ctx),
	};
}

function buildEntityWhereSql(ctx: SikesraRequestContext, filters: EntityListFilters) {
	const conditions = [
		sql`entity.tenant_id = ${ctx.tenantId}`,
		sql`entity.site_id = ${ctx.siteId}`,
		sql`entity.deleted_at IS NULL`,
	];

	if (filters.keyword) {
		conditions.push(
			sql`(
				LOWER(entity.display_name) LIKE LOWER(${`%${filters.keyword}%`})
				OR LOWER(COALESCE(entity.sikesra_id_20, '')) LIKE LOWER(${`%${filters.keyword}%`})
			)`,
		);
	}
	if (filters.objectTypeCode) conditions.push(sql`entity.object_type_code = ${filters.objectTypeCode}`);
	if (filters.objectSubtypeCode) {
		conditions.push(sql`entity.object_subtype_code = ${filters.objectSubtypeCode}`);
	}
	if (filters.districtCode) conditions.push(sql`district.code = ${filters.districtCode}`);
	if (filters.officialVillageCode) {
		conditions.push(sql`entity.official_village_code = ${filters.officialVillageCode}`);
	}
	if (filters.localRegionId) conditions.push(sql`entity.local_region_id = ${filters.localRegionId}`);
	if (filters.statusData) conditions.push(sql`entity.status_data = ${filters.statusData}`);
	if (filters.statusVerification) {
		conditions.push(sql`entity.status_verification = ${filters.statusVerification}`);
	}
	if (filters.sensitivityLevel) {
		conditions.push(sql`entity.sensitivity_level = ${filters.sensitivityLevel}`);
	}
	if (filters.sourceInput) conditions.push(sql`entity.source_input = ${filters.sourceInput}`);
	if (filters.duplicateStatus) {
		conditions.push(sql`entity.duplicate_status = ${filters.duplicateStatus}`);
	}
	if (ctx.regionScope.villageCodes?.length) {
		conditions.push(
			sql`entity.official_village_code IN (${sql.join(
				ctx.regionScope.villageCodes.map((code) => sql`${code}`),
			)})`,
		);
	}
	if (ctx.regionScope.localRegionIds?.length) {
		conditions.push(
			sql`(
				entity.local_region_id IN (${sql.join(
					ctx.regionScope.localRegionIds.map((id) => sql`${id}`),
				)})
			)`,
		);
	}

	return sql.join(conditions, sql` AND `);
}

function mapEntitySummary(row: EntityRow, ctx: SikesraRequestContext): EntitySummary {
	const masking = buildMaskingContext(ctx);
	const shouldMaskName =
		(row.entity_kind === "person" || row.sensitivity_level !== "public_safe") &&
		!masking.canRevealSensitive;

	return {
		id: row.id,
		sikesraId20: row.sikesra_id_20,
		objectTypeCode: row.object_type_code,
		objectTypeName: row.object_type_name,
		objectSubtypeCode: row.object_subtype_code,
		objectSubtypeName: row.object_subtype_name,
		entityKind: row.entity_kind,
		displayName: shouldMaskName
			? (maskProtectedName(row.display_name, masking) ?? row.display_name)
			: row.display_name,
		masked: shouldMaskName,
		officialRegion: {
			village: { code: row.official_village_code, name: row.village_name },
			district:
				row.district_code && row.district_name
					? { code: row.district_code, name: row.district_name }
					: undefined,
		},
		localRegion:
			row.local_region_id && row.local_region_name && row.local_region_level
				? {
					id: row.local_region_id,
					name: masking.canRevealSensitive ? row.local_region_name : row.local_region_level,
					level: row.local_region_level,
				}
				: undefined,
		statusData: row.status_data,
		statusVerification: row.status_verification,
		verificationLevel: row.verification_level,
		sensitivityLevel: row.sensitivity_level,
		completenessPercent: row.completeness_percent,
		duplicateStatus: row.duplicate_status,
		sourceInput: row.source_input,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function buildMaskingContext(ctx: SikesraRequestContext): MaskingContext {
	return {
		canRevealSensitive: ctx.permissions.includes(SIKESRA_PERMISSIONS.SENSITIVE_REVEAL),
		canRevealHighlyRestricted: ctx.permissions.includes(
			SIKESRA_PERMISSIONS.SENSITIVE_HIGHLY_RESTRICTED_READ,
		),
	};
}

function buildAccessFlags(ctx: SikesraRequestContext) {
	return {
		canEdit: ctx.permissions.includes(SIKESRA_PERMISSIONS.ENTITY_UPDATE),
		canSubmit: ctx.permissions.includes(SIKESRA_PERMISSIONS.VERIFICATION_SUBMIT),
		canVerify: ctx.permissions.includes(SIKESRA_PERMISSIONS.VERIFICATION_VERIFY),
		canGenerateCode: ctx.permissions.includes(SIKESRA_PERMISSIONS.CODE_GENERATE),
		canRevealSensitive: ctx.permissions.includes(SIKESRA_PERMISSIONS.SENSITIVE_REVEAL),
		canDownloadDocuments: ctx.permissions.includes(SIKESRA_PERMISSIONS.DOCUMENT_PRIVATE_DOWNLOAD),
		deniedActions: buildDeniedActions(ctx),
	};
}

function buildDeniedActions(ctx: SikesraRequestContext) {
	const checks: Array<[string, SikesraPermission]> = [
		["edit", SIKESRA_PERMISSIONS.ENTITY_UPDATE],
		["submit", SIKESRA_PERMISSIONS.VERIFICATION_SUBMIT],
		["verify", SIKESRA_PERMISSIONS.VERIFICATION_VERIFY],
		["generateCode", SIKESRA_PERMISSIONS.CODE_GENERATE],
		["revealSensitive", SIKESRA_PERMISSIONS.SENSITIVE_REVEAL],
		["downloadDocuments", SIKESRA_PERMISSIONS.DOCUMENT_PRIVATE_DOWNLOAD],
	];

	return checks
		.filter(([, permission]) => !ctx.permissions.includes(permission))
		.map(([action]) => ({ action, reasonCode: "missing_permission" }));
}

function buildAbacResource(row: EntityRow): AbacResource {
	return {
		resourceType: "entity",
		entityId: row.id,
		sikesraId20: row.sikesra_id_20 || undefined,
		objectTypeCode: row.object_type_code,
		objectSubtypeCode: row.object_subtype_code,
		entityKind: row.entity_kind,
		officialVillageCode: row.official_village_code,
		districtCode: row.district_code || undefined,
		localRegionId: row.local_region_id || undefined,
		sensitivityLevel: row.sensitivity_level,
		statusData: row.status_data,
		statusVerification: row.status_verification,
		sourceInput: row.source_input,
	};
}

async function getDetailRecord(
	db: unknown,
	ctx: SikesraRequestContext,
	tableName: string,
	entityId: string,
): Promise<Record<string, unknown> | undefined> {
	const result = await sql<Record<string, unknown>>`
		SELECT *
		FROM ${sql.ref(tableName)}
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND deleted_at IS NULL
			AND entity_id = ${entityId}
		LIMIT 1
	`.execute(db as never);

	const row = result.rows[0];
	if (!row) return undefined;

	const safe = { ...row };
	delete safe.tenant_id;
	delete safe.site_id;
	delete safe.deleted_at;
	delete safe.created_by;
	delete safe.updated_by;
	return safe;
}

async function throwRouteError(code: string, message: string, status: number): Promise<never> {
	const { PluginRouteError } = await import("emdash");
	throw new PluginRouteError(code, message, status);
}
