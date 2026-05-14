import { AUDIT_ACTIONS } from "./security/audit.js";
import type { SikesraRequestContext } from "./security/request-context.js";

export type ExportFormat = "csv";
export type ExportJobStatus = "pending" | "generating" | "ready" | "failed";

export interface ExportField {
	key: string;
	label: string;
	sensitivity: "internal" | "restricted" | "highly_restricted";
}

export interface ReportMetadata {
	id: string;
	name: string;
	description: string;
	availableFields: ExportField[];
	requiredPermission: string;
	reasonRequired: boolean;
}

export interface ExportCreateInput {
	reportType: string;
	filters?: Record<string, unknown>;
	fields?: string[];
	format?: ExportFormat;
	reason?: string;
}

export interface ExportJobRecord {
	tenantId: string;
	siteId: string;
	reportType: string;
	filters: Record<string, unknown>;
	fields: string[];
	format: ExportFormat;
	reason?: string;
	status: ExportJobStatus;
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	totalRows?: number;
	contentKey?: string;
	mimeType?: string;
	downloadedAt?: string;
	generatedAt?: string;
}

export interface ExportJobSummary extends ExportJobRecord {
	id: string;
}

export interface ExportAuditEntry {
	action: string;
	resourceType: string;
	resourceId: string;
	tenantId: string;
	siteId: string;
	actorId: string;
	createdAt: string;
	reason?: string;
	metadata?: Record<string, unknown>;
}

export interface ExportStorageContext {
	storage: {
		exportJobs: {
			put(id: string, data: ExportJobRecord): Promise<void>;
			get(id: string): Promise<ExportJobRecord | null>;
			query(options?: {
				where?: Record<string, unknown>;
				orderBy?: Record<string, "asc" | "desc">;
				limit?: number;
			}): Promise<{ items: Array<{ id: string; data: ExportJobRecord }> }>;
		};
		auditEntries: {
			put(id: string, data: ExportAuditEntry): Promise<void>;
			query(options?: {
				where?: Record<string, unknown>;
				limit?: number;
			}): Promise<{ items: Array<{ id: string; data: ExportAuditEntry }> }>;
		};
	};
	kv: {
		get<T>(key: string): Promise<T | null>;
		set(key: string, value: unknown): Promise<void>;
	};
}

export interface ExportDownloadResult {
	filename: string;
	mimeType: string;
	content: string;
	contentBase64: string;
	downloadedAt: string;
}

const REPORTS: ReportMetadata[] = [
	{
		id: "entity_summary",
		name: "Ringkasan Entitas",
		description: "Rekapitulasi jumlah entitas per jenis, subjenis, dan wilayah.",
		availableFields: [
			{ key: "report_type", label: "Jenis laporan", sensitivity: "internal" },
			{ key: "created_by", label: "Dibuat oleh", sensitivity: "internal" },
			{ key: "filter_summary", label: "Ringkasan filter", sensitivity: "internal" },
		],
		requiredPermission: "awcms:sikesra:export:create",
		reasonRequired: false,
	},
	{
		id: "verification_status",
		name: "Status Verifikasi",
		description: "Laporan status verifikasi dengan catatan terbatas.",
		availableFields: [
			{ key: "report_type", label: "Jenis laporan", sensitivity: "internal" },
			{ key: "verification_scope", label: "Cakupan verifikasi", sensitivity: "restricted" },
			{ key: "reason", label: "Alasan akses", sensitivity: "restricted" },
		],
		requiredPermission: "awcms:sikesra:export:restricted",
		reasonRequired: true,
	},
	{
		id: "audit_evidence",
		name: "Bukti Audit",
		description: "Log audit untuk keperluan pemeriksaan.",
		availableFields: [
			{ key: "request_id", label: "Request ID", sensitivity: "internal" },
			{ key: "actor_id", label: "Aktor", sensitivity: "restricted" },
			{ key: "reason", label: "Alasan", sensitivity: "restricted" },
		],
		requiredPermission: "awcms:sikesra:export:audit",
		reasonRequired: true,
	},
];

export function getReports(): ReportMetadata[] {
	return REPORTS;
}

export function requiresReasonForReport(report: ReportMetadata): boolean {
	return report.reasonRequired;
}

export function getReportById(reportType: string): ReportMetadata | null {
	return REPORTS.find((report) => report.id === reportType) ?? null;
}

export function listAvailableReports(ctx: SikesraRequestContext): ReportMetadata[] {
	return REPORTS.filter((report) => ctx.permissions.includes(report.requiredPermission));
}

export async function createExportJob(
	runtime: ExportStorageContext,
	input: ExportCreateInput,
	ctx: SikesraRequestContext,
): Promise<{ id: string; status: ExportJobStatus }> {
	const report = getReportById(input.reportType);
	if (!report) throw new Error("INVALID_REPORT_KEY");
	if (!ctx.permissions.includes(report.requiredPermission))
		throw new Error("EXPORT_PERMISSION_DENIED");
	if (requiresReasonForReport(report) && !(input.reason ?? "").trim()) {
		throw new Error("EXPORT_REASON_REQUIRED");
	}

	const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const now = new Date().toISOString();
	const record: ExportJobRecord = {
		tenantId: ctx.tenantId,
		siteId: ctx.siteId,
		reportType: input.reportType,
		filters: input.filters ?? {},
		fields: (input.fields?.length
			? input.fields
			: report.availableFields.map((field) => field.key)
		).filter((field) => report.availableFields.some((available) => available.key === field)),
		format: input.format ?? "csv",
		reason: input.reason,
		status: "pending",
		createdAt: now,
		updatedAt: now,
		createdBy: ctx.userId,
	};

	await runtime.storage.exportJobs.put(id, record);
	await writeExportAudit(
		runtime,
		ctx,
		input.reason ? AUDIT_ACTIONS.EXPORT_RESTRICTED_CREATE : AUDIT_ACTIONS.EXPORT_CREATE,
		id,
		input.reason,
		{
			reportType: input.reportType,
			format: record.format,
		},
	);

	return { id, status: "pending" };
}

