// SIKESRA Entity Route Handlers
// Bridges HTTP requests to entity service with admin API + ABAC sequence
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { listEntities, getEntityDetail, createEntity, patchEntity, deleteEntity, restoreEntity } from "../services/entity";
import { handleAdminRequest, withHandlerSequence, type EmDashRouteContext } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import type { EntityListParams, EntityCreateInput, EntityPatchInput, EntityDeleteInput, EntityPatchData } from "../services/entity";

// GET /entities — ABAC evaluated per entity by repository region scope
export const entityListHandler = withHandlerSequence(async (input: EntityListParams, db: D1Binding, ctx: SikesraRequestContext) => {
  return listEntities(db, input, ctx);
});

// POST /entities — ABAC: allow create for authenticated users
export const entityCreateHandler = async (routeCtx: EmDashRouteContext<EntityCreateInput>) => {
  return handleAdminRequest(routeCtx, { resourceType: "entity" }, "create", async (input, db, ctx) => {
    return createEntity(db, input, ctx);
  });
};

// GET /entities/:id — ABAC: entity read
export const entityDetailHandler = async (routeCtx: EmDashRouteContext) => {
  const url = new URL(routeCtx.request.url);
  const entityId = url.pathname.split("/").pop()!;
  return handleAdminRequest(routeCtx, { resourceType: "entity", entityId }, "read", async (_input, db, ctx) => {
    return getEntityDetail(db, entityId, ctx);
  });
};

// PATCH /entities/:id — ABAC: entity update
export const entityPatchHandler = async (routeCtx: EmDashRouteContext<EntityPatchInput>) => {
  const input = routeCtx.input;
  if (!input?.entityId) throw new Error("ENTITY_ID_REQUIRED");
  return handleAdminRequest(routeCtx, { resourceType: "entity", entityId: input.entityId }, "update", async (_input, db, ctx) => {
    const { entityId, ...patchData } = input;
    return patchEntity(db, entityId, patchData as EntityPatchData, ctx);
  });
};

// POST /entities/delete — ABAC: entity delete (soft delete)
export const entityDeleteHandler = async (routeCtx: EmDashRouteContext<EntityDeleteInput>) => {
  const input = routeCtx.input;
  if (!input?.entityId) throw new Error("ENTITY_ID_REQUIRED");
  return handleAdminRequest(routeCtx, { resourceType: "entity", entityId: input.entityId }, "delete", async (_input, db, ctx) => {
    return deleteEntity(db, input, ctx);
  });
};

// POST /entities/restore — ABAC: entity restore
export const entityRestoreHandler = async (routeCtx: EmDashRouteContext<{ entityId: string; reason?: string }>) => {
  const input = routeCtx.input;
  if (!input?.entityId) throw new Error("ENTITY_ID_REQUIRED");
  return handleAdminRequest(routeCtx, { resourceType: "entity", entityId: input.entityId }, "restore", async (_input, db, ctx) => {
    return restoreEntity(db, input, ctx);
  });
};
