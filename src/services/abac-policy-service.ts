// SIKESRA ABAC Policy CRUD Service
// Create, update, activate, deactivate, preview, and delete ABAC policies and conditions
// Source: docs/sikesra/06_security_rbac_abac.md

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { writeAuditEvent, AUDIT_ACTIONS } from "./audit";

export interface AbacPolicyInput {
  name: string;
  description?: string;
  effect: "allow" | "deny";
  priority: number;
  resourceType?: string;
  actions?: string[];
  conditions: AbacConditionInput[];
}

export interface AbacConditionInput {
  attributeCategory: "subject" | "resource" | "environment";
  attributeName: string;
  operator: "equals" | "not_equals" | "in" | "not_in" | "contains" | "gt" | "gte" | "lt" | "lte" | "exists" | "not_exists";
  value?: unknown;
  description?: string;
  sortOrder?: number;
}

export interface AbacPolicySummary {
  id: string;
  name: string;
  description?: string;
  effect: "allow" | "deny";
  priority: number;
  resourceType?: string;
  actions: string[];
  isActive: boolean;
  conditionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AbacPolicyDetail extends AbacPolicySummary {
  conditions: AbacConditionDetail[];
}

export interface AbacConditionDetail {
  id: string;
  attributeCategory: "subject" | "resource" | "environment";
  attributeName: string;
  operator: string;
  value: unknown;
  description?: string;
  sortOrder: number;
}

export interface AbacPreviewResult {
  input: Record<string, unknown>;
  result: {
    allowed: boolean;
    matchedPolicyId?: string;
    matchedPolicyName?: string;
    reasonCode?: string;
  };
  evaluatedConditions: Array<{
    conditionId: string;
    attributeName: string;
    operator: string;
    expectedValue: unknown;
    actualValue: unknown;
    passed: boolean;
  }>;
}

const POLICY_TABLE = "awcms_sikesra_abac_policies";
const CONDITION_TABLE = "awcms_sikesra_abac_policy_conditions";

export async function createAbacPolicy(
  db: D1Binding,
  input: AbacPolicyInput,
  ctx: SikesraRequestContext,
): Promise<{ id: string }> {
  const id = `abac_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO ${POLICY_TABLE}
     (id, tenant_id, site_id, name, description, effect, priority, resource_type, actions_json, is_active, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  ).bind(
    id,
    ctx.tenantId,
    ctx.siteId,
    input.name,
    input.description ?? null,
    input.effect,
    input.priority,
    input.resourceType ?? null,
    input.actions ? JSON.stringify(input.actions) : null,
    ctx.userId,
    ctx.userId,
    now,
    now,
  ).run();

  for (let i = 0; i < input.conditions.length; i++) {
    const cond = input.conditions[i];
    const condId = `cond_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${i}`;
    await db.prepare(
      `INSERT INTO ${CONDITION_TABLE}
       (id, tenant_id, site_id, policy_id, attribute_category, attribute_name, operator, value_json, description, sort_order, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      condId,
      ctx.tenantId,
      ctx.siteId,
      id,
      cond.attributeCategory,
      cond.attributeName,
      cond.operator,
      cond.value !== undefined ? JSON.stringify(cond.value) : null,
      cond.description ?? null,
      cond.sortOrder ?? i,
      ctx.userId,
      ctx.userId,
      now,
      now,
    ).run();
  }

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.POLICY_CREATE,
      resourceType: "abac_policy",
      resourceId: id,
      requestId: ctx.requestId,
      success: true,
      reason: `create ABAC policy: ${input.name}`,
      after: {
        id,
        name: input.name,
        effect: input.effect,
        priority: input.priority,
        conditionCount: input.conditions.length,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return { id };
}

export async function updateAbacPolicy(
  db: D1Binding,
  policyId: string,
  input: Partial<AbacPolicyInput>,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await getAbacPolicyDetail(db, policyId, ctx);
  if (!existing) throw new Error("ABAC_POLICY_NOT_FOUND");

  const now = new Date().toISOString();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    values.push(input.description ?? null);
  }
  if (input.effect !== undefined) {
    updates.push("effect = ?");
    values.push(input.effect);
  }
  if (input.priority !== undefined) {
    updates.push("priority = ?");
    values.push(input.priority);
  }
  if (input.resourceType !== undefined) {
    updates.push("resource_type = ?");
    values.push(input.resourceType ?? null);
  }
  if (input.actions !== undefined) {
    updates.push("actions_json = ?");
    values.push(input.actions ? JSON.stringify(input.actions) : null);
  }

  updates.push("updated_at = ?", "updated_by = ?");
  values.push(now, ctx.userId);

