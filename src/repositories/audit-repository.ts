// SIKESRA Audit Repository
// D1 SQL for audit log persistence
// Source: docs/sikesra/03_data_model.md, docs/sikesra/06_security_rbac_abac.md

import type { D1Binding } from "./db";
import type { SikesraRequestContext } from "../security/request-context";
import type { AuditEventInput } from "../services/audit";

const TABLE = "awcms_sikesra_audit_logs";

export async function writeAuditLog(
  db: D1Binding,
  input: AuditEventInput,
  ctx: SikesraRequestContext,
): Promise<string> {
  const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sql = `INSERT INTO ${TABLE} (
    id, tenant_id, site_id, actor_id, actor_role, action, resource_type, resource_id,
    request_id, success, reason, before_json, after_json, ip_address, user_agent
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  await db.prepare(sql).bind(
    id, ctx.tenantId, ctx.siteId,
    input.actorId ?? null, input.actorRole ?? null,
    input.action, input.resourceType ?? null, input.resourceId ?? null,
    input.requestId ?? null, input.success ?? true ? 1 : 0,
    input.reason ?? null,
    input.before ? JSON.stringify(input.before) : null,
    input.after ? JSON.stringify(input.after) : null,
    input.ipAddress ?? null, input.userAgent ?? null,
  ).run();

  return id;
}

export interface AuditListParams {
  actor?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditLogs(
  db: D1Binding,
  params: AuditListParams,
  ctx: SikesraRequestContext,
): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const conditions = ["tenant_id = ?", "site_id = ?"];
  const bindParams: unknown[] = [ctx.tenantId, ctx.siteId];

  if (params.actor) { conditions.push("actor_id = ?"); bindParams.push(params.actor); }
  if (params.action) { conditions.push("action = ?"); bindParams.push(params.action); }
  if (params.resourceType) { conditions.push("resource_type = ?"); bindParams.push(params.resourceType); }
  if (params.resourceId) { conditions.push("resource_id = ?"); bindParams.push(params.resourceId); }
  if (params.fromDate) { conditions.push("created_at >= ?"); bindParams.push(params.fromDate); }
  if (params.toDate) { conditions.push("created_at <= ?"); bindParams.push(params.toDate); }

  const where = conditions.join(" AND ");
  const countResult = await db.prepare(`SELECT COUNT(*) as cnt FROM ${TABLE} WHERE ${where}`).bind(...bindParams).first<{ cnt: number }>();
  const total = countResult?.cnt ?? 0;

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const result = await db.prepare(
    `SELECT * FROM ${TABLE} WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ).bind(...bindParams, limit, offset).all<Record<string, unknown>>();

  return { items: result.results as Record<string, unknown>[], total };
}

export interface AuditDetailResult {
  id: string;
  tenantId: string;
  siteId: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  requestId: string | null;
  success: boolean;
  reason: string | null;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export async function getAuditLogDetail(
  db: D1Binding,
  auditId: string,
  ctx: SikesraRequestContext,
): Promise<AuditDetailResult | null> {
  const result = await db.prepare(
    `SELECT * FROM ${TABLE} WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(auditId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!result) return null;

  let beforeJson: Record<string, unknown> | null = null;
  let afterJson: Record<string, unknown> | null = null;

  if (result.before_json) {
    try {
      beforeJson = JSON.parse(result.before_json as string);
    } catch {
      beforeJson = null;
    }
  }

  if (result.after_json) {
    try {
      afterJson = JSON.parse(result.after_json as string);
    } catch {
      afterJson = null;
    }
  }

  return {
    id: result.id as string,
    tenantId: result.tenant_id as string,
    siteId: result.site_id as string,
    actorId: result.actor_id as string | null,
    actorRole: result.actor_role as string | null,
    action: result.action as string,
    resourceType: result.resource_type as string | null,
    resourceId: result.resource_id as string | null,
    requestId: result.request_id as string | null,
    success: Number(result.success) === 1,
    reason: result.reason as string | null,
    beforeJson,
    afterJson,
    ipAddress: result.ip_address as string | null,
    userAgent: result.user_agent as string | null,
    createdAt: result.created_at as string,
  };
}

export async function redactAuditValues(
  data: Record<string, unknown> | null,
  canReveal: boolean,
): Promise<Record<string, unknown> | null> {
  if (!data) return null;
  if (canReveal) return data;

  const redacted: Record<string, unknown> = {};
  const sensitiveKeys = ["nik", "kia", "phone", "email", "address", "guardian", "disability", "hash", "secret", "password", "token"];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive));
    redacted[key] = isSensitive ? "[REDACTED]" : value;
  }

  return redacted;
}
