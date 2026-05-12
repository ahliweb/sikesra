// SIKESRA Code Correction API Route
// v1/code/correct
// Source: docs/sikesra/04_api_contracts.md

import { buildContextFromEmDash, handleAdminRequest, type EmDashRouteContext } from "./handler-utils";
import { correctSikesraId } from "../services/code";
import { getRouteDb } from "./route-db";

// POST /code/correct — correct SIKESRA ID
export const codeCorrectHandler = async (routeCtx: EmDashRouteContext<{ entityId: string; newId: string; reason: string }>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  const input = routeCtx.input;
  if (!input?.entityId) throw new Error("ENTITY_ID_REQUIRED");
  if (!input?.newId) throw new Error("NEW_ID_REQUIRED");
  if (!input?.reason) throw new Error("REASON_REQUIRED");

  return handleAdminRequest(routeCtx, { resourceType: "entity", entityId: input.entityId }, "correct", async (_input, _db, _ctx) => {
    return correctSikesraId(db, input.entityId, input.newId, input.reason, ctx);
  });
};
