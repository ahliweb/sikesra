// SIKESRA Verification Service
// Queue, decisions, notes, audit
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/07_operations_sop.md

import type { D1Binding } from "../repositories/db";
import type { SikesraRequestContext } from "../security/request-context";
import { AUDIT_ACTIONS, writeAuditEvent, type AuditAction } from "./audit";
import { getVerificationEvents, transitionEntityStatus, writeVerificationEvent } from "../repositories/verification-repository";

export type VerificationAction = "submit" | "verify" | "need_revision" | "reject" | "re_submit";
export type VerificationLevel = "desa" | "kecamatan" | "kabupaten" | "opd";

export interface VerificationQueueFilters {
  level?: VerificationLevel;
  moduleCode?: string;
  regionCode?: string;
  submissionAge?: "today" | "3d" | "7d" | "30d";
  risk?: "low" | "medium" | "high";
  completeness?: "lt50" | "50to79" | "80plus";
  duplicateStatus?: string;
  limit?: number;
  offset?: number;
}

export interface VerificationQueueResult {
  items: VerificationQueueItem[];
  total: number;
}

export interface VerificationQueueItem {
  entityId: string;
  displayName: string;
  objectTypeCode: string;
  objectSubtypeCode: string;
  officialVillageCode: string;
  verificationLevel: VerificationLevel;
  currentStatus: string;
  submittedAt: string;
  completenessPercent: number;
  duplicateStatus: string;
  riskLevel: "low" | "medium" | "high";
}

export interface VerificationDecision {
  action: VerificationAction;
  note?: string;
  verificationLevel: VerificationLevel;
}

export interface VerificationEvent {
  id: string;
  entityId: string;
  actorId: string;
  actorRole: string;
  verificationLevel: VerificationLevel;
  action: VerificationAction;
  previousStatus: string;
  nextStatus: string;
  note?: string;
  createdAt: string;
}

function queueStatusesForLevel(level?: VerificationLevel): string[] {
  if (!level) return ["submitted_village", "submitted_subdistrict", "submitted_regency", "need_revision"];
  if (level === "desa") return ["submitted_village", "need_revision"];
  if (level === "kecamatan") return ["submitted_subdistrict", "need_revision"];
  return ["submitted_regency", "need_revision"];
}

function buildRiskLevel(completenessPercent: number, duplicateStatus: string): "low" | "medium" | "high" {
  if (duplicateStatus === "candidate" || duplicateStatus === "confirmed") return "high";
  if (completenessPercent < 50) return "high";
  if (completenessPercent < 80) return "medium";
  return "low";
}

function satisfiesSubmissionAge(submittedAt: string, filter?: VerificationQueueFilters["submissionAge"]): boolean {
  if (!filter) return true;
  const submittedTs = new Date(submittedAt).getTime();
  const now = Date.now();
  const days = (now - submittedTs) / 86400000;
  if (filter === "today") return days < 1;
  if (filter === "3d") return days <= 3;
  if (filter === "7d") return days <= 7;
  return days <= 30;
}

function satisfiesCompleteness(completenessPercent: number, filter?: VerificationQueueFilters["completeness"]): boolean {
  if (!filter) return true;
  if (filter === "lt50") return completenessPercent < 50;
  if (filter === "50to79") return completenessPercent >= 50 && completenessPercent < 80;
  return completenessPercent >= 80;
}

function determineVerifyTransition(currentStatus: string, level: VerificationLevel): { nextVerification: string; nextData: string } {
  if (currentStatus === "submitted_village") {
    return { nextVerification: level === "desa" ? "submitted_subdistrict" : "submitted_village", nextData: "submitted" };
  }
  if (currentStatus === "submitted_subdistrict") {
    return { nextVerification: level === "kecamatan" ? "submitted_regency" : "submitted_subdistrict", nextData: "submitted" };
  }
  if (currentStatus === "submitted_regency") {
    return { nextVerification: "verified", nextData: "active" };
  }
  return { nextVerification: currentStatus, nextData: "submitted" };
}

