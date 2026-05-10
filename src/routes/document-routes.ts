// SIKESRA Document Route Handlers
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { getEntityDocuments, generateUploadUrl, completeUpload, type GenerateUploadUrlInput } from "../services/document";
import { withHandlerSequence, buildContextFromEmDash, type EmDashRouteContext } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";

interface R2Bucket {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
  head(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
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

// POST /documents/:id/download (stub)
export const documentDownloadHandler = withHandlerSequence(async (input: { request: Request }) => {
  const url = new URL(input.request.url);
  const docId = url.pathname.split("/").pop()!;
  throw new Error(`Document download not yet implemented for ${docId}`);
});