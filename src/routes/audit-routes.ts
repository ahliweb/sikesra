// SIKESRA Audit Route Handlers
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { listAuditLogs, getAuditLogDetail, redactAuditValues } from "../repositories/audit-repository";
import { withHandlerSequence, buildContextFromEmDash, type EmDashRouteContext, type RouteHandlerInput } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { writeAuditEvent, AUDIT_ACTIONS } from "../services/audit";

// GET /audit
export const auditListHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const url = new URL(input.request.url);
  return listAuditLogs(db, {
    action: url.searchParams.get("action") ?? undefined,
    actor: url.searchParams.get("actor") ?? undefined,
    resourceType: url.searchParams.get("resource_type") ?? undefined,
    resourceId: url.searchParams.get("resource_id") ?? undefined,
    fromDate: url.searchParams.get("from_date") ?? undefined,
    toDate: url.searchParams.get("to_date") ?? undefined,
    limit: Number(url.searchParams.get("limit")) || 50,
    offset: Number(url.searchParams.get("offset")) || 0,
  }, ctx);
});

// GET /audit/:id
export const auditDetailHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const url = new URL(input.request.url);
  const parts = url.pathname.split("/");
  const auditId = parts[parts.indexOf("audit") + 1];
  
  if (!auditId) throw new Error("AUDIT_ID_REQUIRED");

  const detail = await getAuditLogDetail(db, auditId, ctx);
  if (!detail) throw new Error("AUDIT_NOT_FOUND");

  const canReveal = ctx.permissions.includes(SIKESRA_PERMISSIONS.AUDIT_READ);
  
  return {
    ...detail,
    beforeJson: await redactAuditValues(detail.beforeJson, canReveal),
    afterJson: await redactAuditValues(detail.afterJson, canReveal),
  };
});

// POST /audit/export
export const auditExportHandler = async (routeCtx: EmDashRouteContext<{ reason: string; filters?: Record<string, unknown> }>) => {
  const db = routeCtx.env?.SIKESRA_DB;
  if (!db) throw new Error("DB_UNAVAILABLE");

  const ctx = buildContextFromEmDash(routeCtx);
  
  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.AUDIT_READ)) {
    throw new Error("AUDIT_EXPORT_PERMISSION_DENIED");
  }

  const input = routeCtx.input;
  if (!input?.reason || !input.reason.trim()) {
    throw new Error("AUDIT_EXPORT_REASON_REQUIRED");
  }

  const filters = input.filters ?? {};
  const conditions = ["tenant_id = ?", "site_id = ?"];
  const bindParams: unknown[] = [ctx.tenantId, ctx.siteId];

  if (filters.actor) { conditions.push("actor_id = ?"); bindParams.push(filters.actor); }
  if (filters.action) { conditions.push("action = ?"); bindParams.push(filters.action); }
  if (filters.resourceType) { conditions.push("resource_type = ?"); bindParams.push(filters.resourceType); }
  if (filters.fromDate) { conditions.push("created_at >= ?"); bindParams.push(filters.fromDate); }
  if (filters.toDate) { conditions.push("created_at <= ?"); bindParams.push(filters.toDate); }

  const where = conditions.join(" AND ");
  const result = await db.prepare(
    `SELECT * FROM awcms_sikesra_audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT 1000`
  ).bind(...bindParams).all<Record<string, unknown>>();

  const csvRows = [
    "id,actor_id,action,resource_type,resource_id,request_id,success,reason,created_at",
    ...result.results.map((row) => {
      const values = [
        row.id,
        row.actor_id,
        row.action,
        row.resource_type,
        row.resource_id,
        row.request_id,
        row.success,
        row.reason,
        row.created_at,
      ].map((v) => {
        if (v == null) return "";
        const str = String(v);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      return values.join(",");
    }),
  ];

  const csvContent = csvRows.join("\n");

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.EXPORT_CREATE,
      resourceType: "audit_export",
      resourceId: `audit_export_${Date.now()}`,
      requestId: ctx.requestId,
      success: true,
      reason: input.reason.trim(),
      after: {
        rowCount: result.results.length,
        filters,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="audit_export_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
};
