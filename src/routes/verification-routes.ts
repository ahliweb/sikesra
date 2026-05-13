// SIKESRA Verification v1 API Route Handlers
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { getVerificationQueue, submitEntity, verifyEntity, getVerificationTimeline, type VerificationQueueFilters, type VerificationDecision, type VerificationLevel } from "../services/verification";
import { withHandlerSequence, type RouteHandlerInput } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";

// GET /v1/verification/queue
export const verificationQueueHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const url = new URL(input.request.url);
  const filters: VerificationQueueFilters = {
    level: (url.searchParams.get("level") as VerificationLevel) ?? undefined,
    moduleCode: url.searchParams.get("moduleCode") ?? undefined,
    regionCode: url.searchParams.get("regionCode") ?? undefined,
    submissionAge: (url.searchParams.get("submissionAge") as VerificationQueueFilters["submissionAge"]) ?? undefined,
    risk: (url.searchParams.get("risk") as VerificationQueueFilters["risk"]) ?? undefined,
    completeness: (url.searchParams.get("completeness") as VerificationQueueFilters["completeness"]) ?? undefined,
    duplicateStatus: url.searchParams.get("duplicateStatus") ?? undefined,
  };

  return getVerificationQueue(db, filters, ctx);
});

// POST /v1/verification/submit
export const verificationSubmitHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const body = await input.request.json() as Record<string, unknown>;
  const entityId = String(body.entityId ?? "");
  if (!entityId) throw new Error("entityId is required");

  return submitEntity(db, entityId, ctx);
});

// POST /v1/verification/verify
export const verificationVerifyHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const body = await input.request.json() as Record<string, unknown>;
  const entityId = String(body.entityId ?? "");
  const action = String(body.action ?? "");
  const note = typeof body.note === "string" ? body.note : undefined;
  const verificationLevel = String(body.verificationLevel ?? "desa") as VerificationLevel;

  if (!entityId) throw new Error("entityId is required");
  if (!["verify", "need_revision", "reject"].includes(action)) throw new Error("action must be one of: verify, need_revision, reject");

  const decision: VerificationDecision = {
    action: action as VerificationDecision["action"],
    note,
    verificationLevel,
  };

  return verifyEntity(db, entityId, decision, ctx);
});

// GET /v1/verification/timeline
export const verificationTimelineHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const url = new URL(input.request.url);
  const entityId = url.searchParams.get("entityId");
  if (!entityId) throw new Error("entityId is required");

  return getVerificationTimeline(db, entityId, ctx);
});
