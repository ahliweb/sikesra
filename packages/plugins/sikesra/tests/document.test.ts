import { describe, expect, it } from "vitest";

import {
	completeUpload,
	generateUploadUrl,
	getDocumentDownload,
	getEntityDocuments,
	replaceDocument,
	verifyDocument,
	type DocumentRecord,
	type DocumentStorageContext,
} from "../src/document.js";
import { buildTrustedRequestContext } from "../src/index.js";

function createRuntime(): DocumentStorageContext & {
	documents: Map<string, DocumentRecord>;
	audit: Map<string, Record<string, unknown>>;
} {
	const documents = new Map<string, DocumentRecord>();
	const audit = new Map<string, Record<string, unknown>>();
	const kv = new Map<string, unknown>();
	return {
		storage: {
			documents: {
				async put(id, data) {
					documents.set(id, data);
				},
				async get(id) {
					return documents.get(id) ?? null;
				},
				async query(options) {
					let items = Array.from(documents.entries(), ([id, data]) => ({ id, data }));
					const where = options?.where ?? {};
					items = items.filter(({ data }) =>
						Object.entries(where).every(
							([key, value]) => data[key as keyof DocumentRecord] === value,
						),
					);
					items.sort((a, b) => b.data.uploadedAt.localeCompare(a.data.uploadedAt));
					return { items: items.slice(0, options?.limit ?? items.length) };
				},
			},
			auditEntries: {
				async put(id, data) {
					audit.set(id, data);
				},
			},
		},
		kv: {
			async get(key) {
				return (kv.get(key) as never) ?? null;
			},
			async set(key, value) {
				kv.set(key, value);
			},
		},
		documents,
		audit,
	};
}

function makeContext() {
	return buildTrustedRequestContext({
		requestId: "req-1",
		tenantId: "tenant-1",
		siteId: "site-1",
		userId: "user-1",
		roles: ["admin"],
		permissions: [],
		regionScope: {},
	});
}

describe("SIKESRA document workflow", () => {
	it("rejects invalid mime types", async () => {
		await expect(
			generateUploadUrl(
				{
					fileName: "test.exe",
					mimeType: "application/x-executable",
					sizeBytes: 1024,
					classification: "internal",
				},
				makeContext(),
			),
		).rejects.toThrow("UPLOAD_VALIDATION_FAILED");
	});

	it("creates upload metadata and completes the upload", async () => {
		const runtime = createRuntime();
		const ctx = makeContext();
		const upload = await generateUploadUrl(
			{
				fileName: "ktp.pdf",
				mimeType: "application/pdf",
				sizeBytes: 1024,
				classification: "restricted",
			},
			ctx,
			runtime,
		);
		const completed = await completeUpload(
			{
				fileObjectId: upload.fileObjectId,
				entityId: "entity-1",
				documentType: "ktp",
				classification: "restricted",
				contentBase64: Buffer.from("pdf-data", "utf8").toString("base64"),
			},
			ctx,
			runtime,
		);

		expect(completed.id).toBe(upload.fileObjectId);
		expect(completed.documentType).toBe("ktp");
		expect(runtime.audit.size).toBeGreaterThanOrEqual(2);
	});

	it("lists documents for an entity with masked metadata", async () => {
		const runtime = createRuntime();
		const ctx = makeContext();
		const upload = await generateUploadUrl(
			{
				fileName: "photo.jpg",
				mimeType: "image/jpeg",
				sizeBytes: 2048,
				classification: "internal",
			},
			ctx,
			runtime,
		);
		await completeUpload(
			{
				fileObjectId: upload.fileObjectId,
				entityId: "entity-1",
				documentType: "photo",
				classification: "internal",
				contentBase64: Buffer.from("img", "utf8").toString("base64"),
			},
			ctx,
			runtime,
		);
		const documents = await getEntityDocuments(runtime, "entity-1", ctx);
		expect(documents).toHaveLength(1);
		expect(documents[0].sizeBytes).toBeUndefined();
	});

	it("requires a reason for highly restricted downloads", async () => {
		const runtime = createRuntime();
		const ctx = makeContext();
		const upload = await generateUploadUrl(
			{
				fileName: "secret.pdf",
				mimeType: "application/pdf",
				sizeBytes: 1024,
				classification: "highly_restricted",
			},
			ctx,
			runtime,
		);
		await completeUpload(
			{
				fileObjectId: upload.fileObjectId,
				entityId: "entity-1",
				documentType: "secret",
				classification: "highly_restricted",
				contentBase64: Buffer.from("secret", "utf8").toString("base64"),
			},
			ctx,
			runtime,
		);
		await expect(getDocumentDownload(runtime, upload.fileObjectId, undefined, ctx)).rejects.toThrow(
			"HIGHLY_RESTRICTED_DOWNLOAD_REQUIRES_REASON",
		);
	});

	it("verifies and replaces documents", async () => {
		const runtime = createRuntime();
		const ctx = makeContext();
		const first = await generateUploadUrl(
			{
				fileName: "doc1.pdf",
				mimeType: "application/pdf",
				sizeBytes: 1024,
				classification: "restricted",
			},
			ctx,
			runtime,
		);
		await completeUpload(
			{
				fileObjectId: first.fileObjectId,
				entityId: "entity-1",
				documentType: "ktp",
				classification: "restricted",
				contentBase64: Buffer.from("one", "utf8").toString("base64"),
			},
			ctx,
			runtime,
		);
		const second = await generateUploadUrl(
			{
				fileName: "doc2.pdf",
				mimeType: "application/pdf",
				sizeBytes: 1024,
				classification: "restricted",
			},
			ctx,
			runtime,
		);
		await completeUpload(
			{
				fileObjectId: second.fileObjectId,
				entityId: "entity-1",
				documentType: "ktp-baru",
				classification: "restricted",
				contentBase64: Buffer.from("two", "utf8").toString("base64"),
			},
			ctx,
			runtime,
		);

		const verified = await verifyDocument(
			runtime,
			{ documentId: first.fileObjectId, action: "verify", note: "Looks good" },
			ctx,
		);
		const replaced = await replaceDocument(
			runtime,
			{
				oldDocumentId: first.fileObjectId,
				newFileObjectId: second.fileObjectId,
				newDocumentType: "ktp-baru",
				newClassification: "restricted",
				reason: "Updated scan",
			},
			ctx,
		);

		expect(verified.isVerified).toBe(true);
		expect(replaced.newDocumentId).toBe(second.fileObjectId);
	});
});
