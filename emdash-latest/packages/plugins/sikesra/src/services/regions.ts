import { sql } from "kysely";

import type { SikesraRequestContext } from "../security/request-context.js";
import { checkRegionScope, guardRoute } from "../security/route-guard.js";
import {
	buildCanonicalScopeOrderSql,
	DEFAULT_SIKESRA_SITE_ID,
	DEFAULT_SIKESRA_TENANT_ID,
	LEGACY_DEFAULT_SIKESRA_SITE_ID,
	LEGACY_DEFAULT_SIKESRA_TENANT_ID,
	type TenantSiteScope,
} from "../tenant-site-scope.js";

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
	const denied = guardRoute(ctx, "region:read");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const scopes = await getPreferredOfficialRegionScopes(db, ctx, filters);

	const result =
		scopes.length === 1
			? await sql<OfficialRegionSummary>`
					SELECT code, name, level, parent_code AS parentCode
					FROM awcms_sikesra_official_regions
					WHERE ${buildOfficialWhereSql(ctx, filters, scopes[0]!)}
					ORDER BY level ASC, name ASC
					LIMIT ${DEFAULT_LIMIT}
				`.execute(db as never)
			: await sql<OfficialRegionSummary>`
					SELECT code, name, level, parentCode
					FROM (
						SELECT
							code,
							name,
							level,
							parent_code AS parentCode,
							ROW_NUMBER() OVER (
								PARTITION BY code
								ORDER BY ${buildCanonicalScopeOrderSql(
									"tenant_id",
									"site_id",
									DEFAULT_SIKESRA_TENANT_ID,
									DEFAULT_SIKESRA_SITE_ID,
								)}, level ASC, name ASC
							) AS scope_rank
						FROM awcms_sikesra_official_regions
						WHERE ${buildOfficialMultiScopeWhereSql(ctx, filters, scopes)}
					) deduped
					WHERE scope_rank = 1
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
	const denied = guardRoute(ctx, "region:read");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	if (filters.officialVillageCode && !checkRegionScope(ctx, filters.officialVillageCode)) {
		return [];
	}

	const scope = await getPreferredLocalRegionScope(db, ctx, filters);

	const result = await sql<LocalRegionSummary>`
		SELECT
			id,
			name,
			level,
			official_village_code AS officialVillageCode,
			parent_id AS parentId,
			code_local AS codeLocal
		FROM awcms_sikesra_local_regions
		WHERE ${buildLocalWhereSql(ctx, filters, scope)}
		ORDER BY level ASC, name ASC
		LIMIT ${DEFAULT_LIMIT}
	`.execute(db as never);

	return result.rows;
}

function buildOfficialWhereSql(
	ctx: SikesraRequestContext,
	filters: OfficialRegionFilters,
	scope: TenantSiteScope,
) {
	const conditions = [
		sql`tenant_id = ${scope.tenantId}`,
		sql`site_id = ${scope.siteId}`,
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

function buildOfficialMultiScopeWhereSql(
	ctx: SikesraRequestContext,
	filters: OfficialRegionFilters,
	scopes: TenantSiteScope[],
) {
	const scopeConditions = scopes.map(
		(scope) => sql`(tenant_id = ${scope.tenantId} AND site_id = ${scope.siteId})`,
	);
	const conditions = [sql`(${sql.join(scopeConditions, sql` OR `)})`, sql`deleted_at IS NULL`];

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

async function getPreferredOfficialRegionScopes(
	db: unknown,
	ctx: SikesraRequestContext,
	filters: OfficialRegionFilters,
) {
	const currentScope = { tenantId: ctx.tenantId, siteId: ctx.siteId };
	if (isLegacyDefaultScope(currentScope)) {
		return [currentScope];
	}

	const currentCount = await countOfficialRegions(db, ctx, filters, currentScope);
	if (!isCanonicalDefaultScope(currentScope) && currentCount > 0) {
		return [currentScope];
	}

	const canonicalScope = { tenantId: DEFAULT_SIKESRA_TENANT_ID, siteId: DEFAULT_SIKESRA_SITE_ID };
	const legacyScope = {
		tenantId: LEGACY_DEFAULT_SIKESRA_TENANT_ID,
		siteId: LEGACY_DEFAULT_SIKESRA_SITE_ID,
	};
	const [canonicalCount, legacyCount] = await Promise.all([
		countOfficialRegions(db, ctx, filters, canonicalScope),
		countOfficialRegions(db, ctx, filters, legacyScope),
	]);

	if (canonicalCount > 0 && legacyCount > 0) {
		return [canonicalScope, legacyScope];
	}
	if (canonicalCount > 0) {
		return [canonicalScope];
	}
	if (legacyCount > 0) {
		return [legacyScope];
	}
	if (currentCount > 0) {
		return [currentScope];
	}

	return [currentScope];
}

async function throwRouteError(
	code: string,
	message: string | undefined,
	status: number,
): Promise<never> {
	const { PluginRouteError } = await import("emdash");
	throw new PluginRouteError(code, message || code, status);
}

function buildLocalWhereSql(
	ctx: SikesraRequestContext,
	filters: LocalRegionFilters,
	scope: { tenantId: string; siteId: string },
) {
	const conditions = [
		sql`tenant_id = ${scope.tenantId}`,
		sql`site_id = ${scope.siteId}`,
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

async function getPreferredLocalRegionScope(
	db: unknown,
	ctx: SikesraRequestContext,
	filters: LocalRegionFilters,
) {
	const currentScope = { tenantId: ctx.tenantId, siteId: ctx.siteId };
	if (isLegacyDefaultScope(currentScope)) {
		return currentScope;
	}

	const currentCount = await countLocalRegions(db, ctx, filters, currentScope);
	if (!isCanonicalDefaultScope(currentScope) && currentCount > 0) {
		return currentScope;
	}

	const canonicalScope = { tenantId: DEFAULT_SIKESRA_TENANT_ID, siteId: DEFAULT_SIKESRA_SITE_ID };
	const legacyScope = {
		tenantId: LEGACY_DEFAULT_SIKESRA_TENANT_ID,
		siteId: LEGACY_DEFAULT_SIKESRA_SITE_ID,
	};
	const [canonicalCount, legacyCount] = await Promise.all([
		countLocalRegions(db, ctx, filters, canonicalScope),
		countLocalRegions(db, ctx, filters, legacyScope),
	]);

	if (canonicalCount >= legacyCount && canonicalCount > 0) {
		return canonicalScope;
	}
	if (legacyCount > 0) {
		return legacyScope;
	}
	if (currentCount > 0) {
		return currentScope;
	}

	return currentScope;
}

async function countOfficialRegions(
	db: unknown,
	ctx: SikesraRequestContext,
	filters: OfficialRegionFilters,
	scope: TenantSiteScope,
) {
	const result = await sql<{ count: number }>`
		SELECT COUNT(*) AS count
		FROM awcms_sikesra_official_regions
		WHERE ${buildOfficialWhereSql(ctx, filters, scope)}
	`.execute(db as never);

	return Number(result.rows[0]?.count ?? 0);
}

async function countLocalRegions(
	db: unknown,
	ctx: SikesraRequestContext,
	filters: LocalRegionFilters,
	scope: TenantSiteScope,
) {
	const result = await sql<{ count: number }>`
		SELECT COUNT(*) AS count
		FROM awcms_sikesra_local_regions
		WHERE ${buildLocalWhereSql(ctx, filters, scope)}
	`.execute(db as never);

	return Number(result.rows[0]?.count ?? 0);
}

function isCanonicalDefaultScope(scope: TenantSiteScope) {
	return scope.tenantId === DEFAULT_SIKESRA_TENANT_ID && scope.siteId === DEFAULT_SIKESRA_SITE_ID;
}

function isLegacyDefaultScope(scope: TenantSiteScope) {
	return (
		scope.tenantId === LEGACY_DEFAULT_SIKESRA_TENANT_ID &&
		scope.siteId === LEGACY_DEFAULT_SIKESRA_SITE_ID
	);
}
