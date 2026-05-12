// SIKESRA Settings Repository
// D1 SQL for module settings
// Source: docs/sikesra/03_data_model.md

import type { D1Binding } from "./db";
import type { SikesraRequestContext } from "../security/request-context";
import type { SikesraSettings, SettingsUpdateInput } from "../services/settings";

const TABLE = "awcms_sikesra_settings";

function toSettings(row: Record<string, unknown>): SikesraSettings {
  return {
    publicEnabled: !!(row.public_enabled),
    publicTitle: (row.public_title as string) ?? "SIKESRA",
    publicDescription: row.public_description as string | undefined,
    dataScopeNote: row.data_scope_note as string | undefined,
    officialContact: row.official_contact as string | undefined,
    smallCellThreshold: (row.small_cell_threshold as number) ?? 5,
    maxUploadBytes: (row.max_upload_bytes as number) ?? 10485760,
    allowedMimeTypes: row.allowed_mime_types_json ? JSON.parse(row.allowed_mime_types_json as string) : undefined,
    exportMaxSyncRows: (row.export_max_sync_rows as number) ?? 5000,
    requireReasonForHighlyRestrictedDownload: !!(row.require_reason_for_highly_restricted_download),
    featureFlags: row.feature_flags_json ? JSON.parse(row.feature_flags_json as string) : undefined,
  };
}

export async function getSettingsRepo(
  db: D1Binding,
  ctx: SikesraRequestContext,
): Promise<SikesraSettings> {
  const sql = `SELECT * FROM ${TABLE} WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL LIMIT 1`;
  const row = await db.prepare(sql).bind(ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();
  if (!row) {
    return {
      publicEnabled: false, publicTitle: "SIKESRA",
      smallCellThreshold: 5, maxUploadBytes: 10485760,
      exportMaxSyncRows: 5000, requireReasonForHighlyRestrictedDownload: true,
    };
  }
  return toSettings(row);
}

export async function updateSettingsRepo(
  db: D1Binding,
  input: SettingsUpdateInput,
  updatedBy: string,
  ctx: SikesraRequestContext,
): Promise<SikesraSettings> {
  const existing = await db.prepare(
    `SELECT id FROM ${TABLE} WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL LIMIT 1`,
  ).bind(ctx.tenantId, ctx.siteId).first<{ id: string }>();

  if (!existing) {
    const id = `settings_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.prepare(
      `INSERT INTO ${TABLE} (
        id, tenant_id, site_id, public_enabled, public_title, public_description,
        data_scope_note, official_contact, small_cell_threshold, max_upload_bytes,
        allowed_mime_types_json, export_max_sync_rows,
        require_reason_for_highly_restricted_download, feature_flags_json,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      ctx.tenantId,
      ctx.siteId,
      input.publicEnabled === true ? 1 : 0,
      input.publicTitle ?? "SIKESRA",
      input.publicDescription ?? null,
      input.dataScopeNote ?? null,
      input.officialContact ?? null,
      input.smallCellThreshold ?? 5,
      input.maxUploadBytes ?? 10485760,
      input.allowedMimeTypes ? JSON.stringify(input.allowedMimeTypes) : null,
      input.exportMaxSyncRows ?? 5000,
      input.requireReasonForHighlyRestrictedDownload === false ? 0 : 1,
      input.featureFlags ? JSON.stringify(input.featureFlags) : null,
      updatedBy,
      updatedBy,
    ).run();

    return getSettingsRepo(db, ctx);
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];

  const fieldMap: Record<string, string> = {
    publicEnabled: "public_enabled", publicTitle: "public_title",
    publicDescription: "public_description", dataScopeNote: "data_scope_note",
    officialContact: "official_contact", smallCellThreshold: "small_cell_threshold",
    maxUploadBytes: "max_upload_bytes", exportMaxSyncRows: "export_max_sync_rows",
    requireReasonForHighlyRestrictedDownload: "require_reason_for_highly_restricted_download",
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    const val = (input as Record<string, unknown>)[key];
    if (val !== undefined) {
      setClauses.push(`${column} = ?`);
      params.push(typeof val === "boolean" ? (val ? 1 : 0) : val);
    }
  }

  if (input.allowedMimeTypes !== undefined) {
    setClauses.push("allowed_mime_types_json = ?");
    params.push(JSON.stringify(input.allowedMimeTypes));
  }
  if (input.featureFlags !== undefined) {
    setClauses.push("feature_flags_json = ?");
    params.push(JSON.stringify(input.featureFlags));
  }

  if (setClauses.length === 0) return getSettingsRepo(db, ctx);

  setClauses.push("updated_at = datetime('now')", "updated_by = ?");
  params.push(updatedBy, ctx.tenantId, ctx.siteId);

  await db.prepare(
    `UPDATE ${TABLE} SET ${setClauses.join(", ")} WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(...params).run();

  return getSettingsRepo(db, ctx);
}
