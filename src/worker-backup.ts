// SIKESRA Backup Cron Worker
// Automated D1 backup and R2 lifecycle management
// Source: docs/sikesra/07_operations_sop.md, Issue #189

import type { D1Binding } from "../repositories/db";
import { createBackupRecord, updateBackupStatus, DEFAULT_R2_LIFECYCLE_RULES } from "../services/backup";

interface R2Bucket {
  put(key: string, value: ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
  head(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ objects: Array<{ key: string; size: number }> }>;
}

export interface BackupEnv {
  SIKESRA_DB: D1Binding;
  SIKESRA_DOCUMENTS: R2Bucket;
  SESSION: KVNamespace;
}

export async function runDailyBackup(env: BackupEnv, tenantId: string, siteId: string): Promise<void> {
  const backupId = await createBackupRecord(env.SIKESRA_DB, tenantId, siteId, "d1_export");

  try {
    await updateBackupStatus(env.SIKESRA_DB, backupId, "running");

    // Export entity data
    const entityCount = await exportEntityData(env, tenantId, siteId, backupId);

    // Export document metadata
    const documentCount = await exportDocumentMetadata(env, tenantId, siteId, backupId);

    // Export audit logs
    await exportAuditLogs(env, tenantId, siteId, backupId);

    await updateBackupStatus(env.SIKESRA_DB, backupId, "completed", {
      entityCount,
      documentCount,
    });

    console.log(`Backup ${backupId} completed successfully for ${tenantId}/${siteId}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await updateBackupStatus(env.SIKESRA_DB, backupId, "failed", { errorMessage });
    console.error(`Backup ${backupId} failed for ${tenantId}/${siteId}: ${errorMessage}`);
  }
}

async function exportEntityData(
  env: BackupEnv,
  tenantId: string,
  siteId: string,
  backupId: string,
): Promise<number> {
  const entities = await env.SIKESRA_DB.prepare(
    `SELECT * FROM awcms_sikesra_entities WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(tenantId, siteId).all();

  const r2Key = `backups/${tenantId}/${siteId}/${backupId}/entities.json`;
  await env.SIKESRA_DOCUMENTS.put(r2Key, JSON.stringify(entities.results, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });

  return entities.results.length;
}

async function exportDocumentMetadata(
  env: BackupEnv,
  tenantId: string,
  siteId: string,
  backupId: string,
): Promise<number> {
  const documents = await env.SIKESRA_DB.prepare(
    `SELECT id, tenant_id, site_id, entity_id, document_type, classification, mime_type, size_bytes, is_verified, created_at
     FROM awcms_sikesra_documents WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(tenantId, siteId).all();

  const r2Key = `backups/${tenantId}/${siteId}/${backupId}/documents.json`;
  await env.SIKESRA_DOCUMENTS.put(r2Key, JSON.stringify(documents.results, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });

  return documents.results.length;
}

async function exportAuditLogs(
  env: BackupEnv,
  tenantId: string,
  siteId: string,
  backupId: string,
): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const auditLogs = await env.SIKESRA_DB.prepare(
    `SELECT * FROM awcms_sikesra_audit_logs WHERE tenant_id = ? AND site_id = ? AND created_at > ? AND deleted_at IS NULL`
  ).bind(tenantId, siteId, sevenDaysAgo).all();

  const r2Key = `backups/${tenantId}/${siteId}/${backupId}/audit_logs.json`;
  await env.SIKESRA_DOCUMENTS.put(r2Key, JSON.stringify(auditLogs.results, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}

export async function runWeeklyR2Listing(env: BackupEnv, tenantId: string, siteId: string): Promise<void> {
  const backupId = await createBackupRecord(env.SIKESRA_DB, tenantId, siteId, "r2_listing");

  try {
    await updateBackupStatus(env.SIKESRA_DB, backupId, "running");

    // List all objects in R2 bucket
    const listing = await env.SIKESRA_DOCUMENTS.list({ limit: 10000 });

    // Store listing in R2
    const r2Key = `backups/${tenantId}/${siteId}/${backupId}/r2_listing.json`;
    await env.SIKESRA_DOCUMENTS.put(r2Key, JSON.stringify(listing.objects, null, 2), {
      httpMetadata: { contentType: "application/json" },
    });

    // Store listing metadata in D1 for audit trail
    await updateBackupStatus(env.SIKESRA_DB, backupId, "completed", {
      r2Key,
      sizeBytes: listing.objects.reduce((sum, obj) => sum + obj.size, 0),
    });

    console.log(`R2 listing backup ${backupId} completed for ${tenantId}/${siteId}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await updateBackupStatus(env.SIKESRA_DB, backupId, "failed", { errorMessage });
    console.error(`R2 listing backup ${backupId} failed for ${tenantId}/${siteId}: ${errorMessage}`);
  }
}

export function getR2LifecycleRules(): typeof DEFAULT_R2_LIFECYCLE_RULES {
  return DEFAULT_R2_LIFECYCLE_RULES;
}
