// SIKESRA Region Route Handlers
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { getOfficialRegions, getLocalRegions, createLocalRegion } from "../services/region";
import { withHandlerSequence, type RouteHandlerInput } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";

// GET /regions/official
export const officialRegionsHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const url = new URL(input.request.url);
  return getOfficialRegions(db, ctx, url.searchParams.get("parent") ?? undefined, url.searchParams.get("level") as never);
});

// GET /regions/local
export const localRegionsHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const url = new URL(input.request.url);
  return getLocalRegions(db, ctx, url.searchParams.get("village") ?? undefined);
});

// POST /regions/local
export const localRegionCreateHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  return createLocalRegion(db, input.input as never, ctx);
});