  if (updates.length > 2) {
    values.unshift(policyId, ctx.tenantId, ctx.siteId);
    await db.prepare(
      `UPDATE ${POLICY_TABLE} SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
    ).bind(...values).run();
  }

  if (input.conditions !== undefined) {
    await db.prepare(
      `UPDATE ${CONDITION_TABLE} SET deleted_at = datetime('now'), updated_at = datetime('now'), updated_by = ?
       WHERE policy_id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
    ).bind(ctx.userId, policyId, ctx.tenantId, ctx.siteId).run();

    for (let i = 0; i < input.conditions.length; i++) {
      const cond = input.conditions[i];
      const condId = `cond_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${i}`;
      await db.prepare(
        `INSERT INTO ${CONDITION_TABLE}
         (id, tenant_id, site_id, policy_id, attribute_category, attribute_name, operator, value_json, description, sort_order, created_by, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        condId,
        ctx.tenantId,
        ctx.siteId,
        policyId,
        cond.attributeCategory,
        cond.attributeName,
        cond.operator,
        cond.value !== undefined ? JSON.stringify(cond.value) : null,
        cond.description ?? null,
        cond.sortOrder ?? i,
        ctx.userId,
        ctx.userId,
        now,
        now,
      ).run();
    }
  }

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.POLICY_UPDATE,
      resourceType: "abac_policy",
      resourceId: policyId,
      requestId: ctx.requestId,
      success: true,
      reason: `update ABAC policy: ${existing.name}`,
      before: {
        name: existing.name,
        effect: existing.effect,
        priority: existing.priority,
      },
      after: {
        name: input.name ?? existing.name,
        effect: input.effect ?? existing.effect,
        priority: input.priority ?? existing.priority,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
}

export async function activateAbacPolicy(
  db: D1Binding,
  policyId: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await getAbacPolicyDetail(db, policyId, ctx);
  if (!existing) throw new Error("ABAC_POLICY_NOT_FOUND");

  await db.prepare(
    `UPDATE ${POLICY_TABLE} SET is_active = 1, updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(ctx.userId, policyId, ctx.tenantId, ctx.siteId).run();

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.POLICY_ACTIVATE,
      resourceType: "abac_policy",
      resourceId: policyId,
      requestId: ctx.requestId,
      success: true,
      reason: `activate ABAC policy: ${existing.name}`,
      after: { id: policyId, name: existing.name, isActive: true },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
}

export async function deactivateAbacPolicy(
  db: D1Binding,
  policyId: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await getAbacPolicyDetail(db, policyId, ctx);
  if (!existing) throw new Error("ABAC_POLICY_NOT_FOUND");

  await db.prepare(
    `UPDATE ${POLICY_TABLE} SET is_active = 0, updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(ctx.userId, policyId, ctx.tenantId, ctx.siteId).run();

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.POLICY_DISABLE,
      resourceType: "abac_policy",
      resourceId: policyId,
      requestId: ctx.requestId,
      success: true,
      reason: `deactivate ABAC policy: ${existing.name}`,
      after: { id: policyId, name: existing.name, isActive: false },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
}

export async function deleteAbacPolicy(
  db: D1Binding,
  policyId: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const existing = await getAbacPolicyDetail(db, policyId, ctx);
  if (!existing) throw new Error("ABAC_POLICY_NOT_FOUND");

  await db.prepare(
    `UPDATE ${POLICY_TABLE} SET deleted_at = datetime('now'), updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(ctx.userId, policyId, ctx.tenantId, ctx.siteId).run();

  await db.prepare(
    `UPDATE ${CONDITION_TABLE} SET deleted_at = datetime('now'), updated_at = datetime('now'), updated_by = ?
     WHERE policy_id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(ctx.userId, policyId, ctx.tenantId, ctx.siteId).run();

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.POLICY_DELETE,
      resourceType: "abac_policy",
      resourceId: policyId,
      requestId: ctx.requestId,
      success: true,
      reason: `delete ABAC policy: ${existing.name}`,
      before: { id: policyId, name: existing.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
}

export async function getAbacPolicySummary(
  db: D1Binding,
  policyId: string,
  ctx: SikesraRequestContext,
): Promise<AbacPolicySummary | null> {
  const row = await db.prepare(
    `SELECT p.id, p.name, p.description, p.effect, p.priority, p.resource_type, p.actions_json, p.is_active,
            p.created_at, p.updated_at,
            (SELECT COUNT(*) FROM ${CONDITION_TABLE} c WHERE c.policy_id = p.id AND c.deleted_at IS NULL) as condition_count
     FROM ${POLICY_TABLE} p
     WHERE p.id = ? AND p.tenant_id = ? AND p.site_id = ? AND p.deleted_at IS NULL`
  ).bind(policyId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!row) return null;

  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    effect: row.effect as "allow" | "deny",
    priority: row.priority as number,
    resourceType: row.resource_type as string | undefined,
    actions: row.actions_json ? JSON.parse(row.actions_json as string) : [],
    isActive: (row.is_active as number) === 1,
    conditionCount: row.condition_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAbacPolicyDetail(
  db: D1Binding,
  policyId: string,
  ctx: SikesraRequestContext,
): Promise<AbacPolicyDetail | null> {
  const summary = await getAbacPolicySummary(db, policyId, ctx);
  if (!summary) return null;

  const conditions = await db.prepare(
    `SELECT id, attribute_category, attribute_name, operator, value_json, description, sort_order
     FROM ${CONDITION_TABLE}
     WHERE policy_id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL
     ORDER BY sort_order`
  ).bind(policyId, ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();

  return {
    ...summary,
    conditions: conditions.results.map((row) => ({
      id: row.id as string,
      attributeCategory: row.attribute_category as "subject" | "resource" | "environment",
      attributeName: row.attribute_name as string,
      operator: row.operator as string,
      value: row.value_json ? JSON.parse(row.value_json as string) : null,
      description: row.description as string | undefined,
      sortOrder: row.sort_order as number,
    })),
  };
}

export async function listAbacPolicies(
  db: D1Binding,
  ctx: SikesraRequestContext,
  includeInactive = false,
): Promise<AbacPolicySummary[]> {
  let sql = `SELECT p.id, p.name, p.description, p.effect, p.priority, p.resource_type, p.actions_json, p.is_active,
                    p.created_at, p.updated_at,
                    (SELECT COUNT(*) FROM ${CONDITION_TABLE} c WHERE c.policy_id = p.id AND c.deleted_at IS NULL) as condition_count
             FROM ${POLICY_TABLE} p
             WHERE p.tenant_id = ? AND p.site_id = ? AND p.deleted_at IS NULL`;

  const params: unknown[] = [ctx.tenantId, ctx.siteId];

  if (!includeInactive) {
    sql += " AND p.is_active = 1";
  }

  sql += " ORDER BY p.priority DESC, p.created_at DESC";

  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();

  return result.results.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    effect: row.effect as "allow" | "deny",
    priority: row.priority as number,
    resourceType: row.resource_type as string | undefined,
    actions: row.actions_json ? JSON.parse(row.actions_json as string) : [],
    isActive: (row.is_active as number) === 1,
    conditionCount: row.condition_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function previewAbacPolicy(
  db: D1Binding,
  policyId: string,
  testInput: Record<string, unknown>,
  ctx: SikesraRequestContext,
): Promise<AbacPreviewResult> {
  const policy = await getAbacPolicyDetail(db, policyId, ctx);
  if (!policy) throw new Error("ABAC_POLICY_NOT_FOUND");

  const evaluatedConditions = policy.conditions.map((cond) => {
    const subjectAttrs = testInput.subject as Record<string, unknown> | undefined;
    const resourceAttrs = testInput.resource as Record<string, unknown> | undefined;
    const envAttrs = testInput.environment as Record<string, unknown> | undefined;

    const actualValue =
      cond.attributeCategory === "subject" ? subjectAttrs?.[cond.attributeName] :
      cond.attributeCategory === "resource" ? resourceAttrs?.[cond.attributeName] :
      envAttrs?.[cond.attributeName];

    let passed = false;
    const expected = cond.value;

    switch (cond.operator) {
      case "exists":
        passed = actualValue !== undefined && actualValue !== null;
        break;
      case "not_exists":
        passed = actualValue === undefined || actualValue === null;
        break;
      case "equals":
        passed = actualValue === expected;
        break;
      case "not_equals":
        passed = actualValue !== expected;
        break;
      case "gt":
        passed = Number(actualValue) > Number(expected);
        break;
      case "gte":
        passed = Number(actualValue) >= Number(expected);
        break;
      case "lt":
        passed = Number(actualValue) < Number(expected);
        break;
      case "lte":
        passed = Number(actualValue) <= Number(expected);
        break;
      case "in":
        passed = Array.isArray(expected) && expected.includes(actualValue);
        break;
      case "not_in":
        passed = Array.isArray(expected) && !expected.includes(actualValue);
        break;
      case "contains":
        passed = typeof actualValue === "string" && actualValue.includes(String(expected));
        break;
    }

    return {
      conditionId: cond.id,
      attributeName: cond.attributeName,
      operator: cond.operator,
      expectedValue: expected,
      actualValue,
      passed,
    };
  });

  const allConditionsPassed = evaluatedConditions.every((c) => c.passed);

  return {
    input: testInput,
    result: {
      allowed: policy.effect === "allow" && allConditionsPassed,
      matchedPolicyId: allConditionsPassed ? policy.id : undefined,
      matchedPolicyName: allConditionsPassed ? policy.name : undefined,
      reasonCode: allConditionsPassed ? undefined : "conditions_not_met",
    },
    evaluatedConditions,
  };
}
