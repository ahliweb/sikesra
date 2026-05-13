// SIKESRA Document Workflow Tests
// Verify upload validation, complete upload, verification, replacement, and audit
// Source: docs/sikesra/07_operations_sop.md, docs/sikesra/10_validation_checklist.md

import { describe, it, expect } from "vitest";
import { InMemoryD1Binding } from "../repositories/db";
import { buildTrustedRequestContext, type SikesraRequestContext } from "../security/request-context";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { generateUploadUrl, completeUpload, verifyDocument, type CompleteUploadInput, type DocumentVerificationInput } from "../services/document";

function makeContext(overrides: Partial<SikesraRequestContext> = {}): SikesraRequestContext {
  return buildTrustedRequestContext({
    requestId: `req_${Date.now()}`,
    tenantId: "test-tenant",
    siteId: "test-site",
    userId: "test-user",
    roles: ["admin"],
    permissions: Object.values(SIKESRA_PERMISSIONS),
    regionScope: { villageCodes: [] },
    ...overrides,
  });
}

async function seedDocumentTestData(db: InMemoryD1Binding) {
  // Seed entity
  await db.prepare(
    `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, sensitivity_level, status_data, status_verification, completeness_percent, source_input, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("entity-1", "test-tenant", "test-site", "01", "01", "person", "Test Person", "6201021005", "public_safe", "draft", "pending", 80, "manual", new Date().toISOString(), new Date().toISOString()).run();
}

describe("SIKESRA Document Workflow Tests", () => {
  describe("Upload URL Generation Validation", () => {
    it("should reject invalid MIME types", async () => {
      const ctx = makeContext();
      await expect(generateUploadUrl({
        fileName: "test.exe",
        mimeType: "application/x-executable",
        sizeBytes: 1024,
        classification: "internal",
      }, ctx)).rejects.toThrow("UPLOAD_VALIDATION_FAILED");
    });

    it("should reject files exceeding max size", async () => {
      const ctx = makeContext();
      await expect(generateUploadUrl({
        fileName: "large.pdf",
        mimeType: "application/pdf",
        sizeBytes: 11 * 1024 * 1024, // 11MB > 10MB limit
        classification: "internal",
      }, ctx)).rejects.toThrow("UPLOAD_VALIDATION_FAILED");
    });

    it("should reject invalid classification", async () => {
      const ctx = makeContext();
      await expect(generateUploadUrl({
        fileName: "test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        classification: "public" as any,
      }, ctx)).rejects.toThrow("UPLOAD_VALIDATION_FAILED");
    });

    it("should reject empty filename", async () => {
      const ctx = makeContext();
      await expect(generateUploadUrl({
        fileName: "",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        classification: "internal",
      }, ctx)).rejects.toThrow("UPLOAD_VALIDATION_FAILED");
    });

    it("should accept valid PDF upload", async () => {
      const ctx = makeContext();
      const result = await generateUploadUrl({
        fileName: "ktp.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024 * 1024,
        classification: "restricted",
      }, ctx);

      expect(result.uploadUrl).toContain("/documents/");
      expect(result.fileObjectId).toBeTruthy();
    });

    it("should accept valid image upload", async () => {
      const ctx = makeContext();
      const result = await generateUploadUrl({
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 512 * 1024,
        classification: "internal",
      }, ctx);

      expect(result.uploadUrl).toContain("/documents/");
      expect(result.fileObjectId).toBeTruthy();
    });
  });

  describe("Complete Upload Workflow", () => {
    it("should complete upload and link to entity", async () => {
      const db = new InMemoryD1Binding();
      await seedDocumentTestData(db);
      const ctx = makeContext();

      // First generate upload URL
      const uploadResult = await generateUploadUrl({
        fileName: "ktp.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024 * 1024,
        classification: "restricted",
      }, ctx, undefined, db);

      // Then complete the upload
      const input: CompleteUploadInput = {
        fileObjectId: uploadResult.fileObjectId,
        entityId: "entity-1",
        documentType: "ktp",
        classification: "restricted",
        checksumSha256: "sha256:abc123",
      };

      const result = await completeUpload(input, ctx, db);

      expect(result.id).toBe(uploadResult.fileObjectId);
      expect(result.documentType).toBe("ktp");
      expect(result.classification).toBe("restricted");
      expect(result.isVerified).toBe(false);
    });

    it("should audit complete upload event", async () => {
      const db = new InMemoryD1Binding();
      await seedDocumentTestData(db);
      const ctx = makeContext();

      const uploadResult = await generateUploadUrl({
        fileName: "ktp.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024 * 1024,
        classification: "restricted",
      }, ctx, undefined, db);

      const input: CompleteUploadInput = {
        fileObjectId: uploadResult.fileObjectId,
        entityId: "entity-1",
        documentType: "ktp",
        classification: "restricted",
        checksumSha256: "sha256:abc123",
      };

      await completeUpload(input, ctx, db);

      // Check audit log
      const auditResult = await db.prepare(
        `SELECT * FROM awcms_sikesra_audit_logs WHERE resource_type = 'supporting_document' AND action LIKE '%complete%'`
      ).all<Record<string, unknown>>();

      expect(auditResult.results.length).toBeGreaterThan(0);
    });
  });

  describe("Document Verification", () => {
    it("should verify document successfully", async () => {
      const db = new InMemoryD1Binding();
      await seedDocumentTestData(db);
      const ctx = makeContext();

      const uploadResult = await generateUploadUrl({
        fileName: "ktp.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024 * 1024,
        classification: "restricted",
      }, ctx, undefined, db);

      const input: CompleteUploadInput = {
        fileObjectId: uploadResult.fileObjectId,
        entityId: "entity-1",
        documentType: "ktp",
        classification: "restricted",
        checksumSha256: "sha256:abc123",
      };

      await completeUpload(input, ctx, db);

      const verifyInput: DocumentVerificationInput = {
        documentId: uploadResult.fileObjectId,
        action: "verify",
        note: "Document verified - matches original",
      };

      const result = await verifyDocument(db, verifyInput, ctx);

      expect(result.id).toBe(uploadResult.fileObjectId);
      expect(result.isVerified).toBe(true);
    });

    it("should reject document with note", async () => {
      const db = new InMemoryD1Binding();
      await seedDocumentTestData(db);
      const ctx = makeContext();

      const uploadResult = await generateUploadUrl({
        fileName: "blurry.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 512 * 1024,
        classification: "internal",
      }, ctx, undefined, db);

      const input: CompleteUploadInput = {
        fileObjectId: uploadResult.fileObjectId,
        entityId: "entity-1",
        documentType: "photo",
        classification: "internal",
      };

      await completeUpload(input, ctx, db);

      const verifyInput: DocumentVerificationInput = {
        documentId: uploadResult.fileObjectId,
        action: "reject",
        note: "Document too blurry to read",
      };

      const result = await verifyDocument(db, verifyInput, ctx);

      expect(result.id).toBe(uploadResult.fileObjectId);
      expect(result.isVerified).toBe(false);
    });

    it("should reject verification for nonexistent document", async () => {
      const db = new InMemoryD1Binding();
      await seedDocumentTestData(db);
      const ctx = makeContext();

      const verifyInput: DocumentVerificationInput = {
        documentId: "nonexistent",
        action: "verify",
        note: "Test note",
      };

      await expect(verifyDocument(db, verifyInput, ctx)).rejects.toThrow("DOCUMENT_NOT_FOUND");
    });
  });

  describe("Document Classification Security", () => {
    it("should allow internal classification", async () => {
      const ctx = makeContext();
      const result = await generateUploadUrl({
        fileName: "internal.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        classification: "internal",
      }, ctx);

      expect(result.fileObjectId).toBeTruthy();
    });

    it("should allow restricted classification", async () => {
      const ctx = makeContext();
      const result = await generateUploadUrl({
        fileName: "restricted.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        classification: "restricted",
      }, ctx);

      expect(result.fileObjectId).toBeTruthy();
    });

    it("should allow highly_restricted classification", async () => {
      const ctx = makeContext();
      const result = await generateUploadUrl({
        fileName: "highly_restricted.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        classification: "highly_restricted",
      }, ctx);

      expect(result.fileObjectId).toBeTruthy();
    });
  });

  describe("Allowed File Types", () => {
    it("should allow PDF files", async () => {
      const ctx = makeContext();
      const result = await generateUploadUrl({
        fileName: "test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        classification: "internal",
      }, ctx);

      expect(result.fileObjectId).toBeTruthy();
    });

    it("should allow JPEG images", async () => {
      const ctx = makeContext();
      const result = await generateUploadUrl({
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        classification: "internal",
      }, ctx);

      expect(result.fileObjectId).toBeTruthy();
    });

    it("should allow PNG images", async () => {
      const ctx = makeContext();
      const result = await generateUploadUrl({
        fileName: "test.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        classification: "internal",
      }, ctx);

      expect(result.fileObjectId).toBeTruthy();
    });

    it("should allow Word documents", async () => {
      const ctx = makeContext();
      const result = await generateUploadUrl({
        fileName: "test.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: 1024,
        classification: "internal",
      }, ctx);

      expect(result.fileObjectId).toBeTruthy();
    });

    it("should allow Excel spreadsheets", async () => {
      const ctx = makeContext();
      const result = await generateUploadUrl({
        fileName: "test.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes: 1024,
        classification: "internal",
      }, ctx);

      expect(result.fileObjectId).toBeTruthy();
    });

    it("should block executable files", async () => {
      const ctx = makeContext();
      await expect(generateUploadUrl({
        fileName: "malware.exe",
        mimeType: "application/x-msdownload",
        sizeBytes: 1024,
        classification: "internal",
      }, ctx)).rejects.toThrow("UPLOAD_VALIDATION_FAILED");
    });

    it("should block script files", async () => {
      const ctx = makeContext();
      await expect(generateUploadUrl({
        fileName: "script.js",
        mimeType: "application/javascript",
        sizeBytes: 1024,
        classification: "internal",
      }, ctx)).rejects.toThrow("UPLOAD_VALIDATION_FAILED");
    });

    it("should block HTML files", async () => {
      const ctx = makeContext();
      await expect(generateUploadUrl({
        fileName: "page.html",
        mimeType: "text/html",
        sizeBytes: 1024,
        classification: "internal",
      }, ctx)).rejects.toThrow("UPLOAD_VALIDATION_FAILED");
    });
  });
});
