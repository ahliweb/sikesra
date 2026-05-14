import { SIKESRA_PERMISSION_LIST, SIKESRA_PERMISSIONS } from "./permissions.js";

export const SIKESRA_REQUEST_CONTEXT_HEADER = "x-emdash-plugin-context";
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_SITE_ID = "main";

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

interface InjectedRequestContextPayload {
	requestId?: unknown;
	tenantId?: unknown;
	siteId?: unknown;
	userId?: unknown;
	role?: unknown;
	roleName?: unknown;
	regionScope?: unknown;
	subjectAttributes?: unknown;
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

export function buildRequestContextFromRoute(input: {
	request: Request;
	requestMeta?: { ip?: string | null; userAgent?: string | null };
}): SikesraRequestContext {
	const payload = readInjectedContext(input.request);
	const role = typeof payload?.role === "number" ? payload.role : null;
	const roleName = typeof payload?.roleName === "string" ? payload.roleName : undefined;
	const userId = typeof payload?.userId === "string" && payload.userId ? payload.userId : "public";

	return buildTrustedRequestContext({
		requestId:
			typeof payload?.requestId === "string" && payload.requestId
				? payload.requestId
				: crypto.randomUUID(),
		tenantId:
			typeof payload?.tenantId === "string" && payload.tenantId
				? payload.tenantId
				: DEFAULT_TENANT_ID,
		siteId:
			typeof payload?.siteId === "string" && payload.siteId ? payload.siteId : DEFAULT_SITE_ID,
		userId,
		roles: buildRoleNames(roleName, role, userId),
		permissions: permissionsForRole(role),
		subjectAttributes: isPlainRecord(payload?.subjectAttributes) ? payload.subjectAttributes : {},
		regionScope: sanitizeRegionScope(payload?.regionScope),
		ipAddress: input.requestMeta?.ip ?? undefined,
		userAgent: input.requestMeta?.userAgent ?? undefined,
	});
}

function readInjectedContext(request: Request): InjectedRequestContextPayload | null {
	const encoded = request.headers.get(SIKESRA_REQUEST_CONTEXT_HEADER);
	if (!encoded) return null;
	try {
		const parsed = JSON.parse(decodeURIComponent(encoded)) as unknown;
		return isPlainRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function buildRoleNames(
	roleName: string | undefined,
	role: number | null,
	userId: string,
): string[] {
	if (userId === "public") return ["public"];
	if (roleName) return [roleName.toLowerCase()];
	if (role !== null) return [`role:${role}`];
	return ["authenticated"];
}

function permissionsForRole(role: number | null): string[] {
	if (role === null) return [];
	if (role >= 50) return [...SIKESRA_PERMISSION_LIST];
	if (role >= 40) {
		return [
			SIKESRA_PERMISSIONS.DASHBOARD_READ,
			SIKESRA_PERMISSIONS.ENTITY_READ,
			SIKESRA_PERMISSIONS.VERIFICATION_VERIFY,
			SIKESRA_PERMISSIONS.DOCUMENT_PRIVATE_DOWNLOAD,
			SIKESRA_PERMISSIONS.IMPORT_READ,
			SIKESRA_PERMISSIONS.DUPLICATE_READ,
			SIKESRA_PERMISSIONS.COMPLETENESS_READ,
			SIKESRA_PERMISSIONS.EXPORT_CREATE,
			SIKESRA_PERMISSIONS.REGION_READ,
			SIKESRA_PERMISSIONS.ATTRIBUTE_READ,
			SIKESRA_PERMISSIONS.AUDIT_READ,
			SIKESRA_PERMISSIONS.SETTINGS_READ,
		];
	}
	return [];
}

function sanitizeRegionScope(value: unknown): SikesraRegionScope {
	if (!isPlainRecord(value)) return {};
	return {
		provinceCode: typeof value.provinceCode === "string" ? value.provinceCode : undefined,
		regencyCode: typeof value.regencyCode === "string" ? value.regencyCode : undefined,
		districtCodes: toStringArray(value.districtCodes),
		villageCodes: toStringArray(value.villageCodes),
		localRegionIds: toStringArray(value.localRegionIds),
	};
}

function toStringArray(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const items = value.filter((item): item is string => typeof item === "string");
	return items.length > 0 ? items : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
