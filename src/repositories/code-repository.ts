// SIKESRA Code Repository
// D1 SQL for code sequence management and code history
// Source: docs/sikesra/03_data_model.md

import type { D1Binding } from "./db";
import type { SikesraRequestContext } from "../security/request-context";

const CODE_SEQUENCE_TABLE = "awcms_sikesra_code_sequences";
const CODE_HISTORY_TABLE = "awcms_sikesra_code_history";
const ENTITY_TABLE = "awcms_sikesra_entities";

export interface CodeSequenceRow {
  id: string;
  tenant_id: string;
  site_id: string;
  official_village_code: string;
  object_type_code: string;
  object_subtype_code: string;
  last_sequence: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CodeHistoryRow {
  id: string;
  tenant_id: string;
  site_id: string;
  entity_id: string;
  action: "generate" | "correct";
  old_sikesra_id_20?: string | null;
  new_sikesra_id_20: string;
  reason?: string | null;
  created_at: string;
  created_by?: string | null;
}

export async function getCodeSequence(
  db: D1Binding,
  tenantId: string,
  siteId: string,
  villageCode: string,
  typeCode: string,
  subtypeCode: string,
): Promise<CodeSequenceRow | null> {
  return db.prepare(
    `SELECT * FROM ${CODE_SEQUENCE_TABLE}
     WHERE tenant_id = ? AND site_id = ? AND official_village_code = ?
       AND object_type_code = ? AND object_subtype_code = ? AND deleted_at IS NULL`,
  ).bind(tenantId, siteId, villageCode, typeCode, subtypeCode).first<CodeSequenceRow>();
}

export async function createCodeSequence(
  db: D1Binding,
  tenantId: string,
  siteId: string,
  villageCode: string,
  typeCode: string,
  subtypeCode: string,
  userId: string,
): Promise<CodeSequenceRow> {
  const id = `seq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.prepare(
    `INSERT INTO ${CODE_SEQUENCE_TABLE}
     (id, tenant_id, site_id, official_village_code, object_type_code, object_subtype_code, last_sequence, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).bind(id, tenantId, siteId, villageCode, typeCode, subtypeCode, userId, userId).run();

  return (await getCodeSequence(db, tenantId, siteId, villageCode, typeCode, subtypeCode))!;
}

export async function incrementCodeSequence(
  db: D1Binding,
  sequenceId: string,
  userId: string,
): Promise<number> {
  await db.prepare(
    `UPDATE ${CODE_SEQUENCE_TABLE}
     SET last_sequence = last_sequence + 1, updated_at = datetime('now'), updated_by = ?
     WHERE id = ?`,
  ).bind(userId, sequenceId).run();

  const row = await db.prepare(
    `SELECT last_sequence FROM ${CODE_SEQUENCE_TABLE} WHERE id = ?`,
  ).bind(sequenceId).first<{ last_sequence: number }>();

  return row!.last_sequence;
}

export async function updateEntityCode(
  db: D1Binding,
  entityId: string,
  tenantId: string,
  siteId: string,
  sikesraId20: string,
  userId: string,
): Promise<void> {
  await db.prepare(
    `UPDATE ${ENTITY_TABLE}
     SET sikesra_id_20 = ?, updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(sikesraId20, userId, entityId, tenantId, siteId).run();
}

export async function writeCodeHistory(
  db: D1Binding,
  input: {
    tenantId: string;
    siteId: string;
    entityId: string;
    action: "generate" | "correct";
    oldSikesraId20?: string;
    newSikesraId20: string;
    reason?: string;
    createdBy: string;
  },
): Promise<CodeHistoryRow> {
  const id = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.prepare(
    `INSERT INTO ${CODE_HISTORY_TABLE}
     (id, tenant_id, site_id, entity_id, action, old_sikesra_id_20, new_sikesra_id_20, reason, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id,
    input.tenantId,
    input.siteId,
    input.entityId,
    input.action,
    input.oldSikesraId20 ?? null,
    input.newSikesraId20,
    input.reason ?? null,
    input.createdBy,
  ).run();

  return {
    id,
    tenant_id: input.tenantId,
    site_id: input.siteId,
    entity_id: input.entityId,
    action: input.action,
    old_sikesra_id_20: input.oldSikesraId20 ?? null,
    new_sikesra_id_20: input.newSikesraId20,
    reason: input.reason ?? null,
    created_at: new Date().toISOString(),
    created_by: input.createdBy,
  };
}

export function buildSikesraId20(
  villageCode: string,
  typeCode: string,
  subtypeCode: string,
  sequence: number,
): string {
  const subtypeSuffix = subtypeCode.slice(-2).padStart(2, "0");
  const sequenceStr = String(sequence).padStart(6, "0");
  return `${villageCode}${typeCode}${subtypeSuffix}${sequenceStr}`;
}
