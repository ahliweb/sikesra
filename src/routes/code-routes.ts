// SIKESRA Code Correction API Route
// v1/code/correct
// Source: docs/sikesra/04_api_contracts.md

import { buildContextFromEmDash, handleAdminRequest, withRateLimitRequest, type EmDashRouteContext } from "./handler-utils";
import { correctSikesraId } from "../services/code";
import { getRouteDb } from "./route-db";
import type { D1Binding } from "../repositories/db";
import type { SikesraRequestContext } from "../security/request-context";

// POST /code/correct — correct SIKESRA ID
// Rate limited: max 10 corrections per hour per user
export const codeCorrectHandler = withRateLimitRequest(
  async (routeCtx: EmDashRouteContext, db: D1Binding, ctx: SikesraRequestContext) => {
    const input = routeCtx.input as { entityId: string; newId: string; reason: string };
    if (!input?.entityId) throw new Error("ENTITY_ID_REQUIRED");
    if (!input?.newId) throw new Error("NEW_ID_REQUIRED");
    if (!input?.reason) throw new Error("REASON_REQUIRED");

    return handleAdminRequest(routeCtx, { resourceType: "entity", entityId: input.entityId }, "correct", async (_input, _db, _ctx) => {
      return correctSikesraId(db, input.entityId, input.newId, input.reason, ctx);
    });
  },
  "id_correction"
);
