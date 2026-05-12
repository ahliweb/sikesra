// SIKESRA Settings Service
// Module settings: public visibility, thresholds, limits, feature flags
// Source: docs/sikesra/04_api_contracts.md

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { getSettingsRepo, updateSettingsRepo } from "../repositories/settings-repository";
import { AUDIT_ACTIONS, writeAuditEvent } from "./audit";

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
  const before = await getSettingsRepo(db, ctx);
  const updated = await updateSettingsRepo(db, input, ctx.userId, ctx);

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.SETTINGS_UPDATE,
      resourceType: "settings",
      resourceId: `${ctx.tenantId}:${ctx.siteId}`,
      requestId: ctx.requestId,
      success: true,
      reason,
      before: before as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return updated;
}
