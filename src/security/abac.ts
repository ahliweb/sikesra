// SIKESRA ABAC Evaluator
// Attribute-Based Access Control policy evaluation
// Source: docs/sikesra/06_security_rbac_abac.md

import type { SikesraRequestContext } from "./request-context";

// ABAC input types (matching SikesraAbacInput from security doc)
export interface AbacSubject {
  roles: string[];
  permissions: string[];
  tenantId: string;
  siteId: string;
  provinceCode?: string;
  regencyCode?: string;
  districtCodes?: string[];
  villageCodes?: string[];
  localRegionIds?: string[];
  verificationLevel?: string;
  sessionAssurance?: string;
}

export interface AbacResource {
  resourceType: string;
  entityId?: string;
  sikesraId20?: string;
  objectTypeCode?: string;
  objectSubtypeCode?: string;
  entityKind?: string;
  officialVillageCode?: string;
  districtCode?: string;
  localRegionId?: string;
  sensitivityLevel?: string;
  statusData?: string;
  statusVerification?: string;
  sourceInput?: string;
  documentClassification?: string;
}

export interface AbacEnvironment {
  routeClass?: string;
  requestTime?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  requireReason?: boolean;
  smallCellThreshold?: number;
}

// Policy condition operator
export type AbacOperator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "exists"
  | "not_exists";

export interface AbacCondition {
  attributeCategory: "subject" | "resource" | "environment";
  attributeName: string;
  operator: AbacOperator;
  value: unknown;
}

export interface AbacPolicy {
  id: string;
  name: string;
  effect: "allow" | "deny";
  priority: number;
  conditions: AbacCondition[];
}

export interface AbacInput {
  subject: AbacSubject;
  resource: AbacResource;
  action: string;
  environment: AbacEnvironment;
}

export interface AbacResult {
  allowed: boolean;
  matchedPolicyId?: string;
  matchedPolicyName?: string;
  reasonCode?: string;
  checks: Record<string, boolean>;
}

function getAttributeValue(category: AbacCondition["attributeCategory"], name: string, input: AbacInput): unknown {
  const source =
    category === "subject" ? input.subject :
    category === "resource" ? input.resource :
    input.environment;
  return (source as Record<string, unknown>)[name];
}

function evaluateCondition(condition: AbacCondition, input: AbacInput): boolean {
  const attrValue = getAttributeValue(condition.attributeCategory, condition.attributeName, input);
  const expected = condition.value;

  switch (condition.operator) {
    case "exists": return attrValue !== undefined && attrValue !== null;
    case "not_exists": return attrValue === undefined || attrValue === null;
    case "equals": return attrValue === expected;
    case "not_equals": return attrValue !== expected;
    case "gt": return Number(attrValue) > Number(expected);
    case "gte": return Number(attrValue) >= Number(expected);
    case "lt": return Number(attrValue) < Number(expected);
    case "lte": return Number(attrValue) <= Number(expected);
    case "in": return Array.isArray(expected) && expected.includes(attrValue);
    case "not_in": return Array.isArray(expected) && !expected.includes(attrValue);
    case "contains": return typeof attrValue === "string" && attrValue.includes(String(expected));
    default: return false;
  }
}

function policyMatches(policy: AbacPolicy, input: AbacInput): boolean {
  if (policy.conditions.length === 0) return true;
  return policy.conditions.every((c) => evaluateCondition(c, input));
}

function regionScopeMatches(subject: AbacSubject, resource: AbacResource): boolean {
  if (subject.villageCodes?.length && resource.officialVillageCode) {
    return subject.villageCodes.includes(resource.officialVillageCode);
  }
  if (subject.localRegionIds?.length && resource.localRegionId) {
    return subject.localRegionIds.includes(resource.localRegionId);
  }
  return true; // No explicit scope means no restriction (leave to other policies)
}

function isPublicUser(subject: AbacSubject): boolean {
  return subject.roles.length === 0 || (subject.roles.length === 1 && subject.roles[0] === "public");
}

// Core ABAC evaluation with deny precedence
export function evaluateAbac(
  input: AbacInput,
  policies: AbacPolicy[],
  ctx: SikesraRequestContext,
): AbacResult {
  const checks: Record<string, boolean> = {};

  // Hard-wired rules (always evaluate)
  checks["tenant_match"] = input.subject.tenantId === ctx.tenantId;
  checks["site_match"] = input.subject.siteId === ctx.siteId;

  if (!checks["tenant_match"]) {
    return { allowed: false, reasonCode: "tenant_mismatch", checks };
  }

  // Region scope check
  checks["region_scope"] = regionScopeMatches(input.subject, input.resource);

  // Public user cannot access entity detail
  if (isPublicUser(input.subject) && input.resource.resourceType === "entity") {
    return { allowed: false, reasonCode: "public_denied_entity_detail", checks };
  }

  // Evaluate policies sorted by priority (higher = evaluated first)
  // Deny precedence: deny overrides allow if both match
  const sorted = [...policies].sort((a, b) => b.priority - a.priority);
  let allowMatched = false;
  let denyMatched = false;
  let matchedPolicyId: string | undefined;
  let matchedPolicyName: string | undefined;

  for (const policy of sorted) {
    if (!policyMatches(policy, input)) continue;

    if (policy.effect === "deny") {
      denyMatched = true;
      matchedPolicyId = policy.id;
      matchedPolicyName = policy.name;
      break; // Deny takes precedence, stop evaluating
    }

    if (policy.effect === "allow" && !denyMatched) {
      allowMatched = true;
      matchedPolicyId = policy.id;
      matchedPolicyName = policy.name;
    }
  }

  const allowed = !denyMatched && (allowMatched || policies.length === 0);

  return {
    allowed,
    matchedPolicyId,
    matchedPolicyName,
    reasonCode: denyMatched ? "abac_deny" : allowMatched ? undefined : "no_matching_policy",
    checks,
  };
}

// Build ABAC subject from trusted request context
export function buildAbacSubject(ctx: SikesraRequestContext): AbacSubject {
  return {
    roles: ctx.roles,
    permissions: ctx.permissions,
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    villageCodes: ctx.regionScope.villageCodes,
    districtCodes: ctx.regionScope.districtCodes,
    regencyCode: ctx.regionScope.regencyCode,
    provinceCode: ctx.regionScope.provinceCode,
    localRegionIds: ctx.regionScope.localRegionIds,
  };
}

// Convenience: load policies from D1 and evaluate in one call
import type { D1Binding } from "../repositories/db";
import { loadAbacPolicies } from "../repositories/abac-repository";

export async function evaluateAbacWithDb(
  db: D1Binding,
  input: AbacInput,
  ctx: SikesraRequestContext,
): Promise<AbacResult> {
  const policies = await loadAbacPolicies(db, ctx);
  return evaluateAbac(input, policies, ctx);
}
