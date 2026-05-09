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
  roles: string[];
  permissions: string[];
  subjectAttributes: Record<string, unknown>;
  regionScope: SikesraRegionScope;
  ipAddress?: string;
  userAgent?: string;
  nowIso: string;
}

export function buildTrustedRequestContext(input: SikesraTrustedContextInput): SikesraRequestContext {
  const roles = Object.freeze([...input.roles]);
  const permissions = Object.freeze([...input.permissions]);
  return {
    requestId: input.requestId,
    tenantId: input.tenantId,
    siteId: input.siteId,
    userId: input.userId,
    roles: roles as unknown as string[],
    permissions: permissions as unknown as string[],
    subjectAttributes: input.subjectAttributes ?? {},
    regionScope: input.regionScope ?? {},
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    nowIso: input.nowIso ?? new Date().toISOString(),
  };
}
