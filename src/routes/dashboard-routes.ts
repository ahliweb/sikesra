// SIKESRA Dashboard Route Handler
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { getAdminDashboard } from "../services/dashboard";
import { getPublicMetadata, getPublicFilters, getPublicSummary } from "../services/public";
import { withHandlerSequence, type RouteHandlerInput } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";

// GET /dashboard
export const dashboardHandler = withHandlerSequence(async (_: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  return getAdminDashboard(ctx);
});

// Public routes (no auth required)
export const publicMetadataHandler = withHandlerSequence(async () => getPublicMetadata());
export const publicFiltersHandler = withHandlerSequence(async () => getPublicFilters());
export const publicSummaryHandler = withHandlerSequence(async () => getPublicSummary());
