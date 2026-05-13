// SIKESRA Deduplication v1 API Route Handlers
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { findDuplicateCandidates, recordDuplicateDecisionAction, detectBatchDuplicates, type DuplicateDecision } from "../services/deduplication";
import { withHandlerSequence, type RouteHandlerInput } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";

// GET /v1/duplicates
export const duplicatesListHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const url = new URL(input.request.url);
  const result = await findDuplicateCandidates(db, {
    importBatchId: url.searchParams.get("importBatchId") ?? undefined,
    entityId: url.searchParams.get("entityId") ?? undefined,
  }, ctx);

  return result;
});

// POST /v1/duplicates/decide
export const duplicatesDecideHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const body = await input.request.json() as Record<string, unknown>;
  const candidateId = String(body.candidateId ?? "");
  const decision = String(body.decision ?? "") as DuplicateDecision;
  const reason = String(body.reason ?? "");

  if (!candidateId) throw new Error("candidateId is required");
  if (!["skip", "promote_as_new", "merge", "dismiss", "confirm_duplicate"].includes(decision)) {
    throw new Error("decision must be one of: skip, promote_as_new, merge, dismiss, confirm_duplicate");
  }

  return recordDuplicateDecisionAction(db, candidateId, decision, reason, ctx);
});

// POST /v1/duplicates/detect
export const duplicatesDetectHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const body = await input.request.json() as Record<string, unknown>;
  const importBatchId = String(body.importBatchId ?? "");

  if (!importBatchId) throw new Error("importBatchId is required");

  return detectBatchDuplicates(db, importBatchId, ctx);
});
