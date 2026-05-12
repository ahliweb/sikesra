// SIKESRA Document Route Handlers
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { 
  getEntityDocuments, 
  generateUploadUrl, 
  completeUpload, 
  getDocumentDownload,
  verifyDocument,
  replaceDocument,
  type GenerateUploadUrlInput,
  type DocumentVerificationInput,
  type DocumentReplacementInput,
} from "../services/document";
import { createStorageAdapter, type R2Bucket } from "../services/storage";
import { writeAuditEvent, AUDIT_ACTIONS } from "../services/audit";
import { withHandlerSequence, buildContextFromEmDash, withRateLimitRequest, type EmDashRouteContext } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import { getRouteDb } from "./route-db";

// GET /entities/:id/documents
export const entityDocumentsHandler = withHandlerSequence(async (input: { request: Request }, db: D1Binding, ctx: SikesraRequestContext) => {
  const url = new URL(input.request.url);
  const parts = url.pathname.split("/");
  const entityId = parts[parts.indexOf("entities") + 1];
  return getEntityDocuments(db, entityId, ctx);
});

// POST /documents/upload-url
export const uploadUrlHandler = async (routeCtx: EmDashRouteContext<GenerateUploadUrlInput>) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = routeCtx.env?.SIKESRA_DB;
  const r2 = routeCtx.env?.SIKESRA_DOCUMENTS as unknown as R2Bucket | undefined;
  
  if (!db) throw new Error("Database not available");
  
  const input = routeCtx.input as GenerateUploadUrlInput;
  const storage = r2 ? createStorageAdapter(r2) : undefined;
  
  return generateUploadUrl(input, ctx, r2, db, undefined, storage);
};

// POST /documents/:id/complete
export const completeUploadHandler = async (routeCtx: EmDashRouteContext) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = routeCtx.env?.SIKESRA_DB;
  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const fileObjectId = parts[parts.indexOf("documents") + 1];

  const input = routeCtx.input as {
    entityId: string;
    documentType: string;
    classification: "internal" | "restricted" | "highly_restricted";
    checksumSha256?: string;
  };

  return completeUpload({
    ...input,
    fileObjectId,
  }, ctx, db);
};

// GET /documents/:id/download
// Rate limited: max 50 downloads per hour per user
export const documentDownloadHandler = withRateLimitRequest(
  async (routeCtx: EmDashRouteContext, db: D1Binding, ctx: SikesraRequestContext) => {
    const r2 = routeCtx.env?.SIKESRA_DOCUMENTS as unknown as R2Bucket | undefined;
    
    if (!db) throw new Error("Database not available");
    if (!r2) throw new Error("R2 storage not available");

    const url = new URL(routeCtx.request.url);
    const parts = url.pathname.split("/");
    const documentId = parts[parts.indexOf("documents") + 1];
    const reason = url.searchParams.get("reason") ?? undefined;

    const result = await getDocumentDownload(db, r2, documentId, reason, ctx);
    
    return new Response(result.content, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(result.filename)}"`,
        "Content-Length": String(result.sizeBytes),
      },
    });
  },
  "document_download"
);

// GET /documents/proxy/:encodedKey
// Proxy endpoint for secure document access with permission validation
export const documentProxyHandler = async (routeCtx: EmDashRouteContext) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = await getRouteDb(routeCtx.request);
  const r2 = routeCtx.env?.SIKESRA_DOCUMENTS as unknown as R2Bucket | undefined;
  
  if (!db) throw new Error("Database not available");
  if (!r2) throw new Error("R2 storage not available");

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const encodedKeyIndex = parts.indexOf("proxy") + 1;
  const encodedKey = parts[encodedKeyIndex];
  
  if (!encodedKey) throw new Error("Storage key is required");
  
  const key = decodeURIComponent(encodedKey);
  const storage = createStorageAdapter(r2);
  
  // Validate key ownership
  if (!storage.validateKeyOwnership(key, ctx)) {
    throw new Error("Access denied: storage key does not belong to current tenant/site");
  }
  
  // Get the object
  const r2Object = await storage.get(key);
  if (!r2Object) {
    throw new Error("Document file not found in storage");
  }
  
  // Write audit event
  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    actorId: ctx.userId,
    actorRole: ctx.roles[0],
    action: AUDIT_ACTIONS.DOCUMENT_DOWNLOAD,
    resourceType: "file_object",
    resourceId: key,
    requestId: ctx.requestId,
    success: true,
    reason: "proxy download",
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  }, ctx);
  
  return new Response(r2Object.body, {
    headers: {
      "Content-Type": r2Object.httpMetadata?.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(r2Object.key.split("/").pop() || "document")}"`,
    },
  });
};

// POST /documents/:id/verify
export const documentVerifyHandler = async (routeCtx: EmDashRouteContext<DocumentVerificationInput>) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = routeCtx.env?.SIKESRA_DB;
  
  if (!db) throw new Error("Database not available");

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const documentId = parts[parts.indexOf("documents") + 1];

  const input = routeCtx.input as DocumentVerificationInput;
  return verifyDocument(db, { ...input, documentId }, ctx);
};

// POST /documents/:id/replace
export const documentReplaceHandler = async (routeCtx: EmDashRouteContext<DocumentReplacementInput>) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = routeCtx.env?.SIKESRA_DB;
  
  if (!db) throw new Error("Database not available");

  const url = new URL(routeCtx.request.url);
  const parts = url.pathname.split("/");
  const oldDocumentId = parts[parts.indexOf("documents") + 1];

  const input = routeCtx.input as DocumentReplacementInput;
  return replaceDocument(db, { ...input, oldDocumentId }, ctx);
};
