// SIKESRA Benefit/Service History CRUD Service
// Source: docs/sikesra/03_data_model.md, migration 0011

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { writeAuditEvent, AUDIT_ACTIONS } from "./audit";

const BENEFIT_TABLE = "awcms_sikesra_benefit_service_history";

export interface BenefitHistoryInput {
  entityId: string;
  benefitType: string;
  benefitName?: string;
  sourceInstitution?: string;
  year?: number;
  amountValue?: number;
  amountUnit?: string;
  notes?: string;
}

export interface BenefitHistorySummary {
  id: string;
  entityId: string;
  benefitType: string;
  benefitName?: string;
  sourceInstitution?: string;
  year?: number;
  amountValue?: number;
  amountUnit?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function listEntityBenefits(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<BenefitHistorySummary[]> {
  const result = await db.prepare(
    `SELECT id, entity_id, benefit_type, benefit_name, source_institution, year, amount_value, amount_unit, notes, created_at, updated_at
     FROM ${BENEFIT_TABLE}
     WHERE tenant_id = ? AND site_id = ? AND entity_id = ? AND deleted_at IS NULL
     ORDER BY year DESC, created_at DESC`
  ).bind(ctx.tenantId, ctx.siteId, entityId).all<Record<string, unknown>>();

  return result.results.map((row) => ({
    id: String(row.id),
    entityId: String(row.entity_id),
    benefitType: String(row.benefit_type),
    benefitName: row.benefit_name ? String(row.benefit_name) : undefined,
    sourceInstitution: row.source_institution ? String(row.source_institution) : undefined,
    year: row.year ? Number(row.year) : undefined,
    amountValue: row.amount_value ? Number(row.amount_value) : undefined,
    amountUnit: row.amount_unit ? String(row.amount_unit) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function createBenefit(
  db: D1Binding,
  input: BenefitHistoryInput,
  ctx: SikesraRequestContext,
): Promise<{ id: string }> {
  const entityCheck = await db.prepare(
    `SELECT id FROM awcms_sikesra_entities WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(input.entityId, ctx.tenantId, ctx.siteId).first();

  if (!entityCheck) throw new Error("ENTITY_NOT_FOUND");

  const id = `benefit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO ${BENEFIT_TABLE}
     (id, tenant_id, site_id, entity_id, benefit_type, benefit_name, source_institution, year, amount_value, amount_unit, notes, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    ctx.tenantId,
    ctx.siteId,
    input.entityId,
    input.benefitType,
    input.benefitName ?? null,
    input.sourceInstitution ?? null,
    input.year ?? null,
    input.amountValue ?? null,
    input.amountUnit ?? null,
    input.notes ?? null,
    ctx.userId,
    ctx.userId,
    now,
    now,
  ).run();

  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    actorId: ctx.userId,
    actorRole: ctx.roles[0],
    action: AUDIT_ACTIONS.BENEFIT_CREATE,
    resourceType: "benefit",
    resourceId: id,
    requestId: ctx.requestId,
    success: true,
    reason: `Create benefit record for entity ${input.entityId}`,
    after: {
      entityId: input.entityId,
      benefitType: input.benefitType,
      benefitName: input.benefitName,
      year: input.year,
    },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  }, ctx);

  return { id };
}

export async function updateBenefit(
  db: D1Binding,
  benefitId: string,
  input: Partial<BenefitHistoryInput>,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await db.prepare(
    `SELECT * FROM ${BENEFIT_TABLE} WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(benefitId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!existing) throw new Error("BENEFIT_NOT_FOUND");

  const now = new Date().toISOString();
  const updates: string[] = [];
  const params: unknown[] = [];

  if (input.benefitType !== undefined) {
    updates.push("benefit_type = ?");
    params.push(input.benefitType);
  }
  if (input.benefitName !== undefined) {
    updates.push("benefit_name = ?");
    params.push(input.benefitName ?? null);
  }
  if (input.sourceInstitution !== undefined) {
    updates.push("source_institution = ?");
    params.push(input.sourceInstitution ?? null);
  }
  if (input.year !== undefined) {
    updates.push("year = ?");
    params.push(input.year);
  }
  if (input.amountValue !== undefined) {
    updates.push("amount_value = ?");
    params.push(input.amountValue);
  }
  if (input.amountUnit !== undefined) {
    updates.push("amount_unit = ?");
    params.push(input.amountUnit ?? null);
  }
  if (input.notes !== undefined) {
    updates.push("notes = ?");
    params.push(input.notes ?? null);
  }

  if (updates.length === 0) return;

  updates.push("updated_by = ?", "updated_at = ?");
  params.push(ctx.userId, now);

  await db.prepare(
    `UPDATE ${BENEFIT_TABLE} SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...params, benefitId).run();

  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    actorId: ctx.userId,
    actorRole: ctx.roles[0],
    action: AUDIT_ACTIONS.BENEFIT_UPDATE,
    resourceType: "benefit",
    resourceId: benefitId,
    requestId: ctx.requestId,
    success: true,
    reason: `Update benefit record ${benefitId}`,
    before: {
      benefitType: existing.benefit_type,
      benefitName: existing.benefit_name,
      year: existing.year,
    },
    after: {
      benefitType: input.benefitType ?? existing.benefit_type,
      benefitName: input.benefitName ?? existing.benefit_name,
      year: input.year ?? existing.year,
    },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  }, ctx);
}

export async function deleteBenefit(
  db: D1Binding,
  benefitId: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await db.prepare(
    `SELECT id FROM ${BENEFIT_TABLE} WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(benefitId, ctx.tenantId, ctx.siteId).first();

  if (!existing) throw new Error("BENEFIT_NOT_FOUND");

  await db.prepare(
    `UPDATE ${BENEFIT_TABLE} SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`
  ).bind(ctx.userId, benefitId).run();

  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    actorId: ctx.userId,
    actorRole: ctx.roles[0],
    action: AUDIT_ACTIONS.BENEFIT_DELETE,
    resourceType: "benefit",
    resourceId: benefitId,
    requestId: ctx.requestId,
    success: true,
    reason: `Delete benefit record ${benefitId}`,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  }, ctx);
}
