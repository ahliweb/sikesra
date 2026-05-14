import { sql } from "kysely";

import type { SikesraRequestContext } from "../security/request-context.js";
import { checkRegionScope, guardRoute } from "../security/route-guard.js";

export interface OfficialRegionSummary {
	code: string;
	name: string;
	level: string;
	parentCode: string | null;
}

export interface LocalRegionSummary {
	id: string;
	name: string;
	level: string;
	officialVillageCode: string;
	parentId: string | null;
	codeLocal: string | null;
}

export interface OfficialRegionFilters {
	level?: string;
	parentCode?: string;
}

export interface LocalRegionFilters {
	officialVillageCode?: string;
	parentId?: string;
	level?: string;
}

const DEFAULT_LIMIT = 100;

export async function listOfficialRegions(
	db: unknown,
	ctx: SikesraRequestContext,
	filters: OfficialRegionFilters,
): Promise<OfficialRegionSummary[]> {
	const denied = guardRoute(ctx, "entity:read");
	if (!denied.allowed) return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const result = await sql<OfficialRegionSummary>`
		SELECT code, name, level, parent_code AS parentCode
		FROM awcms_sikesra_official_regions
		WHERE ${buildOfficialWhereSql(ctx, filters)}
		ORDER BY level ASC, name ASC
		LIMIT ${DEFAULT_LIMIT}
	`.execute(db as never);

	return result.rows;
}

export async function listLocalRegions(
	db: unknown,
	ctx: SikesraRequestContext,
	filters: LocalRegionFilters,
): Promise<LocalRegionSummary[]> {
	const denied = guardRoute(ctx, "entity:read");
	if (!denied.allowed) return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	if (filters.officialVillageCode && !checkRegionScope(ctx, filters.officialVillageCode)) {
		return [];
	}

	const result = await sql<LocalRegionSummary>`
		SELECT
			id,
			name,
			level,
			official_village_code AS officialVillageCode,
			parent_id AS parentId,
			code_local AS codeLocal
		FROM awcms_sikesra_local_regions
		WHERE ${buildLocalWhereSql(ctx, filters)}
		ORDER BY level ASC, name ASC
		LIMIT ${DEFAULT_LIMIT}
	`.execute(db as never);

	return result.rows;
}

function buildOfficialWhereSql(ctx: SikesraRequestContext, filters: OfficialRegionFilters) {
	const conditions = [
		sql`tenant_id = ${ctx.tenantId}`,
		sql`site_id = ${ctx.siteId}`,
		sql`deleted_at IS NULL`,
	];

	if (filters.level) conditions.push(sql`level = ${filters.level}`);
	if (filters.parentCode) conditions.push(sql`parent_code = ${filters.parentCode}`);
	if (ctx.regionScope.villageCodes?.length) {
		conditions.push(
			sql`(
				level IN ('province', 'regency', 'district')
				OR code IN (${sql.join(ctx.regionScope.villageCodes.map((code) => sql`${code}`))})
			)`,
		);
	}

	return sql.join(conditions, sql` AND `);
}

async function throwRouteError(code: string, message: string | undefined, status: number): Promise<never> {
	const { PluginRouteError } = await import("emdash");
	throw new PluginRouteError(code, message || code, status);
}

function buildLocalWhereSql(ctx: SikesraRequestContext, filters: LocalRegionFilters) {
	const conditions = [
		sql`tenant_id = ${ctx.tenantId}`,
		sql`site_id = ${ctx.siteId}`,
		sql`deleted_at IS NULL`,
	];

	if (filters.officialVillageCode) {
		conditions.push(sql`official_village_code = ${filters.officialVillageCode}`);
	}
	if (filters.parentId) conditions.push(sql`parent_id = ${filters.parentId}`);
	if (filters.level) conditions.push(sql`level = ${filters.level}`);
	if (ctx.regionScope.villageCodes?.length) {
		conditions.push(
			sql`official_village_code IN (${sql.join(ctx.regionScope.villageCodes.map((code) => sql`${code}`))})`,
		);
	}
	if (ctx.regionScope.localRegionIds?.length) {
		conditions.push(
			sql`(
				id IN (${sql.join(ctx.regionScope.localRegionIds.map((id) => sql`${id}`))})
				OR parent_id IN (${sql.join(ctx.regionScope.localRegionIds.map((id) => sql`${id}`))})
			)`,
		);
	}

	return sql.join(conditions, sql` AND `);
}
