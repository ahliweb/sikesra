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
  const sql = `SELECT d.id, d.document_type, d.classification, d.created_by, f.original_filename, f.mime_type, f.size_bytes, f.checksum_sha256, d.is_verified, d.created_at
    FROM ${DOCS_TABLE} d
    LEFT JOIN ${FILES_TABLE} f ON d.file_object_id = f.id AND f.deleted_at IS NULL
    WHERE d.entity_id = ? AND d.tenant_id = ? AND d.site_id = ? AND d.deleted_at IS NULL
    ORDER BY d.created_at DESC`;

  const result = await db.prepare(sql).bind(entityId, ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();
  return result.results.map((r) => ({
    id: r.id as string,
    documentType: r.document_type as string,
    classification: r.classification as DocumentClassification,
    originalFilename: r.original_filename as string | undefined,
    mimeType: r.mime_type as string | undefined,
    sizeBytes: r.size_bytes as number | undefined,
    checksumSha256: r.checksum_sha256 as string | undefined,
    uploadedBy: r.created_by as string | undefined,
    isVerified: !!(r.is_verified),
    uploadedAt: r.created_at as string,
  }));
}

export interface DocumentWithFile {
  id: string;
  entityId: string;
  fileObjectId: string;
  documentType: string;
  classification: DocumentClassification;
  isVerified: boolean;
  verificationNote?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  replacedById?: string;
  supersedesId?: string;
  createdAt: string;
  r2Key: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256?: string;
}

export async function getDocumentWithFile(
  db: D1Binding,
  documentId: string,
  ctx: SikesraRequestContext,
): Promise<DocumentWithFile | null> {
  const sql = `SELECT d.id, d.entity_id, d.file_object_id, d.document_type, d.classification, 
    d.is_verified, d.verification_note, d.verified_at, d.verified_by,
    d.replaced_by_id, d.supersedes_id, d.created_at,
    f.r2_key, f.original_filename, f.mime_type, f.size_bytes, f.checksum_sha256
    FROM ${DOCS_TABLE} d
    INNER JOIN ${FILES_TABLE} f ON d.file_object_id = f.id AND f.deleted_at IS NULL
    WHERE d.id = ? AND d.tenant_id = ? AND d.site_id = ? AND d.deleted_at IS NULL`;

  const result = await db.prepare(sql).bind(documentId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();
  if (!result) return null;

  return {
    id: result.id as string,
    entityId: result.entity_id as string,
    fileObjectId: result.file_object_id as string,
    documentType: result.document_type as string,
    classification: result.classification as DocumentClassification,
    isVerified: !!(result.is_verified),
    verificationNote: result.verification_note as string | undefined,
    verifiedAt: result.verified_at as string | undefined,
    verifiedBy: result.verified_by as string | undefined,
    replacedById: result.replaced_by_id as string | undefined,
    supersedesId: result.supersedes_id as string | undefined,
    createdAt: result.created_at as string,
    r2Key: result.r2_key as string,
    originalFilename: result.original_filename as string,
    mimeType: result.mime_type as string,
    sizeBytes: result.size_bytes as number,
    checksumSha256: result.checksum_sha256 as string | undefined,
  };
}

export async function verifyDocument(
  db: D1Binding,
  documentId: string,
  note: string,
  verifiedBy: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const sql = `UPDATE ${DOCS_TABLE} 
    SET is_verified = 1, verification_note = ?, verified_at = datetime('now'), verified_by = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`;

  await db.prepare(sql).bind(note, verifiedBy, documentId, ctx.tenantId, ctx.siteId).run();
}

export async function rejectDocument(
  db: D1Binding,
  documentId: string,
  note: string,
  rejectedBy: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const sql = `UPDATE ${DOCS_TABLE} 
    SET is_verified = 0, verification_note = ?, verified_at = datetime('now'), verified_by = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`;

  await db.prepare(sql).bind(note, rejectedBy, documentId, ctx.tenantId, ctx.siteId).run();
}

export async function replaceDocument(
  db: D1Binding,
  oldDocumentId: string,
  newDocumentId: string,
  _replacedBy: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  await db.batch([
    db.prepare(
      `UPDATE ${DOCS_TABLE} 
       SET replaced_by_id = ?, updated_at = datetime('now')
       WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
    ).bind(newDocumentId, oldDocumentId, ctx.tenantId, ctx.siteId),
    db.prepare(
      `UPDATE ${DOCS_TABLE} 
       SET supersedes_id = ?, updated_at = datetime('now')
       WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
    ).bind(oldDocumentId, newDocumentId, ctx.tenantId, ctx.siteId),
  ]);
}

export async function getDocumentByFileObjectId(
  db: D1Binding,
  fileObjectId: string,
  ctx: SikesraRequestContext,
): Promise<DocumentWithFile | null> {
  const sql = `SELECT d.id, d.entity_id, d.file_object_id, d.document_type, d.classification, 
    d.is_verified, d.verification_note, d.verified_at, d.verified_by,
    d.replaced_by_id, d.supersedes_id, d.created_at,
    f.r2_key, f.original_filename, f.mime_type, f.size_bytes, f.checksum_sha256
    FROM ${DOCS_TABLE} d
    INNER JOIN ${FILES_TABLE} f ON d.file_object_id = f.id AND f.deleted_at IS NULL
    WHERE d.file_object_id = ? AND d.tenant_id = ? AND d.site_id = ? AND d.deleted_at IS NULL`;

  const result = await db.prepare(sql).bind(fileObjectId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();
  if (!result) return null;

  return {
    id: result.id as string,
    entityId: result.entity_id as string,
    fileObjectId: result.file_object_id as string,
    documentType: result.document_type as string,
    classification: result.classification as DocumentClassification,
    isVerified: !!(result.is_verified),
    verificationNote: result.verification_note as string | undefined,
    verifiedAt: result.verified_at as string | undefined,
    verifiedBy: result.verified_by as string | undefined,
    replacedById: result.replaced_by_id as string | undefined,
    supersedesId: result.supersedes_id as string | undefined,
    createdAt: result.created_at as string,
    r2Key: result.r2_key as string,
    originalFilename: result.original_filename as string,
    mimeType: result.mime_type as string,
    sizeBytes: result.size_bytes as number,
    checksumSha256: result.checksum_sha256 as string | undefined,
  };
}
