// SIKESRA Backup Service
// Automated D1 backup and R2 lifecycle management
// Source: docs/sikesra/07_operations_sop.md, Issue #189

import type { D1Binding } from "../repositories/db";

export interface BackupMetadata {
  id: string;
  tenantId: string;
  siteId: string;
  backupType: "d1_export" | "r2_listing" | "restore_test";
  status: "pending" | "running" | "completed" | "failed";
  r2Key?: string;
  sizeBytes?: number;
  entityCount?: number;
  documentCount?: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  r2Key?: string;
  sizeBytes?: number;
  message: string;
}

const BACKUP_TABLE = "awcms_sikesra_backups";

export async function createBackupRecord(
  db: D1Binding,
  tenantId: string,
  siteId: string,
  backupType: BackupMetadata["backupType"],
): Promise<string> {
  const id = `backup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO ${BACKUP_TABLE}
     (id, tenant_id, site_id, backup_type, status, started_at, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(id, tenantId, siteId, backupType, now, now).run();

  return id;
}

export async function updateBackupStatus(
  db: D1Binding,
  backupId: string,
  status: BackupMetadata["status"],
  updates?: {
    r2Key?: string;
    sizeBytes?: number;
    entityCount?: number;
    documentCount?: number;
    errorMessage?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const completedAt = status === "completed" || status === "failed" ? now : null;

  await db.prepare(
    `UPDATE ${BACKUP_TABLE}
     SET status = ?, r2_key = ?, size_bytes = ?, entity_count = ?, document_count = ?,
         error_message = ?, completed_at = COALESCE(?, completed_at), updated_at = ?
     WHERE id = ?`
  ).bind(
    status,
    updates?.r2Key ?? null,
    updates?.sizeBytes ?? null,
    updates?.entityCount ?? null,
    updates?.documentCount ?? null,
    updates?.errorMessage ?? null,
    completedAt,
    now,
    backupId,
  ).run();
}

export async function getRecentBackups(
  db: D1Binding,
  tenantId: string,
  siteId: string,
  limit: number = 10,
): Promise<BackupMetadata[]> {
  const rows = await db.prepare(
    `SELECT * FROM ${BACKUP_TABLE}
     WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
     ORDER BY started_at DESC LIMIT ?`
  ).bind(tenantId, siteId, limit).all<Record<string, unknown>>();

  return rows.results.map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    siteId: String(row.site_id),
    backupType: row.backup_type as BackupMetadata["backupType"],
    status: row.status as BackupMetadata["status"],
    r2Key: row.r2_key ? String(row.r2_key) : undefined,
    sizeBytes: row.size_bytes ? Number(row.size_bytes) : undefined,
    entityCount: row.entity_count ? Number(row.entity_count) : undefined,
    documentCount: row.document_count ? Number(row.document_count) : undefined,
    startedAt: String(row.started_at),
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
  }));
}

export async function getFailedBackups(
  db: D1Binding,
  tenantId: string,
  siteId: string,
  sinceHours: number = 24,
): Promise<BackupMetadata[]> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();

  const rows = await db.prepare(
    `SELECT * FROM ${BACKUP_TABLE}
     WHERE tenant_id = ? AND site_id = ? AND status = 'failed' AND started_at > ? AND deleted_at IS NULL
     ORDER BY started_at DESC`
  ).bind(tenantId, siteId, since).all<Record<string, unknown>>();

  return rows.results.map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    siteId: String(row.site_id),
    backupType: row.backup_type as BackupMetadata["backupType"],
    status: row.status as BackupMetadata["status"],
    r2Key: row.r2_key ? String(row.r2_key) : undefined,
    sizeBytes: row.size_bytes ? Number(row.size_bytes) : undefined,
    entityCount: row.entity_count ? Number(row.entity_count) : undefined,
    documentCount: row.document_count ? Number(row.document_count) : undefined,
    startedAt: String(row.started_at),
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
  }));
}

export interface R2LifecycleRule {
  id: string;
  prefix: string;
  enabled: boolean;
  expiration?: {
    days: number;
  };
  abortIncompleteMultipartUpload?: {
    daysAfterInitiation: number;
  };
}

export const DEFAULT_R2_LIFECYCLE_RULES: R2LifecycleRule[] = [
  {
    id: "abort-multipart-uploads",
    prefix: "uploads/",
    enabled: true,
    abortIncompleteMultipartUpload: { daysAfterInitiation: 7 },
  },
  {
    id: "import-staging-cleanup",
    prefix: "imports/staging/",
    enabled: true,
    expiration: { days: 30 },
  },
  {
    id: "export-temp-cleanup",
    prefix: "exports/temp/",
    enabled: true,
    expiration: { days: 14 },
  },
  {
    id: "document-backup-retention",
    prefix: "documents/backups/",
    enabled: true,
    expiration: { days: 90 },
  },
  {
    id: "backup-retention",
    prefix: "backups/",
    enabled: true,
    expiration: { days: 365 },
  },
];
