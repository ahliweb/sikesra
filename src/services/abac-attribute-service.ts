// SIKESRA ABAC Attribute Definition CRUD Service
// Create, update, activate, deactivate, and delete attribute definitions
// Source: docs/sikesra/06_security_rbac_abac.md, migration 0005

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { writeAuditEvent, AUDIT_ACTIONS } from "./audit";

export type AttributeCategory = "religion" | "demographics" | "welfare" | "health" | "education" | "economic" | "verification" | "region" | "sensitivity" | "source" | "other";
export type AttributeValueType = "text" | "number" | "boolean" | "date" | "code_list";

export interface AttributeDefinitionInput {
  code: string;
  name: string;
  category: AttributeCategory;
  valueType?: AttributeValueType;
  applicableEntityKinds?: string[];
  applicableObjectTypes?: string[];
  sortOrder?: number;
}

export interface AttributeDefinitionSummary {
  id: string;
  code: string;
  name: string;
  category: AttributeCategory;
  valueType: AttributeValueType;
  applicableEntityKinds: string[];
  applicableObjectTypes: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const ATTRIBUTE_TABLE = "awcms_sikesra_attribute_definitions";

export async function createAttributeDefinition(
  db: D1Binding,
  input: AttributeDefinitionInput,
  ctx: SikesraRequestContext,
): Promise<{ id: string }> {
  const id = `attr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO ${ATTRIBUTE_TABLE}
     (id, tenant_id, site_id, code, name, category, value_type, applicable_entity_kinds, applicable_object_types, is_active, sort_order, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    ctx.tenantId,
    ctx.siteId,
    input.code,
    input.name,
    input.category,
    input.valueType ?? "text",
    input.applicableEntityKinds ? JSON.stringify(input.applicableEntityKinds) : null,
    input.applicableObjectTypes ? JSON.stringify(input.applicableObjectTypes) : null,
    input.sortOrder ?? 0,
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
      action: AUDIT_ACTIONS.ATTRIBUTE_CREATE,
      resourceType: "attribute_definition",
      resourceId: id,
      requestId: ctx.requestId,
      success: true,
      reason: `create attribute definition: ${input.code}`,
      after: {
        id,
        code: input.code,
        name: input.name,
        category: input.category,
        valueType: input.valueType ?? "text",
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return { id };
}

export async function updateAttributeDefinition(
  db: D1Binding,
  attributeId: string,
  input: Partial<AttributeDefinitionInput>,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await getAttributeDefinition(db, attributeId, ctx);
  if (!existing) throw new Error("ATTRIBUTE_DEFINITION_NOT_FOUND");

  const now = new Date().toISOString();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.category !== undefined) {
    updates.push("category = ?");
    values.push(input.category);
  }
  if (input.valueType !== undefined) {
    updates.push("value_type = ?");
    values.push(input.valueType);
  }
  if (input.applicableEntityKinds !== undefined) {
    updates.push("applicable_entity_kinds = ?");
    values.push(input.applicableEntityKinds ? JSON.stringify(input.applicableEntityKinds) : null);
  }
  if (input.applicableObjectTypes !== undefined) {
    updates.push("applicable_object_types = ?");
    values.push(input.applicableObjectTypes ? JSON.stringify(input.applicableObjectTypes) : null);
  }
  if (input.sortOrder !== undefined) {
    updates.push("sort_order = ?");
    values.push(input.sortOrder);
  }

  updates.push("updated_at = ?", "updated_by = ?");
  values.push(now, ctx.userId);

  if (updates.length > 2) {
    values.unshift(attributeId, ctx.tenantId, ctx.siteId);
    await db.prepare(
      `UPDATE ${ATTRIBUTE_TABLE} SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
    ).bind(...values).run();
  }

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.ATTRIBUTE_UPDATE,
      resourceType: "attribute_definition",
      resourceId: attributeId,
      requestId: ctx.requestId,
      success: true,
      reason: `update attribute definition: ${existing.code}`,
      before: {
        code: existing.code,
        name: existing.name,
        category: existing.category,
      },
      after: {
        code: input.code ?? existing.code,
        name: input.name ?? existing.name,
        category: input.category ?? existing.category,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
}

