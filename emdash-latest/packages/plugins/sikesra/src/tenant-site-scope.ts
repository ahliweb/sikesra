import { sql } from "kysely";

export const DEFAULT_SIKESRA_TENANT_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_SIKESRA_SITE_ID = "main";
export const LEGACY_DEFAULT_SIKESRA_TENANT_ID = "default";
export const LEGACY_DEFAULT_SIKESRA_SITE_ID = "default";

export interface TenantSiteScope {
	tenantId: string;
	siteId: string;
}

export function buildTenantSiteScopeSql(
	tenantColumn: string,
	siteColumn: string,
	tenantId: string = DEFAULT_SIKESRA_TENANT_ID,
	siteId: string = DEFAULT_SIKESRA_SITE_ID,
) {
	const primary = sql`${sql.ref(tenantColumn)} = ${tenantId} AND ${sql.ref(siteColumn)} = ${siteId}`;

	if (!usesLegacyDefaultScopeFallback(tenantId, siteId)) {
		return primary;
	}

	return sql`(
		(${primary})
		OR (
			${sql.ref(tenantColumn)} = ${LEGACY_DEFAULT_SIKESRA_TENANT_ID}
			AND ${sql.ref(siteColumn)} = ${LEGACY_DEFAULT_SIKESRA_SITE_ID}
		)
	)`;
}

export function usesLegacyDefaultScopeFallback(tenantId: string, siteId: string) {
	return tenantId === DEFAULT_SIKESRA_TENANT_ID && siteId === DEFAULT_SIKESRA_SITE_ID;
}

export function buildCanonicalScopeOrderSql(
	tenantColumn: string,
	siteColumn: string,
	tenantId: string = DEFAULT_SIKESRA_TENANT_ID,
	siteId: string = DEFAULT_SIKESRA_SITE_ID,
) {
	return sql`CASE WHEN ${sql.ref(tenantColumn)} = ${tenantId} AND ${sql.ref(siteColumn)} = ${siteId} THEN 0 ELSE 1 END`;
}

export function getTenantSiteFallbackScopes(
	tenantId: string = DEFAULT_SIKESRA_TENANT_ID,
	siteId: string = DEFAULT_SIKESRA_SITE_ID,
): TenantSiteScope[] {
	const scopes: TenantSiteScope[] = [];
	const seen = new Set<string>();

	for (const scope of [
		{ tenantId, siteId },
		{ tenantId: DEFAULT_SIKESRA_TENANT_ID, siteId: DEFAULT_SIKESRA_SITE_ID },
		{ tenantId: LEGACY_DEFAULT_SIKESRA_TENANT_ID, siteId: LEGACY_DEFAULT_SIKESRA_SITE_ID },
	]) {
		const key = `${scope.tenantId}::${scope.siteId}`;
		if (seen.has(key)) continue;
		seen.add(key);
		scopes.push(scope);
	}

	return scopes;
}
