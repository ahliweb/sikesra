import { describe, expect, it } from "vitest";

import {
	createExportJob,
	downloadExportFile,
	generateExportFile,
	getExportJob,
	getReports,
	listAvailableReports,
	listExportJobs,
	requiresReasonForReport,
	type ExportAuditEntry,
	type ExportJobRecord,
	type ExportStorageContext,
} from "../src/export.js";
import { SIKESRA_PERMISSIONS, buildTrustedRequestContext } from "../src/index.js";

function createRuntime(): ExportStorageContext & { audit: Map<string, ExportAuditEntry> } {
	const exportJobs = new Map<string, ExportJobRecord>();
	const audit = new Map<string, ExportAuditEntry>();
	const kv = new Map<string, unknown>();

	return {
		storage: {
			exportJobs: {
				async put(id, data) {
					exportJobs.set(id, data);
				},
				async get(id) {
					return exportJobs.get(id) ?? null;
				},
				async query(options) {
					let items = Array.from(exportJobs.entries(), ([id, data]) => ({ id, data }));
					const where = options?.where ?? {};
					items = items.filter(({ data }) =>
						Object.entries(where).every(
							([key, value]) => data[key as keyof ExportJobRecord] === value,
						),
					);
					items.sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));
					return { items: items.slice(0, options?.limit ?? items.length) };
				},
			},
			auditEntries: {
				async put(id, data) {
					audit.set(id, data);
				},
				async query(options) {
					let items = Array.from(audit.entries(), ([id, data]) => ({ id, data }));
					const where = options?.where ?? {};
					items = items.filter(({ data }) =>
						Object.entries(where).every(
							([key, value]) => data[key as keyof ExportAuditEntry] === value,
						),
					);
					return { items: items.slice(0, options?.limit ?? items.length) };
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
		audit,
	};
}

function makeContext(permissionOverrides?: string[]) {
	return buildTrustedRequestContext({
		requestId: "req-1",
		tenantId: "tenant-1",
		siteId: "site-1",
		userId: "user-1",
		roles: ["admin"],
		permissions: permissionOverrides ?? [
			SIKESRA_PERMISSIONS.EXPORT_CREATE,
			SIKESRA_PERMISSIONS.EXPORT_RESTRICTED,
			SIKESRA_PERMISSIONS.EXPORT_AUDIT,
		],
		regionScope: {},
	});
}

describe("SIKESRA export workflow", () => {
	it("filters available reports by permission", () => {
		const reports = listAvailableReports(makeContext([SIKESRA_PERMISSIONS.EXPORT_CREATE]));
		expect(reports.map((report) => report.id)).toEqual(["entity_summary"]);
	});

	it("requires a reason for restricted reports", async () => {
		const runtime = createRuntime();
		await expect(
			createExportJob(runtime, { reportType: "verification_status" }, makeContext()),
		).rejects.toThrow("EXPORT_REASON_REQUIRED");
	});

	it("denies export creation without the required permission", async () => {
		const runtime = createRuntime();
		await expect(
			createExportJob(runtime, { reportType: "entity_summary" }, makeContext([])),
		).rejects.toThrow("EXPORT_PERMISSION_DENIED");
	});

	it("creates and lists export jobs within tenant/site scope", async () => {
		const runtime = createRuntime();
		const ctx = makeContext();
		const created = await createExportJob(runtime, { reportType: "entity_summary" }, ctx);
		const jobs = await listExportJobs(runtime, ctx);
		const job = await getExportJob(runtime, created.id, ctx);

		expect(jobs).toHaveLength(1);
		expect(job?.status).toBe("pending");
	});

	it("isolates jobs across tenant boundaries", async () => {
		const runtime = createRuntime();
		const created = await createExportJob(runtime, { reportType: "entity_summary" }, makeContext());
		const otherTenant = buildTrustedRequestContext({
			requestId: "req-2",
			tenantId: "tenant-2",
			siteId: "site-2",
			userId: "user-2",
			roles: ["admin"],
			permissions: [SIKESRA_PERMISSIONS.EXPORT_CREATE],
			regionScope: {},
		});

		expect(await getExportJob(runtime, created.id, otherTenant)).toBeNull();
		expect(await listExportJobs(runtime, otherTenant)).toHaveLength(0);
	});

	it("generates downloadable csv content without leaking storage keys", async () => {
		const runtime = createRuntime();
		const ctx = makeContext();
		const created = await createExportJob(runtime, { reportType: "entity_summary" }, ctx);
		const generated = await generateExportFile(runtime, created.id, ctx);
		const downloaded = await downloadExportFile(runtime, created.id, ctx);

		expect(generated.filename).toContain("entity_summary");
		expect(downloaded.filename).toContain("entity_summary");
		expect(downloaded.mimeType).toBe("text/csv");
		expect(downloaded.content).toContain("id");
		expect(downloaded).not.toHaveProperty("contentKey");
	});

	it("records audit entries for create and download", async () => {
		const runtime = createRuntime();
		const ctx = makeContext();
		const created = await createExportJob(
			runtime,
			{
				reportType: "verification_status",
				reason: "Monthly compliance",
			},
			ctx,
		);
		await generateExportFile(runtime, created.id, ctx);
		await downloadExportFile(runtime, created.id, ctx);

		expect(runtime.audit.size).toBeGreaterThanOrEqual(3);
		const actions = Array.from(runtime.audit.values(), (entry) => entry.action);
		expect(actions).toContain("export.restricted_create");
		expect(actions).toContain("export.download");
	});

	it("exposes report metadata and reason rules", () => {
		const reports = getReports();
		const restricted = reports.find((report) => report.id === "verification_status");
		expect(reports.length).toBeGreaterThan(0);
		expect(restricted && requiresReasonForReport(restricted)).toBe(true);
	});
});
