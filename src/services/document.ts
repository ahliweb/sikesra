// SIKESRA Document Service
// R2 upload/download with D1 metadata, classification, checksum, audit
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/07_operations_sop.md

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { createFileObject, linkDocumentToEntity, getEntityDocumentsRepo } from "../repositories/document-repository";

export type DocumentClassification = "internal" | "restricted" | "highly_restricted";

export interface DocumentSummary {
  id: string;
  documentType: string;
  classification: DocumentClassification;
  mimeType?: string;
  sizeBytes?: number;
  isVerified: boolean;
  uploadedAt: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileObjectId: string;
}

export interface CompleteUploadInput {
  fileObjectId: string;
  entityId: string;
  documentType: string;
  classification: DocumentClassification;
  checksumSha256?: string;
}

export async function generateUploadUrl(
  ctx: SikesraRequestContext,
): Promise<UploadUrlResponse> {
  // TODO: validate MIME, extension, size, classification
  // Generate signed R2 upload URL
  // Create file_object record with pending status
  throw new Error("Not implemented");
}

export async function completeUpload(
  input: CompleteUploadInput,
  ctx: SikesraRequestContext,
): Promise<DocumentSummary> {
  // TODO: validate checksum, store metadata in D1
  // Link document to entity via supporting_documents
  // Audit upload
  throw new Error("Not implemented");
}

export async function getEntityDocuments(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<DocumentSummary[]> {
  return getEntityDocumentsRepo(db, entityId, ctx);
}

export async function getDocumentDownloadUrl(
  documentId: string,
  reason?: string,
  ctx?: SikesraRequestContext,
): Promise<{ downloadUrl: string }> {
  // TODO: validate permission + ABAC
  // Highly restricted requires reason and audit
  // Generate signed/proxy download URL
  // Never expose raw R2 key
  throw new Error("Not implemented");
}
