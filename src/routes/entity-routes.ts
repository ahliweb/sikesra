// SIKESRA Entity Route Handlers
// Bridges HTTP requests to entity service with admin API + ABAC sequence
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { listEntities, getEntityDetail, createEntity, patchEntity } from "../services/entity";
import { handleAdminRequest, withHandlerSequence, type EmDashRouteContext } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import type { EntityListParams, EntityCreateInput, EntityPatchInput } from "../services/entity";

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
  return handleAdminRequest(routeCtx, { resourceType: "entity", entityId }, "read", async () => {
    return getEntityDetail(routeCtx.env?.SIKESRA_DB!, entityId, {
      requestId: "", tenantId: "default", siteId: "default",
      userId: "stub", roles: ["admin"], permissions: [],
      subjectAttributes: {}, regionScope: {}, nowIso: new Date().toISOString(),
    });
  });
};

// PATCH /entities/:id — ABAC: entity update
export const entityPatchHandler = async (routeCtx: EmDashRouteContext<EntityPatchInput>) => {
  const url = new URL(routeCtx.request.url);
  const entityId = url.pathname.split("/").pop()!;
  return handleAdminRequest(routeCtx, { resourceType: "entity", entityId }, "update", async (input, db, ctx) => {
    return patchEntity(db, entityId, input, ctx);
  });
};
