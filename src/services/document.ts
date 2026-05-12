// SIKESRA Document Service
// R2 upload/download with D1 metadata, classification, checksum, audit
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/07_operations_sop.md

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { 
  createFileObject, 
  linkDocumentToEntity, 
  getEntityDocumentsRepo,
  getDocumentWithFile,
  verifyDocument as verifyDocumentRepo,
  rejectDocument as rejectDocumentRepo,
  replaceDocument as replaceDocumentRepo,
  getDocumentByFileObjectId,
} from "../repositories/document-repository";
import { writeAuditEvent, AUDIT_ACTIONS } from "./audit";
import type { R2Bucket, SikesraStorageAdapter } from "./storage";

export type DocumentClassification = "internal" | "restricted" | "highly_restricted";

export interface DocumentSummary {
  id: string;
  documentType: string;
  classification: DocumentClassification;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
  checksumSha256?: string;
  uploadedBy?: string;
  isVerified: boolean;
  uploadedAt: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileObjectId: string;
  fields?: Record<string, string>;
}

export interface CompleteUploadInput {
  fileObjectId: string;
  entityId: string;
  documentType: string;
  classification: DocumentClassification;
  checksumSha256?: string;
}

export interface GenerateUploadUrlInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  classification: DocumentClassification;
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB default

function validateUploadInput(input: GenerateUploadUrlInput, settings?: { maxUploadBytes?: number; allowedMimeTypes?: string[] }): string[] {
  const errors: string[] = [];
  
  if (!input.fileName || !input.fileName.trim()) {
    errors.push("Filename is required.");
  }
  
  const allowedTypes = settings?.allowedMimeTypes ?? ALLOWED_MIME_TYPES;
  if (!allowedTypes.includes(input.mimeType)) {
    errors.push(`MIME type ${input.mimeType} is not allowed. Allowed: ${allowedTypes.join(", ")}`);
  }
  
  const maxSize = settings?.maxUploadBytes ?? MAX_FILE_SIZE_BYTES;
  if (input.sizeBytes > maxSize) {
    errors.push(`File size ${input.sizeBytes} bytes exceeds maximum allowed ${maxSize} bytes.`);
  }
  
  const validClassifications: DocumentClassification[] = ["internal", "restricted", "highly_restricted"];
  if (!validClassifications.includes(input.classification)) {
    errors.push(`Invalid classification: ${input.classification}. Must be one of: ${validClassifications.join(", ")}`);
  }
  
  return errors;
}

