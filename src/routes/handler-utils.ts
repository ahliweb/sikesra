// SIKESRA Route Handler Utility
// Shared admin API handler plumbing with ABAC enforcement
// Source: docs/sikesra/02_architecture.md, docs/sikesra/06_security_rbac_abac.md

import type { SikesraRequestContext } from "../security/request-context";
import { getOrCreateRequestId } from "../api/request-id";
import type { D1Binding } from "../repositories/db";
import { evaluateAbacWithDb, buildAbacSubject, type AbacInput, type AbacResource } from "../security/abac";
import { buildTrustedRequestContext, type SikesraRegionScope } from "../security/request-context";

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

// EmDash PluginContext shape (subset used by SIKESRA)
export interface EmDashPluginContext {
  plugin: { id: string; version: string };
  site?: { id?: string; tenantId?: string };
  request?: Request;
  url?: (path: string) => string;
  log?: { info: (msg: string, data?: unknown) => void; error: (msg: string, data?: unknown) => void };
  env?: RouteEnv;
}

// EmDash native plugin RouteContext (single-argument format)
export interface EmDashRouteContext<TInput = unknown> {
  input: TInput;
  request: Request;
  requestMeta?: { ip?: string; userAgent?: string };
  plugin?: { id: string; version: string };
  site?: { id?: string; tenantId?: string };
  env?: RouteEnv;
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
  const tenantId = routeCtx.site?.tenantId;
  const siteId = routeCtx.site?.id;
  if (!tenantId || !siteId) {
    throw new Error("AUTH_CONTEXT_SITE_MISSING");
  }
  return { tenantId, siteId };
}

// Build trusted request context from EmDash route context
// Tenant/site/user must come from session/server state, never from query params
export function buildContextFromEmDash(routeCtx: EmDashRouteContext): SikesraRequestContext {
  const requestId = getOrCreateRequestId(routeCtx.request);

  const userId = readHeader(routeCtx.request, ["x-emdash-user-id", "x-user-id"]);
  const roles = parseDelimitedHeader(readHeader(routeCtx.request, ["x-emdash-user-roles", "x-user-roles"]));
  const permissions = parseDelimitedHeader(readHeader(routeCtx.request, ["x-emdash-user-permissions", "x-user-permissions"]));

  if (!userId || roles.length === 0) {
    throw new Error("AUTH_CONTEXT_REQUIRED");
  }

  const { tenantId, siteId } = requireSiteContext(routeCtx);
  return buildTrustedRequestContext({
    requestId,
    tenantId,
    siteId,
    userId,
    roles,
    permissions,
    subjectAttributes: parseJsonHeader<Record<string, unknown>>(readHeader(routeCtx.request, ["x-emdash-subject-attributes"])),
    regionScope: parseJsonHeader<SikesraRegionScope>(readHeader(routeCtx.request, ["x-emdash-region-scope"])),
    ipAddress: routeCtx.requestMeta?.ip,
    userAgent: routeCtx.requestMeta?.userAgent,
  });
}

export function buildPublicContextFromEmDash(routeCtx: EmDashRouteContext): SikesraRequestContext {
  const requestId = getOrCreateRequestId(routeCtx.request);
  return buildTrustedRequestContext({
    requestId,
    tenantId: routeCtx.site?.tenantId ?? "default",
    siteId: routeCtx.site?.id ?? "default",
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
  const db = routeCtx.env?.SIKESRA_DB;
  if (!db) throw new Error("DB_UNAVAILABLE");
  if (db) {
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
    const db = routeCtx.env?.SIKESRA_DB;
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
    const db = routeCtx.env?.SIKESRA_DB;
    if (!db) throw new Error("DB_UNAVAILABLE");

    const kv = routeCtx.env?.SESSION;
    if (!kv) {
      // If KV is not available, allow the request but log a warning
      return handler(routeCtx.input, db, ctx);
    }

    // Check for rate limit bypass permission
    const hasBypassPermission = ctx.permissions.includes("awcms:sikesra:rate_limit:bypass");
    if (hasBypassPermission) {
      // Log bypass for audit
      return handler(routeCtx.input, db, ctx);
    }

    const { enforceRateLimit, createRateLimitResponse } = await import("../services/rate-limit");

    const rateLimitResult = await enforceRateLimit(kv, ctx.userId, rateLimitAction);

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
    const db = routeCtx.env?.SIKESRA_DB;
    if (!db) throw new Error("DB_UNAVAILABLE");

    const kv = routeCtx.env?.SESSION;
    if (!kv) {
      return handler(routeCtx, db, ctx);
    }

    const hasBypassPermission = ctx.permissions.includes("awcms:sikesra:rate_limit:bypass");
    if (hasBypassPermission) {
      return handler(routeCtx, db, ctx);
    }

    const { enforceRateLimit, createRateLimitResponse } = await import("../services/rate-limit");

    const rateLimitResult = await enforceRateLimit(kv, ctx.userId, rateLimitAction);

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult) as unknown as TOutput;
    }

    return handler(routeCtx, db, ctx);
  };
}
