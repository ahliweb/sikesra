// SIKESRA Verification Repository
// D1 SQL for verification events
// Source: docs/sikesra/03_data_model.md

import type { D1Binding } from "./db";
import type { SikesraRequestContext } from "../security/request-context";
import type { VerificationEvent, VerificationLevel, VerificationAction } from "../services/verification";

const TABLE = "awcms_sikesra_verification_events";

export async function writeVerificationEvent(
  db: D1Binding,
  input: {
    id: string;
    entityId: string;
    actorId: string;
    actorRole: string;
    verificationLevel: VerificationLevel;
    action: VerificationAction;
    previousStatus: string;
    nextStatus: string;
    note?: string;
    requestId: string;
  },
  ctx: SikesraRequestContext,
): Promise<void> {
  const sql = `INSERT INTO ${TABLE} (
    id, tenant_id, site_id, entity_id, actor_id, actor_role,
    verification_level, action, previous_status, next_status, note, request_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  await db.prepare(sql).bind(
    input.id, ctx.tenantId, ctx.siteId, input.entityId, input.actorId, input.actorRole,
    input.verificationLevel, input.action, input.previousStatus, input.nextStatus,
    input.note ?? null, input.requestId,
  ).run();
}

export async function getVerificationEvents(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<VerificationEvent[]> {
  const sql = `SELECT * FROM ${TABLE} WHERE entity_id = ? AND tenant_id = ? AND site_id = ? ORDER BY created_at DESC`;
  const result = await db.prepare(sql).bind(entityId, ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();
  return result.results.map((r) => ({
    id: r.id as string,
    entityId: r.entity_id as string,
    actorId: r.actor_id as string,
    actorRole: r.actor_role as string,
    verificationLevel: r.verification_level as VerificationLevel,
    action: r.action as VerificationAction,
    previousStatus: r.previous_status as string,
    nextStatus: r.next_status as string,
    note: r.note as string | undefined,
    createdAt: r.created_at as string,
  }));
}

export async function transitionEntityStatus(
  db: D1Binding,
  entityId: string,
  newStatusVerification: string,
  newStatusData: string,
  verificationLevel: string,
  verifiedBy: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  await db.prepare(
    `UPDATE awcms_sikesra_entities SET status_verification = ?, status_data = ?, verification_level = ?, verified_by = ?, verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND tenant_id = ? AND site_id = ?`,
  ).bind(newStatusVerification, newStatusData, verificationLevel, verifiedBy, entityId, ctx.tenantId, ctx.siteId).run();
}
