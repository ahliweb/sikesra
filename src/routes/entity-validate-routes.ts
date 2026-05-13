// SIKESRA Entity Validation Route Handler
// v1/entities/validate

import { buildContextFromEmDash, type EmDashRouteContext } from "./handler-utils";
import { validateEntitySections } from "../services/completeness";
import { getRouteDb } from "./route-db";

// POST /entities/validate — validate all sections for an entity
export const entityValidateHandler = async (routeCtx: EmDashRouteContext<{ entityId: string }>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  const input = routeCtx.input;
  if (!input?.entityId) throw new Error("ENTITY_ID_REQUIRED");

  return validateEntitySections(db, input.entityId, ctx);
};
