// SIKESRA ABAC Policy and Attribute API Routes
// v1/abac/policies/* and v1/abac/attributes/*
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/06_security_rbac_abac.md

import { buildContextFromEmDash, type EmDashRouteContext } from "./handler-utils";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import {
  createAbacPolicy,
  updateAbacPolicy,
  activateAbacPolicy,
  deactivateAbacPolicy,
  deleteAbacPolicy,
  getAbacPolicyDetail,
  listAbacPolicies,
  previewAbacPolicy,
  type AbacPolicyInput,
} from "../services/abac-policy-service";
import {
  createAttributeDefinition,
  updateAttributeDefinition,
  activateAttributeDefinition,
  deactivateAttributeDefinition,
  deleteAttributeDefinition,
  getAttributeDefinition,
  listAttributeDefinitions,
  type AttributeDefinitionInput,
} from "../services/abac-attribute-service";
import { getRouteDb } from "./route-db";

// GET /abac/policies — list ABAC policies
export const abacPolicyListHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.POLICY_READ)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const includeInactive = url.searchParams.get("include_inactive") === "true";
  const policies = await listAbacPolicies(db, ctx, includeInactive);
  return { policies };
};

// GET /abac/policies/:id — get ABAC policy detail
export const abacPolicyDetailHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.POLICY_READ)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const policyId = parts[parts.indexOf("policies") + 1];
  const policy = await getAbacPolicyDetail(db, policyId, ctx);
  if (!policy) throw new Error("ABAC_POLICY_NOT_FOUND");
  return { policy };
};

// POST /abac/policies — create ABAC policy
export const abacPolicyCreateHandler = async (routeCtx: EmDashRouteContext<AbacPolicyInput>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.POLICY_WRITE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const input = routeCtx.input;
  if (!input?.name) throw new Error("POLICY_NAME_REQUIRED");
  if (!input.effect || !["allow", "deny"].includes(input.effect)) throw new Error("INVALID_POLICY_EFFECT");
  if (input.priority === undefined || input.priority === null) throw new Error("POLICY_PRIORITY_REQUIRED");
  if (!input.conditions || !Array.isArray(input.conditions)) throw new Error("POLICY_CONDITIONS_REQUIRED");

  return createAbacPolicy(db, input, ctx);
};

// PATCH /abac/policies/:id — update ABAC policy
export const abacPolicyUpdateHandler = async (routeCtx: EmDashRouteContext<Partial<AbacPolicyInput>>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.POLICY_WRITE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const policyId = parts[parts.indexOf("policies") + 1];

  const input = routeCtx.input;
  if (!input) throw new Error("UPDATE_INPUT_REQUIRED");

  await updateAbacPolicy(db, policyId, input, ctx);
  return { success: true };
};

// POST /abac/policies/:id/activate — activate ABAC policy
export const abacPolicyActivateHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.POLICY_WRITE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const policyId = parts[parts.indexOf("policies") + 1];

  await activateAbacPolicy(db, policyId, ctx);
  return { success: true };
};

// POST /abac/policies/:id/deactivate — deactivate ABAC policy
export const abacPolicyDeactivateHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.POLICY_WRITE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const policyId = parts[parts.indexOf("policies") + 1];

  await deactivateAbacPolicy(db, policyId, ctx);
  return { success: true };
};

// DELETE /abac/policies/:id — delete ABAC policy
export const abacPolicyDeleteHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.POLICY_WRITE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const policyId = parts[parts.indexOf("policies") + 1];

  await deleteAbacPolicy(db, policyId, ctx);
  return { success: true };
};

// POST /abac/policies/:id/preview — preview ABAC policy evaluation
export const abacPolicyPreviewHandler = async (routeCtx: EmDashRouteContext<{ testInput: Record<string, unknown> }>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.POLICY_PREVIEW)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const policyId = parts[parts.indexOf("policies") + 1];

  const input = routeCtx.input;
  if (!input?.testInput) throw new Error("TEST_INPUT_REQUIRED");

  return previewAbacPolicy(db, policyId, input.testInput, ctx);
};

// GET /abac/attributes — list attribute definitions
export const abacAttributeListHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ATTRIBUTE_READ)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const category = url.searchParams.get("category");
  const includeInactive = url.searchParams.get("include_inactive") === "true";
  const attributes = await listAttributeDefinitions(db, ctx, category as any, includeInactive);
  return { attributes };
};

// GET /abac/attributes/:id — get attribute definition detail
export const abacAttributeDetailHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ATTRIBUTE_READ)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const attributeId = parts[parts.indexOf("attributes") + 1];
  const attribute = await getAttributeDefinition(db, attributeId, ctx);
  if (!attribute) throw new Error("ATTRIBUTE_DEFINITION_NOT_FOUND");
  return { attribute };
};

// POST /abac/attributes — create attribute definition
export const abacAttributeCreateHandler = async (routeCtx: EmDashRouteContext<AttributeDefinitionInput>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const input = routeCtx.input;
  if (!input?.code) throw new Error("ATTRIBUTE_CODE_REQUIRED");
  if (!input?.name) throw new Error("ATTRIBUTE_NAME_REQUIRED");
  if (!input?.category) throw new Error("ATTRIBUTE_CATEGORY_REQUIRED");

  return createAttributeDefinition(db, input, ctx);
};

// PATCH /abac/attributes/:id — update attribute definition
export const abacAttributeUpdateHandler = async (routeCtx: EmDashRouteContext<Partial<AttributeDefinitionInput>>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const attributeId = parts[parts.indexOf("attributes") + 1];

  const input = routeCtx.input;
  if (!input) throw new Error("UPDATE_INPUT_REQUIRED");

  await updateAttributeDefinition(db, attributeId, input, ctx);
  return { success: true };
};

// POST /abac/attributes/:id/activate — activate attribute definition
export const abacAttributeActivateHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const attributeId = parts[parts.indexOf("attributes") + 1];

  await activateAttributeDefinition(db, attributeId, ctx);
  return { success: true };
};

// POST /abac/attributes/:id/deactivate — deactivate attribute definition
export const abacAttributeDeactivateHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const attributeId = parts[parts.indexOf("attributes") + 1];

  await deactivateAttributeDefinition(db, attributeId, ctx);
  return { success: true };
};

// DELETE /abac/attributes/:id — delete attribute definition
export const abacAttributeDeleteHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const attributeId = parts[parts.indexOf("attributes") + 1];

  await deleteAttributeDefinition(db, attributeId, ctx);
  return { success: true };
};
