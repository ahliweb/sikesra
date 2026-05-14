export interface SikesraRegionScope {
	provinceCode?: string;
	regencyCode?: string;
	districtCodes?: string[];
	villageCodes?: string[];
	localRegionIds?: string[];
}

export interface SikesraTrustedContextInput {
	requestId: string;
	tenantId: string;
	siteId: string;
	userId: string;
	roles: string[];
	permissions: string[];
	subjectAttributes?: Record<string, unknown>;
	regionScope?: SikesraRegionScope;
	ipAddress?: string;
	userAgent?: string;
	nowIso?: string;
}

export interface SikesraRequestContext {
	requestId: string;
	tenantId: string;
	siteId: string;
	userId: string;
	roles: readonly string[];
	permissions: readonly string[];
	subjectAttributes: Record<string, unknown>;
	regionScope: SikesraRegionScope;
	ipAddress?: string;
	userAgent?: string;
	nowIso: string;
}

export function buildTrustedRequestContext(
	input: SikesraTrustedContextInput,
): SikesraRequestContext {
	return {
		requestId: input.requestId,
		tenantId: input.tenantId,
		siteId: input.siteId,
		userId: input.userId,
		roles: Object.freeze([...input.roles]),
		permissions: Object.freeze([...input.permissions]),
		subjectAttributes: input.subjectAttributes ?? {},
		regionScope: input.regionScope ?? {},
		ipAddress: input.ipAddress,
		userAgent: input.userAgent,
		nowIso: input.nowIso ?? new Date().toISOString(),
	};
}
