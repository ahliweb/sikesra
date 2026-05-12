// SIKESRA Code Service
// 20-digit SIKESRA ID generation and correction
// Format: [kode_desa_kel_10][jenis_2][subjenis_2][sequence_6]
// Source: docs/sikesra/07_operations_sop.md

import type { D1Binding } from "../repositories/db";
import type { SikesraRequestContext } from "../security/request-context";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { writeAuditEvent, AUDIT_ACTIONS } from "./audit";
import {
  getCodeSequence,
  createCodeSequence,
  incrementCodeSequence,
  updateEntityCode,
  writeCodeHistory,
  buildSikesraId20,
} from "../repositories/code-repository";

export interface GenerateCodeResult {
  sikesraId20: string;
  sequence: number;
}

export interface CorrectCodeResult {
  oldId: string;
  newId: string;
}

export async function generateSikesraId(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<GenerateCodeResult> {
  // 1. Check permission
  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.CODE_GENERATE)) {
    throw new Error("Missing permission: awcms:sikesra:code:generate");
  }

  // 2. Load entity to validate required fields
  const entity = await db.prepare(
    `SELECT id, sikesra_id_20, object_type_code, object_subtype_code, official_village_code, status_data, display_name
     FROM awcms_sikesra_entities
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(entityId, ctx.tenantId, ctx.siteId).first<{
    id: string;
    sikesra_id_20?: string | null;
    object_type_code: string;
    object_subtype_code: string;
    official_village_code: string;
    status_data: string;
    display_name: string;
  }>();

  if (!entity) {
    throw new Error("Entity not found");
  }

  // 3. Check if already has ID
  if (entity.sikesra_id_20) {
    throw new Error("Entity already has a SIKESRA ID: " + entity.sikesra_id_20);
  }

  // 4. Validate status
  if (entity.status_data === "archived") {
    throw new Error("Cannot generate ID for archived entity");
  }

  // 5. Validate required fields
  const villageCode = entity.official_village_code;
  if (!villageCode || villageCode.length !== 10) {
    throw new Error("Invalid or missing official village code (must be 10 digits)");
  }

  const typeCode = entity.object_type_code;
  if (!typeCode || typeCode.length !== 2) {
    throw new Error("Invalid or missing object type code (must be 2 digits)");
  }

  const subtypeCode = entity.object_subtype_code;
  if (!subtypeCode || subtypeCode.length !== 2) {
    throw new Error("Invalid or missing object subtype code (must be 2 digits)");
  }

  // 6. Read or create sequence row
  let sequence = await getCodeSequence(db, ctx.tenantId, ctx.siteId, villageCode, typeCode, subtypeCode);
  if (!sequence) {
    sequence = await createCodeSequence(db, ctx.tenantId, ctx.siteId, villageCode, typeCode, subtypeCode, ctx.userId);
  }

  // 7. Increment sequence and build ID
  const newSequence = await incrementCodeSequence(db, sequence.id, ctx.userId);
  const sikesraId20 = buildSikesraId20(villageCode, typeCode, subtypeCode, newSequence);

  // 8. Update entity with generated ID
  await updateEntityCode(db, entityId, ctx.tenantId, ctx.siteId, sikesraId20, ctx.userId);

  // 9. Write code history
  await writeCodeHistory(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    entityId,
    action: "generate",
    newSikesraId20: sikesraId20,
    createdBy: ctx.userId,
  });

  // 10. Write audit event
  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    action: AUDIT_ACTIONS.CODE_GENERATE,
    resourceType: "entity",
    resourceId: entityId,
    success: true,
    after: {
      sikesraId20,
      sequence: newSequence,
      villageCode,
      typeCode,
      subtypeCode,
    },
  }, ctx);

  return { sikesraId20, sequence: newSequence };
}

export async function correctSikesraId(
  db: D1Binding,
  entityId: string,
  newId: string,
  reason: string,
  ctx: SikesraRequestContext,
): Promise<CorrectCodeResult> {
  // 1. Check permission
  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.CODE_CORRECT)) {
    throw new Error("Missing permission: awcms:sikesra:code:correct");
  }

  // 2. Validate reason
  if (!reason || reason.trim().length === 0) {
    throw new Error("Reason is required for code correction");
  }

  // 3. Load entity
  const entity = await db.prepare(
    `SELECT id, sikesra_id_20, status_data, display_name
     FROM awcms_sikesra_entities
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(entityId, ctx.tenantId, ctx.siteId).first<{
    id: string;
    sikesra_id_20?: string | null;
    status_data: string;
    display_name: string;
  }>();

  if (!entity) {
    throw new Error("Entity not found");
  }

  const oldId = entity.sikesra_id_20;
  if (!oldId) {
    throw new Error("Entity does not have a SIKESRA ID to correct");
  }

  // 4. Validate new ID format
  if (!newId || newId.length !== 20) {
    throw new Error("New ID must be exactly 20 characters");
  }

  // 5. Update entity
  await db.prepare(
    `UPDATE awcms_sikesra_entities
     SET sikesra_id_20 = ?, updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(newId, ctx.userId, entityId, ctx.tenantId, ctx.siteId).run();

  // 6. Write code history
  await writeCodeHistory(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    entityId,
    action: "correct",
    oldSikesraId20: oldId,
    newSikesraId20: newId,
    reason: reason.trim(),
    createdBy: ctx.userId,
  });

  // 7. Write audit event
  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    action: AUDIT_ACTIONS.CODE_CORRECT,
    resourceType: "entity",
    resourceId: entityId,
    success: true,
    reason: reason.trim(),
    before: { sikesraId20: oldId },
    after: { sikesraId20: newId },
  }, ctx);

  return { oldId, newId };
}