export async function listExportJobs(
	runtime: ExportStorageContext,
	ctx: SikesraRequestContext,
	status?: ExportJobStatus,
): Promise<ExportJobSummary[]> {
	const result = await runtime.storage.exportJobs.query({
		where: status
			? { tenantId: ctx.tenantId, siteId: ctx.siteId, status }
			: { tenantId: ctx.tenantId, siteId: ctx.siteId },
		orderBy: { createdAt: "desc" },
		limit: 50,
	});

	return result.items.map(({ id, data }) => ({ id, ...data }));
}

export async function getExportJob(
	runtime: ExportStorageContext,
	jobId: string,
	ctx: SikesraRequestContext,
): Promise<ExportJobSummary | null> {
	const record = await runtime.storage.exportJobs.get(jobId);
	if (!record || record.tenantId !== ctx.tenantId || record.siteId !== ctx.siteId) return null;
	return { id: jobId, ...record };
}

export async function generateExportFile(
	runtime: ExportStorageContext,
	jobId: string,
	ctx: SikesraRequestContext,
): Promise<{ filename: string; mimeType: string; totalRows: number }> {
	const current = await getExportJob(runtime, jobId, ctx);
	if (!current) throw new Error("EXPORT_JOB_NOT_FOUND");
	if (current.status !== "pending") throw new Error("EXPORT_JOB_NOT_PENDING");

	const report = getReportById(current.reportType);
	if (!report) throw new Error("INVALID_REPORT_KEY");

	const generating: ExportJobRecord = {
		...current,
		status: "generating",
		updatedAt: new Date().toISOString(),
	};
	await runtime.storage.exportJobs.put(jobId, generating);

	const csvContent = buildCsvContent(report, current, ctx);
	const contentKey = `exports:file:${jobId}`;
	await runtime.kv.set(contentKey, csvContent);

	const totalRows = 1;
	const completed: ExportJobRecord = {
		...generating,
		status: "ready",
		contentKey,
		mimeType: "text/csv",
		generatedAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		totalRows,
	};
	await runtime.storage.exportJobs.put(jobId, completed);
	await writeExportAudit(runtime, ctx, AUDIT_ACTIONS.EXPORT_CREATE, jobId, current.reason, {
		reportType: current.reportType,
		status: "ready",
		totalRows,
	});

	return {
		filename: `${current.reportType}_${jobId}.csv`,
		mimeType: "text/csv",
		totalRows,
	};
}

export async function downloadExportFile(
	runtime: ExportStorageContext,
	jobId: string,
	ctx: SikesraRequestContext,
): Promise<ExportDownloadResult> {
	const current = await getExportJob(runtime, jobId, ctx);
	if (!current) throw new Error("EXPORT_JOB_NOT_FOUND");
	if (current.status !== "ready") throw new Error("EXPORT_JOB_NOT_READY");
	if (!current.contentKey) throw new Error("EXPORT_FILE_NOT_FOUND");

	const content = await runtime.kv.get<string>(current.contentKey);
	if (!content) throw new Error("EXPORT_FILE_NOT_FOUND");

	const downloadedAt = new Date().toISOString();
	await runtime.storage.exportJobs.put(jobId, {
		...current,
		downloadedAt,
		updatedAt: downloadedAt,
	});
	await writeExportAudit(runtime, ctx, AUDIT_ACTIONS.EXPORT_DOWNLOAD, jobId, current.reason, {
		reportType: current.reportType,
		filename: `${current.reportType}_${jobId}.csv`,
	});

	return {
		filename: `${current.reportType}_${jobId}.csv`,
		mimeType: current.mimeType ?? "text/csv",
		content,
		contentBase64: Buffer.from(content, "utf8").toString("base64"),
		downloadedAt,
	};
}

function buildCsvContent(
	report: ReportMetadata,
	job: ExportJobSummary,
	ctx: SikesraRequestContext,
): string {
	const selectedFields = report.availableFields.filter((field) => job.fields.includes(field.key));
	const headers = selectedFields.map((field) => field.key).join(",");
	const filterSummary = JSON.stringify(job.filters);
	const values = selectedFields.map((field) => {
		switch (field.key) {
			case "report_type":
				return job.reportType;
			case "created_by":
				return ctx.userId;
			case "filter_summary":
				return escapeCsv(filterSummary);
			case "verification_scope":
				return escapeCsv(ctx.regionScope.villageCodes?.join("|") || ctx.siteId);
			case "reason":
				return escapeCsv(job.reason ?? "");
			case "request_id":
				return ctx.requestId;
			case "actor_id":
				return ctx.userId;
			default:
				return "";
		}
	});

	return `${headers}\n${values.join(",")}\n`;
}

function escapeCsv(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replaceAll('"', '""')}"`;
	}
	return value;
}

async function writeExportAudit(
	runtime: ExportStorageContext,
	ctx: SikesraRequestContext,
	action: string,
	resourceId: string,
	reason?: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	const createdAt = new Date().toISOString();
	await runtime.storage.auditEntries.put(
		`audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		{
			action,
			resourceType: "export_job",
			resourceId,
			tenantId: ctx.tenantId,
			siteId: ctx.siteId,
			actorId: ctx.userId,
			createdAt,
			reason,
			metadata,
		},
	);
}
