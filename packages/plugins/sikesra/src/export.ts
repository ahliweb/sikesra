import { sql } from "kysely";

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
	db?: unknown;
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

	await saveExportJobRecord(runtime, id, record, ctx);
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
	if (runtime.db) {
		return listExportJobsFromDb(runtime.db, ctx, status);
	}

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
	if (runtime.db) {
		const record = await getExportJobRecordFromDb(runtime.db, jobId, ctx);
		if (!record) return null;
		return { id: jobId, ...record };
	}

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
	await saveExportJobRecord(runtime, jobId, generating, ctx);

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
	await saveExportJobRecord(runtime, jobId, completed, ctx);
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
	const updated: ExportJobRecord = {
		...current,
		downloadedAt,
		updatedAt: downloadedAt,
	};
	await saveExportJobRecord(runtime, jobId, updated, ctx);
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
	if (runtime.db) {
		await writeExportAuditToDb(runtime.db, ctx, action, resourceId, reason, metadata);
		return;
	}

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

async function saveExportJobRecord(
	runtime: ExportStorageContext,
	jobId: string,
	record: ExportJobRecord,
	_ctx: SikesraRequestContext,
): Promise<void> {
	if (runtime.db) {
		await saveExportJobRecordToDb(runtime.db, jobId, record);
		return;
	}

	await runtime.storage.exportJobs.put(jobId, record);
}

async function saveExportJobRecordToDb(
	db: unknown,
	jobId: string,
	record: ExportJobRecord,
): Promise<void> {
	const now = new Date().toISOString();
	await sql`
		INSERT INTO awcms_sikesra_export_jobs (
			id, tenant_id, site_id, report_type, filters_json, fields_json,
			format, reason, total_rows, r2_key, status, created_at, updated_at,
			created_by, updated_by
		) VALUES (
			${jobId}, ${record.tenantId}, ${record.siteId}, ${record.reportType},
			${JSON.stringify(record.filters)}, ${JSON.stringify(record.fields)},
			${record.format}, ${record.reason ?? null}, ${record.totalRows ?? null},
			${record.contentKey ?? null}, ${record.status}, ${record.createdAt}, ${now},
			${record.createdBy}, ${record.createdBy}
		)
		ON CONFLICT(id) DO UPDATE SET
			status = excluded.status,
			updated_at = excluded.updated_at,
			filters_json = excluded.filters_json,
			fields_json = excluded.fields_json,
			total_rows = excluded.total_rows,
			r2_key = excluded.r2_key,
			updated_by = excluded.updated_by
	`.execute(db as never);
}

async function getExportJobRecordFromDb(
	db: unknown,
	jobId: string,
	ctx: SikesraRequestContext,
): Promise<ExportJobRecord | null> {
	const result = await sql<{
		id: string;
		tenant_id: string;
		site_id: string;
		report_type: string | null;
		filters_json: string | null;
		fields_json: string | null;
		format: string;
		reason: string | null;
		total_rows: number | null;
		r2_key: string | null;
		status: string;
		created_at: string;
		updated_at: string;
		created_by: string | null;
	}>`
		SELECT id, tenant_id, site_id, report_type, filters_json, fields_json,
			format, reason, total_rows, r2_key, status, created_at, updated_at, created_by
		FROM awcms_sikesra_export_jobs
		WHERE id = ${jobId}
			AND tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	const row = result.rows[0];
	if (!row) return null;

	return {
		tenantId: row.tenant_id,
		siteId: row.site_id,
		reportType: row.report_type ?? "",
		filters: row.filters_json ? JSON.parse(row.filters_json) : {},
		fields: row.fields_json ? JSON.parse(row.fields_json) : [],
		format: row.format as ExportFormat,
		reason: row.reason ?? undefined,
		status: row.status as ExportJobStatus,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		createdBy: row.created_by ?? "",
		totalRows: row.total_rows ?? undefined,
		contentKey: row.r2_key ?? undefined,
		mimeType: row.r2_key ? "text/csv" : undefined,
	};
}

async function listExportJobsFromDb(
	db: unknown,
	ctx: SikesraRequestContext,
	status?: ExportJobStatus,
): Promise<ExportJobSummary[]> {
	const whereConditions = [
		sql`tenant_id = ${ctx.tenantId}`,
		sql`site_id = ${ctx.siteId}`,
		sql`deleted_at IS NULL`,
	];
	if (status) {
		whereConditions.push(sql`status = ${status}`);
	}

	const result = await sql<{
		id: string;
		tenant_id: string;
		site_id: string;
		report_type: string | null;
		filters_json: string | null;
		fields_json: string | null;
		format: string;
		reason: string | null;
		total_rows: number | null;
		r2_key: string | null;
		status: string;
		created_at: string;
		updated_at: string;
		created_by: string | null;
	}>`
		SELECT id, tenant_id, site_id, report_type, filters_json, fields_json,
			format, reason, total_rows, r2_key, status, created_at, updated_at, created_by
		FROM awcms_sikesra_export_jobs
		WHERE ${sql.join(whereConditions, sql` AND `)}
		ORDER BY created_at DESC
		LIMIT 50
	`.execute(db as never);

	return result.rows.map((row) => ({
		id: row.id,
		tenantId: row.tenant_id,
		siteId: row.site_id,
		reportType: row.report_type ?? "",
		filters: row.filters_json ? JSON.parse(row.filters_json) : {},
		fields: row.fields_json ? JSON.parse(row.fields_json) : [],
		format: row.format as ExportFormat,
		reason: row.reason ?? undefined,
		status: row.status as ExportJobStatus,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		createdBy: row.created_by ?? "",
		totalRows: row.total_rows ?? undefined,
		contentKey: row.r2_key ?? undefined,
		mimeType: row.r2_key ? "text/csv" : undefined,
	}));
}

async function writeExportAuditToDb(
	db: unknown,
	ctx: SikesraRequestContext,
	action: string,
	resourceId: string,
	reason?: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	await sql`
		INSERT INTO awcms_sikesra_audit_logs (
			id, tenant_id, site_id, actor_id, action, resource_type, resource_id,
			reason, after_json, created_at
		) VALUES (
			${id}, ${ctx.tenantId}, ${ctx.siteId}, ${ctx.userId}, ${action},
			'export_job', ${resourceId}, ${reason ?? null},
			${metadata ? JSON.stringify(metadata) : null},
			${new Date().toISOString()}
		)
	`.execute(db as never);
}
