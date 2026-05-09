// SIKESRA ABAC Repository
// D1 SQL for loading ABAC policies and conditions
// Source: docs/sikesra/03_data_model.md, docs/sikesra/06_security_rbac_abac.md

import type { D1Binding } from "./db";
import type { SikesraRequestContext } from "../security/request-context";
import type { AbacPolicy, AbacCondition, AbacOperator } from "../security/abac";

const POLICY_TABLE = "awcms_sikesra_abac_policies";
const CONDITION_TABLE = "awcms_sikesra_abac_policy_conditions";

export async function loadAbacPolicies(
  db: D1Binding,
  ctx: SikesraRequestContext,
): Promise<AbacPolicy[]> {
  const policySql = `SELECT * FROM ${POLICY_TABLE} WHERE tenant_id = ? AND site_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY priority DESC`;
  const policyResult = await db.prepare(policySql).bind(ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();

  if (policyResult.results.length === 0) return [];

  const policyIds = policyResult.results.map((r) => r.id as string);
  const placeholders = policyIds.map(() => "?").join(",");

  const conditionSql = `SELECT * FROM ${CONDITION_TABLE} WHERE tenant_id = ? AND site_id = ? AND policy_id IN (${placeholders}) AND deleted_at IS NULL ORDER BY sort_order`;
  const conditionResult = await db.prepare(conditionSql).bind(ctx.tenantId, ctx.siteId, ...policyIds).all<Record<string, unknown>>();

  const conditionsByPolicy = new Map<string, AbacCondition[]>();
  for (const row of conditionResult.results) {
    const policyId = row.policy_id as string;
    if (!conditionsByPolicy.has(policyId)) conditionsByPolicy.set(policyId, []);
    conditionsByPolicy.get(policyId)!.push({
      attributeCategory: row.attribute_category as AbacCondition["attributeCategory"],
      attributeName: row.attribute_name as string,
      operator: row.operator as AbacOperator,
      value: row.value_json ? JSON.parse(row.value_json as string) : null,
    });
  }

  return policyResult.results.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    effect: row.effect as "allow" | "deny",
    priority: row.priority as number,
    conditions: conditionsByPolicy.get(row.id as string) ?? [],
  }));
}
