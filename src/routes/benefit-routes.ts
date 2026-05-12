// SIKESRA Benefit/Service History Route Handlers
// Source: docs/sikesra/04_api_contracts.md

import { buildContextFromEmDash, withHandlerSequence, type EmDashRouteContext } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { listEntityBenefits, createBenefit, updateBenefit, deleteBenefit, type BenefitHistoryInput } from "../services/benefits";
import { getRouteDb } from "./route-db";

// GET /entities/:id/benefits
export const entityBenefitsHandler = withHandlerSequence(async (input: { request: Request }, db: D1Binding, ctx: SikesraRequestContext) => {
  const url = new URL(input.request.url);
  const parts = url.pathname.split("/");
  const entityId = parts[parts.indexOf("entities") + 1];
  return listEntityBenefits(db, entityId, ctx);
});

// POST /entities/benefits/create
export const benefitCreateHandler = async (routeCtx: EmDashRouteContext<BenefitHistoryInput>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  const input = routeCtx.input;
  if (!input?.entityId) throw new Error("ENTITY_ID_REQUIRED");
  if (!input?.benefitType) throw new Error("BENEFIT_TYPE_REQUIRED");

  return createBenefit(db, input, ctx);
};

// PATCH /entities/benefits/update
export const benefitUpdateHandler = async (routeCtx: EmDashRouteContext<{ benefitId: string } & Partial<BenefitHistoryInput>>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  const input = routeCtx.input;
  if (!input?.benefitId) throw new Error("BENEFIT_ID_REQUIRED");

  const { benefitId, ...updateData } = input;
  await updateBenefit(db, benefitId, updateData, ctx);
  return { success: true, benefitId };
};

// POST /entities/benefits/delete
export const benefitDeleteHandler = async (routeCtx: EmDashRouteContext<{ benefitId: string }>) => {
  const db = await getRouteDb(routeCtx.request);
  const ctx = buildContextFromEmDash(routeCtx);

  const input = routeCtx.input;
  if (!input?.benefitId) throw new Error("BENEFIT_ID_REQUIRED");

  await deleteBenefit(db, input.benefitId, ctx);
  return { success: true, benefitId: input.benefitId };
};