export async function generateUploadUrl(
  input: GenerateUploadUrlInput,
  ctx: SikesraRequestContext,
  r2?: R2Bucket,
  db?: D1Binding,
  settings?: { maxUploadBytes?: number; allowedMimeTypes?: string[] },
  storage?: SikesraStorageAdapter,
): Promise<UploadUrlResponse> {
  const validationErrors = validateUploadInput(input, settings);
  if (validationErrors.length > 0) {
    throw new Error(`UPLOAD_VALIDATION_FAILED: ${validationErrors.join("; ")}`);
  }

  const fileObjectId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  // Use storage adapter for key generation if available
  let key: string;
  const safeName = input.fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, "-") || "document";
  if (storage) {
    key = storage.generateKey(ctx, {
      filename: input.fileName.trim(),
      category: "documents",
      uniqueId: fileObjectId,
    });
  } else {
    // Fallback to inline key generation
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    key = `tenants/${ctx.tenantId}/sites/${ctx.siteId}/documents/${yyyy}/${mm}/${fileObjectId}/${safeName}`;
  }

  if (db) {
    await createFileObject(
      db,
      {
        id: fileObjectId,
        r2Key: key,
        originalFilename: input.fileName.trim(),
        safeFilename: safeName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        classification: input.classification,
        createdBy: ctx.userId,
      },
      ctx,
    );

    await writeAuditEvent(
      db,
      {
        tenantId: ctx.tenantId,
        siteId: ctx.siteId,
        actorId: ctx.userId,
        actorRole: ctx.roles[0],
        action: AUDIT_ACTIONS.DOCUMENT_UPLOAD,
        resourceType: "file_object",
        resourceId: fileObjectId,
        requestId: ctx.requestId,
        success: true,
        reason: `initiate upload for ${input.fileName.trim()}`,
        after: {
          id: fileObjectId,
          originalFilename: input.fileName.trim(),
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          classification: input.classification,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      ctx,
    );
  }

  return {
    uploadUrl: `/_emdash/api/plugins/sikesra/v1/documents/${fileObjectId}/upload`,
    fileObjectId,
  };
}

export async function completeUpload(
  input: CompleteUploadInput,
  ctx: SikesraRequestContext,
  db?: D1Binding,
): Promise<DocumentSummary> {
  if (!db) throw new Error("DB_UNAVAILABLE");

  await linkDocumentToEntity(
    db,
    input.fileObjectId,
    input.entityId,
    input.fileObjectId,
    input.documentType,
    input.classification,
    ctx.userId,
    ctx,
  );

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.DOCUMENT_COMPLETE,
      resourceType: "supporting_document",
      resourceId: input.fileObjectId,
      requestId: ctx.requestId,
      success: true,
      reason: `complete upload and link to entity ${input.entityId}`,
      after: {
        entityId: input.entityId,
        documentType: input.documentType,
        classification: input.classification,
        checksumSha256: input.checksumSha256 ?? null,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
  
  return {
    id: input.fileObjectId,
    documentType: input.documentType,
    classification: input.classification,
    isVerified: false,
    uploadedAt: new Date().toISOString(),
  };
}

export async function getEntityDocuments(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<DocumentSummary[]> {
  return getEntityDocumentsRepo(db, entityId, ctx);
}

export interface DocumentDownloadResult {
  content: ReadableStream | ArrayBuffer;
  mimeType: string;
  filename: string;
  sizeBytes: number;
}

export async function getDocumentDownload(
  db: D1Binding,
  r2: R2Bucket,
  documentId: string,
  reason: string | undefined,
  ctx: SikesraRequestContext,
  settings?: { requireReasonForHighlyRestrictedDownload?: boolean },
): Promise<DocumentDownloadResult> {
  const doc = await getDocumentWithFile(db, documentId, ctx);
  if (!doc) {
    throw new Error("DOCUMENT_NOT_FOUND");
  }

  if (doc.replacedById) {
    throw new Error("DOCUMENT_SUPERSEDED");
  }

  const requireReason = settings?.requireReasonForHighlyRestrictedDownload ?? true;
  if (doc.classification === "highly_restricted" && requireReason && (!reason || !reason.trim())) {
    throw new Error("HIGHLY_RESTRICTED_DOWNLOAD_REQUIRES_REASON");
  }

  const r2Object = await r2.get(doc.r2Key);
  if (!r2Object) {
    throw new Error("DOCUMENT_FILE_NOT_FOUND_IN_STORAGE");
  }

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.DOCUMENT_DOWNLOAD,
      resourceType: "supporting_document",
      resourceId: documentId,
      requestId: ctx.requestId,
      success: true,
      reason: reason ?? `download document ${doc.documentType}`,
      after: {
        classification: doc.classification,
        documentType: doc.documentType,
        originalFilename: doc.originalFilename,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return {
    content: r2Object.body,
    mimeType: doc.mimeType,
    filename: doc.originalFilename,
    sizeBytes: doc.sizeBytes,
  };
}

export interface DocumentVerificationInput {
  documentId: string;
  action: "verify" | "reject";
  note: string;
}

export async function verifyDocument(
  db: D1Binding,
  input: DocumentVerificationInput,
  ctx: SikesraRequestContext,
): Promise<{ id: string; isVerified: boolean }> {
  const doc = await getDocumentWithFile(db, input.documentId, ctx);
  if (!doc) {
    throw new Error("DOCUMENT_NOT_FOUND");
  }

  if (input.action === "verify") {
    await verifyDocumentRepo(db, input.documentId, input.note, ctx.userId, ctx);
  } else {
    await rejectDocumentRepo(db, input.documentId, input.note, ctx.userId, ctx);
  }

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: input.action === "verify" ? AUDIT_ACTIONS.DOCUMENT_VERIFY : AUDIT_ACTIONS.DOCUMENT_REJECT,
      resourceType: "supporting_document",
      resourceId: input.documentId,
      requestId: ctx.requestId,
      success: true,
      reason: input.note,
      after: {
        action: input.action,
        documentType: doc.documentType,
        classification: doc.classification,
        note: input.note,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return {
    id: input.documentId,
    isVerified: input.action === "verify",
  };
}

export interface DocumentReplacementInput {
  oldDocumentId: string;
  newFileObjectId: string;
  newDocumentType: string;
  newClassification: DocumentClassification;
  reason: string;
}

export async function replaceDocument(
  db: D1Binding,
  input: DocumentReplacementInput,
  ctx: SikesraRequestContext,
): Promise<{ oldDocumentId: string; newDocumentId: string }> {
  const oldDoc = await getDocumentWithFile(db, input.oldDocumentId, ctx);
  if (!oldDoc) {
    throw new Error("DOCUMENT_NOT_FOUND");
  }

  if (oldDoc.replacedById) {
    throw new Error("DOCUMENT_ALREADY_SUPERSEDED");
  }

  const newDocumentId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  await linkDocumentToEntity(
    db,
    newDocumentId,
    oldDoc.entityId,
    input.newFileObjectId,
    input.newDocumentType,
    input.newClassification,
    ctx.userId,
    ctx,
  );

  await replaceDocumentRepo(db, input.oldDocumentId, newDocumentId, ctx.userId, ctx);

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.DOCUMENT_REPLACE,
      resourceType: "supporting_document",
      resourceId: input.oldDocumentId,
      requestId: ctx.requestId,
      success: true,
      reason: input.reason,
      after: {
        oldDocumentId: input.oldDocumentId,
        newDocumentId,
        newFileObjectId: input.newFileObjectId,
        newDocumentType: input.newDocumentType,
        newClassification: input.newClassification,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );

  return {
    oldDocumentId: input.oldDocumentId,
    newDocumentId,
  };
}
