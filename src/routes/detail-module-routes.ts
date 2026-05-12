// SIKESRA Detail Modules API Routes
// v1/entities/detail-module/*
// Source: docs/sikesra/04_api_contracts.md

import { buildContextFromEmDash, handleAdminRequest, type EmDashRouteContext } from "./handler-utils";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import {
  getEntityDetailModule,
  upsertEntityDetailModule,
  deleteEntityDetailModule,
  DETAIL_MODULE_SCHEMAS,
  type DetailModuleData,
} from "../services/detail-modules";
import { getRouteDb } from "./route-db";

// GET /entities/detail-module — get entity detail module
export const entityDetailModuleGetHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ENTITY_READ)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const entityId = url.searchParams.get("entityId");
  const objectTypeCode = url.searchParams.get("objectTypeCode");

  if (!entityId || !objectTypeCode) throw new Error("ENTITY_ID_AND_OBJECT_TYPE_REQUIRED");

  const detail = await getEntityDetailModule(db, entityId, objectTypeCode, ctx);
  const schema = DETAIL_MODULE_SCHEMAS[objectTypeCode];

  return { detail, schema };
};

// POST /entities/detail-module — upsert entity detail module
export const entityDetailModuleUpsertHandler = async (routeCtx: EmDashRouteContext<{ entityId: string; objectTypeCode: string; data: DetailModuleData }>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ENTITY_UPDATE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const input = routeCtx.input;
  if (!input?.entityId) throw new Error("ENTITY_ID_REQUIRED");
  if (!input?.objectTypeCode) throw new Error("OBJECT_TYPE_CODE_REQUIRED");
  if (!input?.data) throw new Error("DETAIL_DATA_REQUIRED");

  return handleAdminRequest(routeCtx, { resourceType: "entity", entityId: input.entityId }, "update", async (_input, _db, _ctx) => {
    return upsertEntityDetailModule(db, input.entityId, input.objectTypeCode, input.data, ctx);
  });
};

// DELETE /entities/detail-module — delete entity detail module
export const entityDetailModuleDeleteHandler = async (routeCtx: EmDashRouteContext<{ entityId: string; objectTypeCode: string }>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ENTITY_UPDATE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const input = routeCtx.input;
  if (!input?.entityId) throw new Error("ENTITY_ID_REQUIRED");
  if (!input?.objectTypeCode) throw new Error("OBJECT_TYPE_CODE_REQUIRED");

  await deleteEntityDetailModule(db, input.entityId, input.objectTypeCode, ctx);
  return { success: true };
};
