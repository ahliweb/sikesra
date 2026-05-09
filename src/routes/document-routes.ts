// SIKESRA Document Route Handlers
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { getEntityDocuments } from "../services/document";
import { withHandlerSequence, type RouteHandlerInput } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";

// GET /entities/:id/documents
export const entityDocumentsHandler = withHandlerSequence(async (input: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  const url = new URL(input.request.url);
  const parts = url.pathname.split("/");
  const entityId = parts[parts.indexOf("entities") + 1];
  return getEntityDocuments(db, entityId, ctx);
});

// POST /documents/upload-url (stub — needs R2 binding)
export const uploadUrlHandler = withHandlerSequence(async () => {
  throw new Error("R2 upload integration not yet implemented");
});

// POST /documents/:id/download (stub)
export const documentDownloadHandler = withHandlerSequence(async (input: RouteHandlerInput) => {
  const url = new URL(input.request.url);
  const docId = url.pathname.split("/").pop()!;
  throw new Error(`Document download not yet implemented for ${docId}`);
});
