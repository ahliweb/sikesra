// SIKESRA Entity People/Relationships Service
// Manage relationships between entities and person profiles
// Source: docs/sikesra/03_data_model.md, migration 0005

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { writeAuditEvent, AUDIT_ACTIONS } from "./audit";

export type RelationType = "pengurus" | "wali" | "pengasuh" | "anggota" | "pimpinan" | "penanggung_jawab" | "lainnya";

export interface EntityPersonInput {
  entityId: string;
  personProfileId: string;
  relationType: RelationType;
  isPrimary?: boolean;
  notes?: string;
}

export interface EntityPersonSummary {
  id: string;
  entityId: string;
  personProfileId: string;
  relationType: RelationType;
  isPrimary: boolean;
  notes?: string;
  personName?: string;
  personNikMasked?: string;
  createdAt: string;
  updatedAt: string;
}

const PEOPLE_TABLE = "awcms_sikesra_entity_people";
const PERSON_TABLE = "awcms_sikesra_person_profiles";

export async function addEntityPerson(
  db: D1Binding,
  input: EntityPersonInput,
  ctx: SikesraRequestContext,
): Promise<{ id: string }> {
  const id = `ep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO ${PEOPLE_TABLE}
     (id, tenant_id, site_id, entity_id, person_profile_id, relation_type, is_primary, notes, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    ctx.tenantId,
    ctx.siteId,
    input.entityId,
    input.personProfileId,
    input.relationType,
    input.isPrimary ? 1 : 0,
    input.notes ?? null,
    ctx.userId,
    ctx.userId,
    now,
    now,
  ).run();

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.ENTITY_ADD_PERSON,
      resourceType: "entity_people",
      resourceId: id,
      requestId: ctx.requestId,
      success: true,
      reason: `add ${input.relationType} to entity ${input.entityId}`,
      after: {
        entityId: input.entityId,
        personProfileId: input.personProfileId,
        relationType: input.relationType,
        isPrimary: input.isPrimary,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return { id };
}

export async function updateEntityPerson(
  db: D1Binding,
  peopleId: string,
  input: Partial<EntityPersonInput>,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await getEntityPerson(db, peopleId, ctx);
  if (!existing) throw new Error("ENTITY_PERSON_NOT_FOUND");

  const now = new Date().toISOString();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.relationType !== undefined) {
    updates.push("relation_type = ?");
    values.push(input.relationType);
  }
  if (input.isPrimary !== undefined) {
    updates.push("is_primary = ?");
    values.push(input.isPrimary ? 1 : 0);
  }
  if (input.notes !== undefined) {
    updates.push("notes = ?");
    values.push(input.notes ?? null);
  }

  updates.push("updated_at = ?", "updated_by = ?");
  values.push(now, ctx.userId);

  if (updates.length > 2) {
    values.unshift(peopleId, ctx.tenantId, ctx.siteId);
    await db.prepare(
      `UPDATE ${PEOPLE_TABLE} SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
    ).bind(...values).run();
  }

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.ENTITY_UPDATE_PERSON,
      resourceType: "entity_people",
      resourceId: peopleId,
      requestId: ctx.requestId,
      success: true,
      reason: `update entity person ${peopleId}`,
      before: {
        relationType: existing.relationType,
        isPrimary: existing.isPrimary,
      },
      after: {
        relationType: input.relationType ?? existing.relationType,
        isPrimary: input.isPrimary ?? existing.isPrimary,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
}

export async function removeEntityPerson(
  db: D1Binding,
  peopleId: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await getEntityPerson(db, peopleId, ctx);
  if (!existing) throw new Error("ENTITY_PERSON_NOT_FOUND");

  const now = new Date().toISOString();
  await db.prepare(
    `UPDATE ${PEOPLE_TABLE} SET deleted_at = ?, updated_at = ?, updated_by = ? WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(now, now, ctx.userId, peopleId, ctx.tenantId, ctx.siteId).run();

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.ENTITY_REMOVE_PERSON,
      resourceType: "entity_people",
      resourceId: peopleId,
      requestId: ctx.requestId,
      success: true,
      reason: `remove entity person ${peopleId}`,
      before: {
        entityId: existing.entityId,
        relationType: existing.relationType,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
}

export async function getEntityPerson(
  db: D1Binding,
  peopleId: string,
  ctx: SikesraRequestContext,
): Promise<EntityPersonSummary | null> {
  const row = await db.prepare(
    `SELECT ep.*, pp.full_name as person_name, pp.nik as person_nik
     FROM ${PEOPLE_TABLE} ep
     LEFT JOIN ${PERSON_TABLE} pp ON ep.person_profile_id = pp.id
     WHERE ep.id = ? AND ep.tenant_id = ? AND ep.site_id = ? AND ep.deleted_at IS NULL`
  ).bind(peopleId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!row) return null;

  return {
    id: row.id as string,
    entityId: row.entity_id as string,
    personProfileId: row.person_profile_id as string,
    relationType: row.relation_type as RelationType,
    isPrimary: (row.is_primary as number) === 1,
    notes: row.notes as string | undefined,
    personName: row.person_name as string | undefined,
    personNikMasked: row.person_nik ? maskNik(row.person_nik as string) : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listEntityPeople(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<EntityPersonSummary[]> {
  const rows = await db.prepare(
    `SELECT ep.*, pp.full_name as person_name, pp.nik as person_nik
     FROM ${PEOPLE_TABLE} ep
     LEFT JOIN ${PERSON_TABLE} pp ON ep.person_profile_id = pp.id
     WHERE ep.entity_id = ? AND ep.tenant_id = ? AND ep.site_id = ? AND ep.deleted_at IS NULL
     ORDER BY ep.is_primary DESC, ep.relation_type, ep.created_at`
  ).bind(entityId, ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();

  return rows.results.map((row) => ({
    id: row.id as string,
    entityId: row.entity_id as string,
    personProfileId: row.person_profile_id as string,
    relationType: row.relation_type as RelationType,
    isPrimary: (row.is_primary as number) === 1,
    notes: row.notes as string | undefined,
    personName: row.person_name as string | undefined,
    personNikMasked: row.person_nik ? maskNik(row.person_nik as string) : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

function maskNik(nik: string): string {
  if (nik.length <= 4) return "****";
  return "*".repeat(nik.length - 4) + nik.slice(-4);
}
