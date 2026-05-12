// SIKESRA Entity People/Relationships API Routes
// v1/entities/people/*
// Source: docs/sikesra/04_api_contracts.md

import { buildContextFromEmDash, handleAdminRequest, type EmDashRouteContext } from "./handler-utils";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import {
  addEntityPerson,
  updateEntityPerson,
  removeEntityPerson,
  getEntityPerson,
  listEntityPeople,
  type EntityPersonInput,
} from "../services/entity-people";
import { getRouteDb } from "./route-db";

// GET /entities/:id/people — list entity people
export const entityPeopleListHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ENTITY_READ)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const entityId = parts[parts.indexOf("entities") + 1];

  const people = await listEntityPeople(db, entityId, ctx);
  return { people };
};

// POST /entities/:id/people — add person to entity
export const entityPeopleAddHandler = async (routeCtx: EmDashRouteContext<EntityPersonInput>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ENTITY_UPDATE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const input = routeCtx.input;
  if (!input?.entityId) throw new Error("ENTITY_ID_REQUIRED");
  if (!input?.personProfileId) throw new Error("PERSON_PROFILE_ID_REQUIRED");
  if (!input?.relationType) throw new Error("RELATION_TYPE_REQUIRED");

  return handleAdminRequest(routeCtx, { resourceType: "entity", entityId: input.entityId }, "update", async (_input, _db, _ctx) => {
    return addEntityPerson(db, input, ctx);
  });
};

// PATCH /entities/people/:id — update entity person
export const entityPeopleUpdateHandler = async (routeCtx: EmDashRouteContext<Partial<EntityPersonInput>>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ENTITY_UPDATE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const peopleId = parts[parts.indexOf("people") + 1];

  const input = routeCtx.input;
  if (!input) throw new Error("UPDATE_INPUT_REQUIRED");

  await updateEntityPerson(db, peopleId, input, ctx);
  return { success: true };
};

// DELETE /entities/people/:id — remove person from entity
export const entityPeopleRemoveHandler = async (routeCtx: EmDashRouteContext) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  if (!ctx.permissions.includes(SIKESRA_PERMISSIONS.ENTITY_UPDATE)) {
    throw new Error("PERMISSION_DENIED");
  }

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const peopleId = parts[parts.indexOf("people") + 1];

  await removeEntityPerson(db, peopleId, ctx);
  return { success: true };
};
