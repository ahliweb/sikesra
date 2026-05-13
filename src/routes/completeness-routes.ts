// SIKESRA Completeness v1 API Route Handlers
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { validateCompleteness, batchValidateCompleteness, updateCompletenessPercent, type CompletenessCheckParams } from "../services/completeness";
import { withHandlerSequence, type RouteHandlerInput } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";

// GET /v1/completeness/check
export const completenessCheckHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const url = new URL(input.request.url);
  const entityId = url.searchParams.get("entityId");
  if (!entityId) throw new Error("entityId is required");

  const params: CompletenessCheckParams = {
    entityId,
    minThreshold: url.searchParams.has("minThreshold") ? Number(url.searchParams.get("minThreshold")) : undefined,
    blockOnMissingRequired: url.searchParams.get("blockOnMissingRequired") === "true",
  };

  return validateCompleteness(db, params, ctx);
});

// POST /v1/completeness/batch-check
export const completenessBatchCheckHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const body = await input.request.json() as Record<string, unknown>;
  const entityIds = Array.isArray(body.entityIds) ? body.entityIds.map(String) : [];
  if (entityIds.length === 0) throw new Error("entityIds array is required");
  if (entityIds.length > 100) throw new Error("Maximum 100 entities per batch check");

  return batchValidateCompleteness(db, entityIds, ctx);
});

// POST /v1/completeness/update
export const completenessUpdateHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const body = await input.request.json() as Record<string, unknown>;
  const entityId = String(body.entityId ?? "");
  if (!entityId) throw new Error("entityId is required");

  const newPercent = await updateCompletenessPercent(db, entityId, ctx);
  return { ok: true, completenessPercent: newPercent };
});
