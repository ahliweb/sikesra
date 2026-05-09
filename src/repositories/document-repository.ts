// SIKESRA Document Repository
// D1 SQL for file objects and supporting documents
// Source: docs/sikesra/03_data_model.md

import type { D1Binding } from "./db";
import type { SikesraRequestContext } from "../security/request-context";
import type { DocumentSummary, DocumentClassification } from "../services/document";

const FILES_TABLE = "awcms_sikesra_file_objects";
const DOCS_TABLE = "awcms_sikesra_supporting_documents";

export async function createFileObject(
  db: D1Binding,
  input: {
    id: string;
    r2Key: string;
    originalFilename: string;
    safeFilename: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256?: string;
    classification: DocumentClassification;
    documentType?: string;
    createdBy: string;
  },
  ctx: SikesraRequestContext,
): Promise<void> {
  const sql = `INSERT INTO ${FILES_TABLE} (
    id, tenant_id, site_id, r2_key, original_filename, safe_filename,
    mime_type, size_bytes, checksum_sha256, classification, document_type, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  await db.prepare(sql).bind(
    input.id, ctx.tenantId, ctx.siteId, input.r2Key, input.originalFilename, input.safeFilename,
    input.mimeType, input.sizeBytes, input.checksumSha256 ?? null,
    input.classification, input.documentType ?? null, input.createdBy,
  ).run();
}

export async function linkDocumentToEntity(
  db: D1Binding,
  id: string,
  entityId: string,
  fileObjectId: string,
  documentType: string,
  classification: DocumentClassification,
  createdBy: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const sql = `INSERT INTO ${DOCS_TABLE} (
    id, tenant_id, site_id, entity_id, file_object_id, document_type, classification, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  await db.prepare(sql).bind(
    id, ctx.tenantId, ctx.siteId, entityId, fileObjectId, documentType, classification, createdBy,
  ).run();
}

export async function getEntityDocumentsRepo(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<DocumentSummary[]> {
  const sql = `SELECT d.id, d.document_type, d.classification, f.mime_type, f.size_bytes, d.is_verified, d.created_at
    FROM ${DOCS_TABLE} d
    LEFT JOIN ${FILES_TABLE} f ON d.file_object_id = f.id AND f.deleted_at IS NULL
    WHERE d.entity_id = ? AND d.tenant_id = ? AND d.site_id = ? AND d.deleted_at IS NULL
    ORDER BY d.created_at DESC`;

  const result = await db.prepare(sql).bind(entityId, ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();
  return result.results.map((r) => ({
    id: r.id as string,
    documentType: r.document_type as string,
    classification: r.classification as DocumentClassification,
    mimeType: r.mime_type as string | undefined,
    sizeBytes: r.size_bytes as number | undefined,
    isVerified: !!(r.is_verified),
    uploadedAt: r.created_at as string,
  }));
}
