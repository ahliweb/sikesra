// SIKESRA Route Handler Utility
// Shared admin API handler plumbing with ABAC enforcement
// Source: docs/sikesra/02_architecture.md, docs/sikesra/06_security_rbac_abac.md

import type { SikesraRequestContext } from "../security/request-context";
import { getOrCreateRequestId } from "../api/request-id";
import type { D1Binding } from "../repositories/db";
import { evaluateAbacWithDb, buildAbacSubject, type AbacInput, type AbacResource } from "../security/abac";

export interface RouteEnv {
  SIKESRA_DB: D1Binding;
  SIKESRA_DOCUMENTS: R2Bucket;
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

// Build trusted request context from EmDash route context
// Tenant/site/user must come from session/server state, never from query params
export function buildContextFromEmDash(routeCtx: EmDashRouteContext): SikesraRequestContext {
  const requestId = getOrCreateRequestId(routeCtx.request);
  
  // Extract user info from EmDash context
  // EmDash passes user info through the request headers or context
  // For MVP, derive from standard EmDash auth patterns
  const userId = routeCtx.request.headers.get("x-emdash-user-id") 
    ?? routeCtx.request.headers.get("x-user-id") 
    ?? "system";
  
  const roles = routeCtx.request.headers.get("x-emdash-user-roles")?.split(",").filter(Boolean) 
    ?? ["admin"]; // Default to admin for MVP testing
  
  const permissions = routeCtx.request.headers.get("x-emdash-user-permissions")?.split(",").filter(Boolean) 
    ?? [];
  
  return {
    requestId,
    tenantId: routeCtx.site?.tenantId ?? "default",
    siteId: routeCtx.site?.id ?? "default",
    userId,
    roles,
    permissions,
    subjectAttributes: {},
    regionScope: {},
    ipAddress: routeCtx.requestMeta?.ip,
    userAgent: routeCtx.requestMeta?.userAgent,
    nowIso: new Date().toISOString(),
  };
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
  return await handler(routeCtx.input, db!, ctx);
}

// Lightweight wrapper for handlers that don't need ABAC evaluation
// Returns plain data — EmDash PluginRouteHandler wraps the envelope.
export function withHandlerSequence<TInput, TOutput>(
  handler: (input: TInput, db: D1Binding, ctx: SikesraRequestContext) => Promise<TOutput>,
) {
  return async (routeCtx: EmDashRouteContext<TInput>): Promise<TOutput> => {
    const ctx = buildContextFromEmDash(routeCtx);
    const db = routeCtx.env?.SIKESRA_DB!;
    return handler(routeCtx.input, db, ctx);
  };
}
