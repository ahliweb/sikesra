// SIKESRA Settings Service
// Module settings: public visibility, thresholds, limits, feature flags
// Source: docs/sikesra/04_api_contracts.md

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { getSettingsRepo, updateSettingsRepo } from "../repositories/settings-repository";

export interface SikesraSettings {
  publicEnabled: boolean;
  publicTitle: string;
  publicDescription?: string;
  dataScopeNote?: string;
  officialContact?: string;
  smallCellThreshold: number;
  maxUploadBytes: number;
  allowedMimeTypes?: string[];
  exportMaxSyncRows: number;
  requireReasonForHighlyRestrictedDownload: boolean;
  featureFlags?: Record<string, boolean>;
}

export interface SettingsUpdateInput {
  publicEnabled?: boolean;
  publicTitle?: string;
  publicDescription?: string;
  dataScopeNote?: string;
  officialContact?: string;
  smallCellThreshold?: number;
  maxUploadBytes?: number;
  allowedMimeTypes?: string[];
  exportMaxSyncRows?: number;
  requireReasonForHighlyRestrictedDownload?: boolean;
  featureFlags?: Record<string, boolean>;
}

export async function getSettings(db: D1Binding, ctx: SikesraRequestContext): Promise<SikesraSettings> {
  return getSettingsRepo(db, ctx);
}

export async function updateSettings(
  db: D1Binding,
  input: SettingsUpdateInput,
  reason: string,
  ctx: SikesraRequestContext,
): Promise<SikesraSettings> {
  return updateSettingsRepo(db, input, ctx.userId, ctx);
}