export async function getVerificationQueue(
  db: D1Binding,
  filters: VerificationQueueFilters,
  ctx: SikesraRequestContext,
): Promise<VerificationQueueResult> {
  const statuses = queueStatusesForLevel(filters.level);
  const params: unknown[] = [ctx.tenantId, ctx.siteId, ...statuses];
  const placeholders = statuses.map(() => "?").join(",");

  let sql = `SELECT id, display_name, object_type_code, object_subtype_code, official_village_code,
    verification_level, status_verification, updated_at, completeness_percent, duplicate_status
    FROM awcms_sikesra_entities
    WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND status_verification IN (${placeholders})`;

  if (filters.moduleCode) {
    sql += " AND object_type_code = ?";
    params.push(filters.moduleCode);
  }
  if (filters.regionCode) {
    sql += " AND official_village_code LIKE ?";
    params.push(`${filters.regionCode}%`);
  }
  if (ctx.regionScope.villageCodes?.length) {
    const scopePlaceholders = ctx.regionScope.villageCodes.map(() => "?").join(",");
    sql += ` AND official_village_code IN (${scopePlaceholders})`;
    params.push(...ctx.regionScope.villageCodes);
  }

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM awcms_sikesra_entities WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND status_verification IN (${placeholders})`;
  const countParams = [...params];
  const countResult = await db.prepare(countSql).bind(...countParams).first<{ total: number }>();
  const total = countResult?.total ?? 0;

  // Add pagination
  sql += " ORDER BY updated_at ASC";
  if (filters.limit) {
    sql += ` LIMIT ${filters.limit}`;
    if (filters.offset) {
      sql += ` OFFSET ${filters.offset}`;
    }
  }

  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();

  const items = result.results.map((row) => {
    const completenessPercent = Number(row.completeness_percent ?? 0);
    const duplicateStatus = String(row.duplicate_status ?? "unknown");
    return {
      entityId: String(row.id),
      displayName: String(row.display_name ?? ""),
      objectTypeCode: String(row.object_type_code ?? ""),
      objectSubtypeCode: String(row.object_subtype_code ?? ""),
      officialVillageCode: String(row.official_village_code ?? ""),
      verificationLevel: String(row.verification_level ?? filters.level ?? "desa") as VerificationLevel,
      currentStatus: String(row.status_verification ?? ""),
      submittedAt: String(row.updated_at ?? ""),
      completenessPercent,
      duplicateStatus,
      riskLevel: buildRiskLevel(completenessPercent, duplicateStatus),
    };
  }).filter((item) => {
    if (filters.duplicateStatus && item.duplicateStatus !== filters.duplicateStatus) return false;
    if (filters.risk && item.riskLevel !== filters.risk) return false;
    if (!satisfiesSubmissionAge(item.submittedAt, filters.submissionAge)) return false;
    if (!satisfiesCompleteness(item.completenessPercent, filters.completeness)) return false;
    return true;
  });

  return { items, total };
}

export async function submitEntity(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<{ ok: boolean; newStatus: string }> {
  const entity = await db.prepare(
    `SELECT id, status_data, status_verification, verification_level FROM awcms_sikesra_entities
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(entityId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!entity) throw new Error("Entity not found");
  const currentStatusData = String(entity.status_data ?? "draft");
  const currentStatusVerification = String(entity.status_verification ?? "pending");
  if (!(currentStatusData === "draft" || currentStatusVerification === "need_revision")) {
    throw new Error("Entity is not eligible for submit");
  }

  await transitionEntityStatus(db, entityId, "submitted_village", "submitted", "desa", ctx.userId, ctx);
  await writeVerificationEvent(db, {
    id: `vevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    entityId,
    actorId: ctx.userId,
    actorRole: ctx.roles[0] ?? "unknown",
    verificationLevel: "desa",
    action: currentStatusVerification === "need_revision" ? "re_submit" : "submit",
    previousStatus: currentStatusVerification,
    nextStatus: "submitted_village",
    requestId: ctx.requestId,
  }, ctx);

  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    action: AUDIT_ACTIONS.VERIFICATION_SUBMIT,
    resourceType: "entity",
    resourceId: entityId,
    success: true,
  }, ctx);

  return { ok: true, newStatus: "submitted_village" };
}

export async function verifyEntity(
  db: D1Binding,
  entityId: string,
  decision: VerificationDecision,
  ctx: SikesraRequestContext,
): Promise<{ ok: boolean; newStatus: string }> {
  if ((decision.action === "need_revision" || decision.action === "reject") && !decision.note?.trim()) {
    throw new Error("Note is required for revision or rejection");
  }

  const entity = await db.prepare(
    `SELECT id, status_data, status_verification, verification_level FROM awcms_sikesra_entities
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(entityId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!entity) throw new Error("Entity not found");
  const currentStatus = String(entity.status_verification ?? "pending");
  let nextVerification = currentStatus;
  let nextData = String(entity.status_data ?? "submitted");
  let auditAction: AuditAction = AUDIT_ACTIONS.VERIFICATION_VERIFY;

  if (decision.action === "verify") {
    const transition = determineVerifyTransition(currentStatus, decision.verificationLevel);
    nextVerification = transition.nextVerification;
    nextData = transition.nextData;
    auditAction = AUDIT_ACTIONS.VERIFICATION_VERIFY;
  } else if (decision.action === "need_revision") {
    nextVerification = "need_revision";
    nextData = "draft";
    auditAction = AUDIT_ACTIONS.VERIFICATION_NEED_REVISION;
  } else if (decision.action === "reject") {
    nextVerification = "rejected";
    nextData = "draft";
    auditAction = AUDIT_ACTIONS.VERIFICATION_REJECT;
  } else {
    throw new Error("Unsupported verification action");
  }

  await transitionEntityStatus(db, entityId, nextVerification, nextData, decision.verificationLevel, ctx.userId, ctx);
  await writeVerificationEvent(db, {
    id: `vevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    entityId,
    actorId: ctx.userId,
    actorRole: ctx.roles[0] ?? "unknown",
    verificationLevel: decision.verificationLevel,
    action: decision.action,
    previousStatus: currentStatus,
    nextStatus: nextVerification,
    note: decision.note,
    requestId: ctx.requestId,
  }, ctx);

  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    action: auditAction,
    resourceType: "entity",
    resourceId: entityId,
    success: true,
    reason: decision.note,
  }, ctx);

  return { ok: true, newStatus: nextVerification };
}

export async function getVerificationTimeline(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<VerificationEvent[]> {
  return getVerificationEvents(db, entityId, ctx);
}
