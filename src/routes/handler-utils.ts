// SIKESRA Route Handler Utility
// Shared admin API handler plumbing with ABAC enforcement
// Source: docs/sikesra/02_architecture.md, docs/sikesra/06_security_rbac_abac.md

import type { SikesraRequestContext } from "../security/request-context";
import { getOrCreateRequestId } from "../api/request-id";
import { ok, fail, type ApiSuccess, type ApiFailure } from "../api/envelope";
import type { D1Binding } from "../repositories/db";
import { evaluateAbacWithDb, buildAbacSubject, type AbacInput, type AbacResource } from "../security/abac";

export interface RouteEnv {
  SIKESRA_DB: D1Binding;
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

// Build trusted request context from EmDash route context
// Tenant/site/user must come from session/server state, never from query params
export function buildContextFromEmDash(routeCtx: EmDashRouteContext): SikesraRequestContext {
  const requestId = getOrCreateRequestId(routeCtx.request);
  return {
    requestId,
    tenantId: routeCtx.site?.tenantId ?? "default",
    siteId: routeCtx.site?.id ?? "default",
    userId: "stub-user", // TODO: derive from EmDash session/auth JWT
    roles: ["admin"],    // TODO: derive from EmDash session
    permissions: [],     // TODO: derive from EmDash permission system
    subjectAttributes: {},
    regionScope: {},     // TODO: derive from user scope assignments
    ipAddress: routeCtx.requestMeta?.ip,
    userAgent: routeCtx.requestMeta?.userAgent,
    nowIso: new Date().toISOString(),
  };
}

// Full admin API handler sequence with ABAC enforcement
// Steps 1-11 from docs/sikesra/02_architecture.md
export async function handleAdminRequest<TInput, TOutput>(
  routeCtx: EmDashRouteContext<TInput>,
  resource: AbacResource,
  action: string,
  handler: (input: TInput, db: D1Binding, ctx: SikesraRequestContext) => Promise<TOutput>,
): Promise<ApiSuccess<TOutput> | ApiFailure> {
  // 1. Generate/read requestId
  const ctx = buildContextFromEmDash(routeCtx);
  const { requestId } = ctx;

  try {
    // 2. Build trusted context (done above)
    // 3. Validate input (caller provides validated input via routeCtx.input)

    // 4. Enforce authentication (placeholder: always passes for stub user)
    // TODO: check EmDash session exists

    // 5. Check route RBAC permission
    // TODO: verify ctx.permissions includes required action permission

    // 6. Load minimal resource metadata (caller provides via resource param)

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
        // 10. Audit denial
        // TODO: writeAuditEvent({ action: AUDIT_ACTIONS.ABAC_DENIED, ... })
        return fail(requestId, "ABAC_DENIED", `Access denied by policy: ${abacResult.matchedPolicyName ?? abacResult.reasonCode}`);
      }
    }

    // 8. Execute service method
    const data = await handler(routeCtx.input, db!, ctx);

    // 9. Serialize through masking layer
    // TODO: apply masking based on ctx permissions and sensitivity

    // 10. Write audit event if required
    // TODO: audit success for high-risk actions

    // 11. Return envelope
    return ok(requestId, data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return fail(requestId, "INTERNAL_ERROR", message);
  }
}

// Lightweight wrapper for handlers that don't need ABAC evaluation
export function withHandlerSequence<TInput, TOutput>(
  handler: (input: TInput, db: D1Binding, ctx: SikesraRequestContext) => Promise<TOutput>,
) {
  return async (routeCtx: EmDashRouteContext<TInput>): Promise<ApiSuccess<TOutput> | ApiFailure> => {
    const ctx = buildContextFromEmDash(routeCtx);
    try {
      const db = routeCtx.env?.SIKESRA_DB!;
      const data = await handler(routeCtx.input, db, ctx);
      return ok(ctx.requestId, data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      return fail(ctx.requestId, "INTERNAL_ERROR", message);
    }
  };
}
