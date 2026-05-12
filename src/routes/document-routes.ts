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
import { withHandlerSequence, buildContextFromEmDash, type EmDashRouteContext } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";
import { getRouteDb } from "./route-db";

interface R2Bucket {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
  head(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream | ArrayBuffer } | null>;
}

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
  const r2 = routeCtx.env?.SIKESRA_DOCUMENTS as R2Bucket | undefined;
  
  if (!db) throw new Error("Database not available");
  
  const input = routeCtx.input as GenerateUploadUrlInput;
  return generateUploadUrl(input, ctx, r2, db);
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
export const documentDownloadHandler = async (routeCtx: EmDashRouteContext) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = await getRouteDb(routeCtx.request);
  const r2 = routeCtx.env?.SIKESRA_DOCUMENTS as R2Bucket | undefined;
  
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
