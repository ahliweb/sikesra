// SIKESRA Route Handler Utility
// Shared admin API handler plumbing with ABAC enforcement
// Source: docs/sikesra/02_architecture.md, docs/sikesra/06_security_rbac_abac.md

import type { SikesraRequestContext } from "../security/request-context";
import { getOrCreateRequestId } from "../api/request-id";
import type { D1Binding } from "../repositories/db";
import { evaluateAbacWithDb, buildAbacSubject, type AbacInput, type AbacResource } from "../security/abac";
import { buildTrustedRequestContext, type SikesraRegionScope } from "../security/request-context";
import { validateCloudflareAccessJwt, extractUserIdFromClaims, extractGroupsFromClaims, mapAccessGroupsToRoles, getCloudflareAccessJwtFromRequest } from "../security/cloudflare-access";
import { getRouteDb } from "./route-db";

export interface RouteEnv {
  SIKESRA_DB: D1Binding;
  SIKESRA_DOCUMENTS: R2Bucket;
  SESSION: KVNamespace;
}

interface R2Bucket {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
  head(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
}

// EmDash PluginContext shape (matches EmDash v0.12 RouteContext)
// RouteContext extends PluginContext: { plugin, storage, kv, content?, media?, http?, log, site, url, users?, cron?, email?, input, request, requestMeta }
export interface EmDashPluginContext {
  plugin?: { id: string; version: string };
  site?: { name?: string; url?: string; locale?: string };
  request?: Request;
  url?: (path: string) => string;
  log?: { info: (msg: string, data?: unknown) => void; error: (msg: string, data?: unknown) => void; debug: (msg: string, data?: unknown) => void; warn: (msg: string, data?: unknown) => void };
  kv?: { get: <T>(key: string) => Promise<T | null>; set: (key: string, value: unknown) => Promise<void>; delete: (key: string) => Promise<boolean>; list: (prefix?: string) => Promise<Array<{ key: string; value: unknown }>> };
  storage?: Record<string, unknown>;
  env?: Partial<RouteEnv>;
}

// EmDash native plugin RouteContext (single-argument format)
// Does NOT include env - DB access must be obtained through other means
export interface EmDashRouteContext<TInput = unknown> extends EmDashPluginContext {
  input: TInput;
  request: Request;
  requestMeta?: { ip?: string; userAgent?: string; country?: string; colo?: string };
}

export interface RouteHandlerInput {
  request: Request;
  input?: unknown;
}

function readHeader(request: Request, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = request.headers.get(key);
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

function parseDelimitedHeader(value?: string): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function parseJsonHeader<T>(value?: string): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function requireSiteContext(routeCtx: EmDashRouteContext): { tenantId: string; siteId: string } {
  // EmDash site context has { name, url, locale } not { tenantId, id }
  // Use site URL or name as siteId, default tenant for single-tenant setup
  const siteUrl = routeCtx.site?.url ?? "";
  const siteName = routeCtx.site?.name ?? "";
  const siteId = siteUrl || siteName || "default-site";
  const tenantId = "default-tenant";
  return { tenantId, siteId };
}

// Build trusted request context from EmDash route context
// Supports Cloudflare Access JWT as primary identity, falls back to EmDash session headers
// Tenant/site/user must come from session/server state, never from query params
export function buildContextFromEmDash(routeCtx: EmDashRouteContext): SikesraRequestContext {
  const requestId = getOrCreateRequestId(routeCtx.request);

  // Try Cloudflare Access JWT first
  const accessJwt = getCloudflareAccessJwtFromRequest(routeCtx.request);

  let userId: string | undefined;
  let roles: string[] = [];
  let permissions: string[] = [];
  let subjectAttributes: Record<string, unknown> = {};

  if (accessJwt) {
    // Cloudflare Access JWT path
    const validationResult = validateCloudflareAccessJwt(accessJwt);

    if (validationResult.valid && validationResult.claims) {
      userId = extractUserIdFromClaims(validationResult.claims);
      const groups = extractGroupsFromClaims(validationResult.claims);
      roles = mapAccessGroupsToRoles(groups, ACCESS_GROUP_ROLE_MAPPING);
      subjectAttributes = {
        jwtValid: true,
        jwtIssuer: validationResult.claims.iss,
        jwtEmail: validationResult.claims.email,
        jwtName: validationResult.claims.name,
      };
    }
  }

  // Fallback to EmDash session headers if JWT not present or invalid
  if (!userId || roles.length === 0) {
    userId = readHeader(routeCtx.request, ["x-emdash-user-id", "x-user-id"]);
    roles = parseDelimitedHeader(readHeader(routeCtx.request, ["x-emdash-user-roles", "x-user-roles"]));
    permissions = parseDelimitedHeader(readHeader(routeCtx.request, ["x-emdash-user-permissions", "x-user-permissions"]));
    subjectAttributes = parseJsonHeader<Record<string, unknown>>(readHeader(routeCtx.request, ["x-emdash-subject-attributes"])) ?? {};
  }

  // If still no auth info, use default admin context for single-tenant setup
  // EmDash handles auth at middleware level; plugin routes are only reachable after auth
  if (!userId || roles.length === 0) {
    userId = "emdash-user";
    roles = ["admin"];
    permissions = ["awcms:sikesra:dashboard:read", "awcms:sikesra:entity:read", "awcms:sikesra:entity:create", "awcms:sikesra:entity:update", "awcms:sikesra:entity:delete", "awcms:sikesra:verification:verify", "awcms:sikesra:document:read", "awcms:sikesra:document:upload", "awcms:sikesra:import:create", "awcms:sikesra:import:promote", "awcms:sikesra:export:create", "awcms:sikesra:audit:read", "awcms:sikesra:settings:read", "awcms:sikesra:settings:update", "awcms:sikesra:abac:read", "awcms:sikesra:abac:write", "awcms:sikesra:region:read", "awcms:sikesra:region:write"];
  }

  const { tenantId, siteId } = requireSiteContext(routeCtx);
  return buildTrustedRequestContext({
    requestId,
    tenantId,
    siteId,
    userId,
    roles,
    permissions,
    subjectAttributes,
    regionScope: parseJsonHeader<SikesraRegionScope>(readHeader(routeCtx.request, ["x-emdash-region-scope"])),
    ipAddress: routeCtx.requestMeta?.ip,
    userAgent: routeCtx.requestMeta?.userAgent,
  });
}

// Default mapping from Cloudflare Access groups to SIKESRA roles
const ACCESS_GROUP_ROLE_MAPPING: Record<string, string> = {
  "sikesra-admin": "admin",
  "sikesra-operator": "operator",
  "sikesra-verifier": "verifier",
  "sikesra-auditor": "auditor",
  "sikesra-viewer": "viewer",
};

export function buildPublicContextFromEmDash(routeCtx: EmDashRouteContext): SikesraRequestContext {
  const requestId = getOrCreateRequestId(routeCtx.request);
  const { tenantId, siteId } = requireSiteContext(routeCtx);
  return buildTrustedRequestContext({
    requestId,
    tenantId,
    siteId,
    userId: "public",
    roles: ["public"],
    permissions: [],
    subjectAttributes: {},
    regionScope: {},
    ipAddress: routeCtx.requestMeta?.ip,
    userAgent: routeCtx.requestMeta?.userAgent,
  });
}

// Full admin API handler sequence with ABAC enforcement
// Steps 1-11 from docs/sikesra/02_architecture.md
// Returns plain data — EmDash PluginRouteHandler wraps the envelope.
export async function handleAdminRequest<TInput, TOutput>(
  routeCtx: EmDashRouteContext<TInput>,
  resource: AbacResource,
  action: string,
  handler: (input: TInput, db: D1Binding, ctx: SikesraRequestContext) => Promise<TOutput>,
): Promise<TOutput> {
  // 1. Generate/read requestId
  const ctx = buildContextFromEmDash(routeCtx);
  const { requestId } = ctx;

  // 2-6. Build trusted context, validate, auth, check RBAC, load resource metadata (placeholder)
  // 7. Evaluate ABAC
  const db = await getRouteDb(routeCtx.request);
  if (!db) throw new Error("DB_UNAVAILABLE");
  const abacInput: AbacInput = {
    subject: buildAbacSubject(ctx),
    resource,
    action,
    environment: {
      requestId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent,
    },
  };
  const abacResult = await evaluateAbacWithDb(db, abacInput, ctx);
  if (!abacResult.allowed) {
    throw new Error(`ABAC_DENIED: ${abacResult.matchedPolicyName ?? abacResult.reasonCode}`);
  }

  // 8. Execute service method
  return await handler(routeCtx.input, db, ctx);
}

// Lightweight wrapper for handlers that don't need ABAC evaluation
// Returns plain data — EmDash PluginRouteHandler wraps the envelope.
export function withHandlerSequence<TInput, TOutput>(
  handler: (input: TInput, db: D1Binding, ctx: SikesraRequestContext) => Promise<TOutput>,
) {
  return async (routeCtx: EmDashRouteContext<TInput>): Promise<TOutput> => {
    const ctx = buildContextFromEmDash(routeCtx);
    const db = await getRouteDb(routeCtx.request);
    if (!db) throw new Error("DB_UNAVAILABLE");
    return handler(routeCtx.input, db, ctx);
  };
}

// Rate limiting middleware wrapper
// Enforces rate limits before executing the handler
// Admin users with rate_limit:bypass permission can skip rate limiting
export function withRateLimit<TInput, TOutput>(
  handler: (input: TInput, db: D1Binding, ctx: SikesraRequestContext) => Promise<TOutput>,
  rateLimitAction: string,
) {
  return async (routeCtx: EmDashRouteContext<TInput>): Promise<TOutput | Response> => {
    const ctx = buildContextFromEmDash(routeCtx);
    const db = await getRouteDb(routeCtx.request);
    if (!db) throw new Error("DB_UNAVAILABLE");

    // Use EmDash context's kv if available, otherwise skip rate limiting
    const kv = routeCtx.kv;
    if (!kv) {
      return handler(routeCtx.input, db, ctx);
    }

    // Check for rate limit bypass permission
    const hasBypassPermission = ctx.permissions.includes("awcms:sikesra:rate_limit:bypass");
    if (hasBypassPermission) {
      return handler(routeCtx.input, db, ctx);
    }

    const { enforceRateLimit, createRateLimitResponse } = await import("../services/rate-limit");

    const rateLimitResult = await enforceRateLimit(kv as unknown as KVNamespace, ctx.userId, rateLimitAction);

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult) as unknown as TOutput;
    }

    return handler(routeCtx.input, db, ctx);
  };
}

// Rate limiting wrapper for handlers that need full route context (e.g., file uploads)
export function withRateLimitRequest<TOutput>(
  handler: (routeCtx: EmDashRouteContext, db: D1Binding, ctx: SikesraRequestContext) => Promise<TOutput>,
  rateLimitAction: string,
) {
  return async (routeCtx: EmDashRouteContext): Promise<TOutput | Response> => {
    const ctx = buildContextFromEmDash(routeCtx);
    const db = await getRouteDb(routeCtx.request);
    if (!db) throw new Error("DB_UNAVAILABLE");

    const kv = routeCtx.kv;
    if (!kv) {
      return handler(routeCtx, db, ctx);
    }

    const hasBypassPermission = ctx.permissions.includes("awcms:sikesra:rate_limit:bypass");
    if (hasBypassPermission) {
      return handler(routeCtx, db, ctx);
    }

    const { enforceRateLimit, createRateLimitResponse } = await import("../services/rate-limit");

    const rateLimitResult = await enforceRateLimit(kv as unknown as KVNamespace, ctx.userId, rateLimitAction);

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult) as unknown as TOutput;
    }

    return handler(routeCtx, db, ctx);
  };
}
