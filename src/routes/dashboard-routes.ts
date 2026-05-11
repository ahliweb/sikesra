// SIKESRA Dashboard Route Handler
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { getAdminDashboard } from "../services/dashboard";
import { getPublicMetadata, getPublicFilters, getPublicSummary } from "../services/public";
import { buildContextFromEmDash, withHandlerSequence, type EmDashRouteContext, type RouteHandlerInput } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import { getRouteDb } from "./route-db";

// GET /dashboard
export const dashboardHandler = withHandlerSequence(async (_: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  return getAdminDashboard(ctx, db);
});

// Public routes (no auth required)
export const publicMetadataHandler = async (routeCtx: EmDashRouteContext) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = await getRouteDb(routeCtx.request);
  return getPublicMetadata(db, ctx);
};

export const publicFiltersHandler = async (routeCtx: EmDashRouteContext) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = await getRouteDb(routeCtx.request);
  return getPublicFilters(db, ctx);
};

export const publicSummaryHandler = async (routeCtx: EmDashRouteContext) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = await getRouteDb(routeCtx.request);
  const url = new URL(routeCtx.request.url);
  const year = url.searchParams.get("year");

  return getPublicSummary(db, ctx, {
    districtCode: url.searchParams.get("districtCode") ?? undefined,
    villageCode: url.searchParams.get("villageCode") ?? undefined,
    objectTypeCode: url.searchParams.get("objectTypeCode") ?? undefined,
    year: year ? Number(year) : undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
};
