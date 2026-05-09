// SIKESRA Settings Route Handlers
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { getSettings, updateSettings } from "../services/settings";
import { withHandlerSequence, type RouteHandlerInput } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";

// GET /settings
export const settingsGetHandler = withHandlerSequence(async (_: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  return getSettings(db, ctx);
});

// PATCH /settings
export const settingsUpdateHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const body = input.input as { reason: string } & Record<string, unknown>;
  return updateSettings(db, body, body.reason ?? "settings_update", ctx);
});