export async function activateAttributeDefinition(
  db: D1Binding,
  attributeId: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await getAttributeDefinition(db, attributeId, ctx);
  if (!existing) throw new Error("ATTRIBUTE_DEFINITION_NOT_FOUND");

  await db.prepare(
    `UPDATE ${ATTRIBUTE_TABLE} SET is_active = 1, updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(ctx.userId, attributeId, ctx.tenantId, ctx.siteId).run();

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.ATTRIBUTE_ACTIVATE,
      resourceType: "attribute_definition",
      resourceId: attributeId,
      requestId: ctx.requestId,
      success: true,
      reason: `activate attribute definition: ${existing.code}`,
      after: { id: attributeId, code: existing.code, isActive: true },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
}

export async function deactivateAttributeDefinition(
  db: D1Binding,
  attributeId: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await getAttributeDefinition(db, attributeId, ctx);
  if (!existing) throw new Error("ATTRIBUTE_DEFINITION_NOT_FOUND");

  await db.prepare(
    `UPDATE ${ATTRIBUTE_TABLE} SET is_active = 0, updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(ctx.userId, attributeId, ctx.tenantId, ctx.siteId).run();

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.ATTRIBUTE_DEACTIVATE,
      resourceType: "attribute_definition",
      resourceId: attributeId,
      requestId: ctx.requestId,
      success: true,
      reason: `deactivate attribute definition: ${existing.code}`,
      after: { id: attributeId, code: existing.code, isActive: false },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
}

export async function deleteAttributeDefinition(
  db: D1Binding,
  attributeId: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await getAttributeDefinition(db, attributeId, ctx);
  if (!existing) throw new Error("ATTRIBUTE_DEFINITION_NOT_FOUND");

  await db.prepare(
    `UPDATE ${ATTRIBUTE_TABLE} SET deleted_at = datetime('now'), updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(ctx.userId, attributeId, ctx.tenantId, ctx.siteId).run();

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.ATTRIBUTE_DELETE,
      resourceType: "attribute_definition",
      resourceId: attributeId,
      requestId: ctx.requestId,
      success: true,
      reason: `delete attribute definition: ${existing.code}`,
      before: { id: attributeId, code: existing.code },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
}

export async function getAttributeDefinition(
  db: D1Binding,
  attributeId: string,
  ctx: SikesraRequestContext,
): Promise<AttributeDefinitionSummary | null> {
  const row = await db.prepare(
    `SELECT * FROM ${ATTRIBUTE_TABLE}
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(attributeId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!row) return null;

  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    category: row.category as AttributeCategory,
    valueType: row.value_type as AttributeValueType,
    applicableEntityKinds: row.applicable_entity_kinds ? JSON.parse(row.applicable_entity_kinds as string) : [],
    applicableObjectTypes: row.applicable_object_types ? JSON.parse(row.applicable_object_types as string) : [],
    isActive: (row.is_active as number) === 1,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listAttributeDefinitions(
  db: D1Binding,
  ctx: SikesraRequestContext,
  category?: AttributeCategory,
  includeInactive = false,
): Promise<AttributeDefinitionSummary[]> {
  let sql = `SELECT * FROM ${ATTRIBUTE_TABLE} WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`;
  const params: unknown[] = [ctx.tenantId, ctx.siteId];

  if (!includeInactive) {
    sql += " AND is_active = 1";
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  sql += " ORDER BY category, sort_order, name";

  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();

  return result.results.map((row) => ({
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    category: row.category as AttributeCategory,
    valueType: row.value_type as AttributeValueType,
    applicableEntityKinds: row.applicable_entity_kinds ? JSON.parse(row.applicable_entity_kinds as string) : [],
    applicableObjectTypes: row.applicable_object_types ? JSON.parse(row.applicable_object_types as string) : [],
    isActive: (row.is_active as number) === 1,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}
