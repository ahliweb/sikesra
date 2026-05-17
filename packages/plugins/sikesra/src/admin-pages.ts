import { sql } from "kysely";

import { getDetailModuleConfig } from "./detail-modules.js";
import {
	getEntityKindLabel,
	hasModuleSubtype,
	getModuleSubtypeOptions,
	getModuleUiConfig,
	getModuleUiFieldConfig,
	listModuleUiConfigs,
} from "./module-ui-config.js";
import { SIKESRA_API_BASE } from "./shared.js";
import {
	completeUpload,
	estimateBase64SizeBytes,
	generateUploadUrl,
	guessMimeTypeFromFilename,
	getEntityDocuments,
	validateUploadInput,
	type CompleteUploadInput,
	type DocumentClassification,
	type DocumentStorageContext,
	type GenerateUploadUrlInput,
	type UploadUrlResponse,
} from "./document.js";
import {
	createExportJob,
	listAvailableReports,
	listExportJobs,
	type ExportCreateInput,
	type ExportStorageContext,
} from "./export.js";
import {
	createDraft,
	generateSikesraId20,
	updateDraft,
	validateEntity,
	type DraftCreateInput,
	type DraftUpdateInput,
} from "./services/draft.js";
import {
	archiveEntity,
	getEntityDetail,
	getEntityDuplicatePreview,
	listEntities,
	restoreEntity,
	type EntityListFilters,
} from "./services/entities.js";
import { listLocalRegions, listOfficialRegions } from "./services/regions.js";
import { submitForVerification } from "./services/verification.js";
import type { SikesraRequestContext } from "./security/request-context.js";
import { guardRoute } from "./security/route-guard.js";
import { buildTenantSiteScopeSql } from "./tenant-site-scope.js";

// ── Block Types (inline to avoid @emdash-cms/blocks dependency) ─────────────

type Block = {
	type: string;
	[key: string]: unknown;
};

interface BlockResponse {
	blocks: Block[];
	toast?: { message: string; type: "success" | "error" | "info" };
}

interface EntitySubmitReadiness {
	invalidSections: string[];
	highRiskDuplicateCount: number;
	documentCount: number;
	canSubmit: boolean;
	recommendedAction: string;
	reasonMessage?: string;
}

interface AdminDocumentRegisterInput
	extends GenerateUploadUrlInput,
		Pick<CompleteUploadInput, "entityId" | "documentType" | "checksumSha256" | "contentBase64"> {}

// ── Admin Page Router ────────────────────────────────────────────────────────

export async function buildAdminPage(
	db: unknown,
	ctx: SikesraRequestContext,
	page: string,
	action?: { type: string; values?: Record<string, unknown> },
): Promise<BlockResponse> {
	switch (page) {
		case "/":
			return action ? handleDashboardAction(db, ctx, action) : buildDashboard(db, ctx);
		case "/audit":
			return action ? handleAuditAction(db, ctx, action) : buildAuditList(db, ctx);
		case "/settings":
			return action ? handleSettingsAction(db, ctx, action) : buildSettings(db, ctx);
		case "/operations":
			return action ? handleOperationsAction(db, ctx, action) : buildOperations(db, ctx);
		case "/operations/documents":
			return action ? handleOperationsDocumentsAction(db, ctx, action) : buildOperationsDocumentsPage(db, ctx);
		case "/operations/imports":
			return action ? handleOperationsImportsAction(db, ctx, action) : buildOperationsImportsPage(db, ctx);
		case "/operations/reports":
			return action ? handleReportsAction(db, ctx, action) : buildReportsPage(db, ctx);
		case "/entities":
			return action ? handleEntityAction(db, ctx, action) : buildEntityList(db, ctx);
		case "/verification":
			return action ? handleVerificationAction(db, ctx, action) : buildVerificationQueue(db, ctx);
		default:
			return buildNotFound(page);
	}
}

// ── Dashboard ────────────────────────────────────────────────────────────────

async function buildDashboard(db: unknown, ctx: SikesraRequestContext): Promise<BlockResponse> {
	const denied = guardRoute(ctx, "dashboard:read");
	if (!denied.allowed) {
		return {
			blocks: [
				{
					type: "banner",
					variant: "error",
					title: "Akses Ditolak",
					description: denied.reasonMessage,
				},
			],
		};
	}

	const kpis = await loadDashboardKpis(db, ctx);
	const queues = await loadWorkQueues(db, ctx);

	const blocks: Block[] = [
		{ type: "header", text: "Dashboard SIKESRA" },
		{
			type: "context",
			text: `Tenant: ${ctx.tenantId} | Site: ${ctx.siteId} | Scope: ${ctx.regionScope || "Global"}`,
		},
		{ type: "divider" },
		{ type: "stats", items: kpis },
		{ type: "divider" },
	];

	// Context info card
	blocks.push({
		type: "section",
		text: "Gunakan halaman ini sebagai surface admin SIKESRA yang stabil selama rebuild bertahap berlangsung. Akses detail tetap harus mengikuti auth, permission, dan ABAC di backend.",
	});
	blocks.push({ type: "divider" });

	// Work queues
	if (queues.pendingVerification > 0) {
		blocks.push({
			type: "banner",
			variant: "alert",
			title: "Antrian Verifikasi",
			description: `${queues.pendingVerification} entri menunggu verifikasi`,
		});
		blocks.push({
			type: "actions",
			elements: [
				{
					type: "button",
					action_id: "navigate:verification",
					label: "Buka Antrian Verifikasi",
					style: "primary",
				},
			],
		});
	}

	if (queues.duplicateCandidates > 0) {
		blocks.push({
			type: "banner",
			variant: "alert",
			title: "Kandidat Duplikat",
			description: `${queues.duplicateCandidates} entri terdeteksi sebagai duplikat`,
		});
	}

	if (queues.incompleteDocuments > 0) {
		blocks.push({
			type: "context",
			text: `${queues.incompleteDocuments} entri dengan dokumen belum lengkap`,
		});
	}

	// Recent activity
	blocks.push({ type: "divider" });
	blocks.push({ type: "header", text: "Aktivitas Terbaru" });

	const recentAudit = await loadRecentAudit(db, ctx, 5);
	if (recentAudit.length > 0) {
		blocks.push({
			type: "table",
			columns: [
				{ key: "action", label: "Aksi", format: "badge" },
				{ key: "actor", label: "Aktor", format: "text" },
				{ key: "resource", label: "Sumber Daya", format: "text" },
				{ key: "createdAt", label: "Waktu", format: "relative_time" },
			],
			rows: recentAudit,
			page_action_id: "audit:view",
			empty_text: "Tidak ada aktivitas terbaru",
		});
	} else {
		blocks.push({
			type: "empty",
			title: "Belum Ada Aktivitas",
			description: "Aktivitas akan muncul setelah operasi dilakukan",
		});
	}

	// Quick actions
	blocks.push({ type: "divider" });
	blocks.push({ type: "header", text: "Aksi Cepat" });
	blocks.push({
		type: "actions",
		elements: [
			{
				type: "button",
				action_id: "navigate:entities/new",
				label: "Tambah Entitas Baru",
				style: "primary",
			},
			{ type: "button", action_id: "navigate:entities", label: "Lihat Registry" },
			{ type: "button", action_id: "navigate:imports", label: "Import Excel" },
			{ type: "button", action_id: "navigate:reports", label: "Laporan" },
		],
	});

	return { blocks };
}

async function handleDashboardAction(
	_db: unknown,
	_ctx: SikesraRequestContext,
	action: { type: string; values?: Record<string, unknown> },
): Promise<BlockResponse> {
	if (
		action.type === "block_action" &&
		action.values?.action_id?.toString().startsWith("navigate:")
	) {
		const target = action.values.action_id.toString().replace("navigate:", "");
		return {
			blocks: [
				{ type: "banner", variant: "info", title: "Navigasi", description: `Menuju: ${target}` },
			],
			toast: { message: `Navigasi ke ${target}`, type: "info" },
		};
	}
	return { blocks: [] };
}

interface WorkQueues {
	pendingVerification: number;
	duplicateCandidates: number;
	incompleteDocuments: number;
}

async function loadDashboardKpis(db: unknown, ctx: SikesraRequestContext) {
	const result = await sql<{
		total: number;
		draft: number;
		submitted: number;
		verified: number;
		need_revision: number;
		rejected: number;
	}>`
		SELECT
			COUNT(*) as total,
			SUM(CASE WHEN status_data = 'draft' THEN 1 ELSE 0 END) as draft,
			SUM(CASE WHEN status_verification LIKE 'submitted%' THEN 1 ELSE 0 END) as submitted,
			SUM(CASE WHEN status_verification = 'verified' THEN 1 ELSE 0 END) as verified,
			SUM(CASE WHEN status_verification = 'need_revision' THEN 1 ELSE 0 END) as need_revision,
			SUM(CASE WHEN status_verification = 'rejected' THEN 1 ELSE 0 END) as rejected
		FROM awcms_sikesra_entities
		WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)}
			AND status_data != 'archived'
			AND deleted_at IS NULL
	`.execute(db as never);

	const row = result.rows[0];
	return [
		{ label: "Total Entitas", value: row?.total ?? 0, description: "Semua entitas aktif" },
		{ label: "Draft", value: row?.draft ?? 0, description: "Belum selesai diisi" },
		{ label: "Menunggu Verifikasi", value: row?.submitted ?? 0, description: "Sudah diajukan" },
		{
			label: "Terverifikasi",
			value: row?.verified ?? 0,
			description: "Sudah diverifikasi",
			trend: "up" as const,
		},
		{ label: "Perlu Revisi", value: row?.need_revision ?? 0, description: "Butuh perbaikan" },
		{ label: "Ditolak", value: row?.rejected ?? 0, description: "Tidak memenuhi syarat" },
	];
}

async function loadWorkQueues(db: unknown, ctx: SikesraRequestContext): Promise<WorkQueues> {
	const result = await sql<{
		pending_verification: number;
		duplicate_candidates: number;
		incomplete_documents: number;
	}>`
		SELECT
			(SELECT COUNT(*) FROM awcms_sikesra_entities WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)} AND deleted_at IS NULL AND status_data != 'archived' AND status_verification LIKE 'submitted%') as pending_verification,
			(SELECT COUNT(*) FROM awcms_sikesra_entities WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)} AND deleted_at IS NULL AND status_data != 'archived' AND duplicate_status = 'candidate') as duplicate_candidates,
			(SELECT COUNT(*) FROM awcms_sikesra_entities WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)} AND deleted_at IS NULL AND status_data != 'archived' AND completeness_percent < 100) as incomplete_documents
	`.execute(db as never);

	const row = result.rows[0];
	return {
		pendingVerification: row?.pending_verification ?? 0,
		duplicateCandidates: row?.duplicate_candidates ?? 0,
		incompleteDocuments: row?.incomplete_documents ?? 0,
	};
}

async function loadRecentAudit(
	db: unknown,
	ctx: SikesraRequestContext,
	limit: number,
): Promise<Array<Record<string, unknown>>> {
	const result = await sql<{
		action: string;
		actor_id: string | null;
		resource_type: string | null;
		resource_id: string | null;
		created_at: string;
	}>`
		SELECT action, actor_id, resource_type, resource_id, created_at
		FROM awcms_sikesra_audit_logs
		WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)}
		ORDER BY created_at DESC
		LIMIT ${limit}
	`.execute(db as never);

	return result.rows.map((row) => ({
		action: row.action,
		actor: row.actor_id ? row.actor_id.slice(0, 8) + "..." : "Sistem",
		resource: row.resource_type ? `${row.resource_type}` : "-",
		createdAt: row.created_at,
	}));
}

// ── Audit List ───────────────────────────────────────────────────────────────

async function buildAuditList(db: unknown, ctx: SikesraRequestContext): Promise<BlockResponse> {
	const denied = guardRoute(ctx, "audit:read");
	if (!denied.allowed) {
		return {
			blocks: [
				{
					type: "banner",
					variant: "error",
					title: "Akses Ditolak",
					description: denied.reasonMessage,
				},
			],
		};
	}

	const result = await sql<{
		id: string;
		action: string;
		actor_id: string | null;
		resource_type: string | null;
		resource_id: string | null;
		success: number;
		created_at: string;
	}>`
		SELECT id, action, actor_id, resource_type, resource_id, success, created_at
		FROM awcms_sikesra_audit_logs
		WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)}
		ORDER BY created_at DESC
		LIMIT 50
	`.execute(db as never);

	const blocks: Block[] = [
		{ type: "header", text: "Audit Log" },
		{ type: "context", text: "Catatan aktivitas sistem dan perubahan data" },
		{ type: "divider" },
	];

	if (result.rows.length === 0) {
		blocks.push({
			type: "empty",
			title: "Tidak Ada Audit Log",
			description: "Belum ada aktivitas yang tercatat",
		});
	} else {
		blocks.push({
			type: "table",
			columns: [
				{ key: "action", label: "Aksi", format: "badge" },
				{ key: "actor", label: "Aktor", format: "text" },
				{ key: "resource", label: "Sumber Daya", format: "text" },
				{ key: "success", label: "Status", format: "badge" },
				{ key: "createdAt", label: "Waktu", format: "relative_time" },
				{ key: "detail", label: "Detail", format: "text" },
			],
			rows: result.rows.map((row) => ({
				id: row.id,
				action: row.action,
				actor: row.actor_id ? row.actor_id.slice(0, 8) + "..." : "Sistem",
				resource: row.resource_type ? `${row.resource_type}` : "-",
				success: row.success === 1 ? "Berhasil" : "Gagal",
				createdAt: row.created_at,
				detail: "Lihat",
			})),
			page_action_id: "audit:view_detail",
			empty_text: "Tidak ada audit log",
		});
	}

	blocks.push({
		type: "actions",
		elements: [
			{ type: "button", action_id: "audit:export", label: "Export Audit Log", style: "secondary" },
		],
	});

	return { blocks };
}

async function handleAuditAction(
	db: unknown,
	ctx: SikesraRequestContext,
	action: { type: string; values?: Record<string, unknown> },
): Promise<BlockResponse> {
	if (action.values?.action_id === "audit:view_detail") {
		const auditId = action.values?.id as string | undefined;
		if (auditId) {
			return buildAuditDetail(db, ctx, auditId);
		}
	}
	if (action.values?.action_id === "audit:export") {
		return {
			blocks: [
				{
					type: "banner",
					variant: "info",
					title: "Export Dimulai",
					description: "Audit log sedang diekspor",
				},
			],
			toast: { message: "Export audit log dimulai", type: "info" },
		};
	}
	return { blocks: [] };
}

async function buildAuditDetail(
	db: unknown,
	ctx: SikesraRequestContext,
	auditId: string,
): Promise<BlockResponse> {
	const result = await sql<{
		id: string;
		action: string;
		actor_id: string | null;
		actor_role: string | null;
		resource_type: string | null;
		resource_id: string | null;
		request_id: string | null;
		success: number;
		reason: string | null;
		ip_address: string | null;
		user_agent: string | null;
		created_at: string;
	}>`
		SELECT id, action, actor_id, actor_role, resource_type, resource_id, request_id, success, reason, ip_address, user_agent, created_at
		FROM awcms_sikesra_audit_logs
		WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)}
			AND id = ${auditId}
		LIMIT 1
	`.execute(db as never);

	const row = result.rows[0];
	if (!row) {
		return {
			blocks: [
				{
					type: "banner",
					variant: "error",
					title: "Tidak Ditemukan",
					description: "Audit log tidak ditemukan",
				},
			],
		};
	}

	return {
		blocks: [
			{ type: "header", text: "Detail Audit" },
			{ type: "divider" },
			{
				type: "fields",
				fields: [
					{ label: "Aksi", value: row.action },
					{ label: "Aktor", value: row.actor_id ?? "Sistem" },
					{ label: "Peran", value: row.actor_role ?? "-" },
					{ label: "Tipe Sumber Daya", value: row.resource_type ?? "-" },
					{ label: "ID Sumber Daya", value: row.resource_id ?? "-" },
					{ label: "Status", value: row.success === 1 ? "Berhasil" : "Gagal" },
					{ label: "Alasan", value: row.reason ?? "-" },
					{ label: "IP Address", value: row.ip_address ?? "-" },
					{ label: "Waktu", value: row.created_at },
				],
			},
			{ type: "divider" },
			{
				type: "actions",
				elements: [
					{
						type: "button",
						action_id: "audit:back_to_list",
						label: "Kembali ke Daftar",
						style: "secondary",
					},
				],
			},
		],
	};
}

// ── Settings ─────────────────────────────────────────────────────────────────

async function buildSettings(db: unknown, ctx: SikesraRequestContext): Promise<BlockResponse> {
	const denied = guardRoute(ctx, "settings:read");
	if (!denied.allowed) {
		return {
			blocks: [
				{
					type: "banner",
					variant: "error",
					title: "Akses Ditolak",
					description: denied.reasonMessage,
				},
			],
		};
	}

	const result = await sql<{
		public_enabled: number;
		public_title: string;
		public_description: string | null;
		data_scope_note: string | null;
		official_contact: string | null;
		small_cell_threshold: number;
	}>`
		SELECT public_enabled, public_title, public_description, data_scope_note, official_contact, small_cell_threshold
		FROM awcms_sikesra_settings
		WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
			AND site_id = 'main'
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	const row = result.rows[0];
	const settings = {
		publicEnabled: row?.public_enabled === 1,
		publicTitle: row?.public_title ?? "SIKESRA",
		publicDescription: row?.public_description ?? "",
		dataScopeNote: row?.data_scope_note ?? "",
		officialContact: row?.official_contact ?? "",
		smallCellThreshold: row?.small_cell_threshold ?? 5,
	};

	return {
		blocks: [
			{ type: "header", text: "Pengaturan SIKESRA" },
			{ type: "context", text: "Konfigurasi sistem dan tampilan publik" },
			{ type: "divider" },
			{
				type: "form",
				fields: [
					{
						type: "toggle",
						action_id: "publicEnabled",
						label: "Aktifkan Halaman Publik",
						initial_value: settings.publicEnabled,
					},
					{
						type: "text_input",
						action_id: "publicTitle",
						label: "Judul Halaman Publik",
						initial_value: settings.publicTitle,
					},
					{
						type: "text_input",
						action_id: "publicDescription",
						label: "Deskripsi Halaman Publik",
						initial_value: settings.publicDescription,
						multiline: true,
					},
					{
						type: "text_input",
						action_id: "dataScopeNote",
						label: "Catatan Lingkup Data",
						initial_value: settings.dataScopeNote,
						multiline: true,
					},
					{
						type: "text_input",
						action_id: "officialContact",
						label: "Kontak Resmi",
						initial_value: settings.officialContact,
					},
					{
						type: "number_input",
						action_id: "smallCellThreshold",
						label: "Batas Supresi Sel Kecil",
						initial_value: settings.smallCellThreshold,
						min: 1,
						max: 20,
					},
				],
				submit: { label: "Simpan Pengaturan", action_id: "settings:update" },
			},
		],
	};
}

async function handleSettingsAction(
	db: unknown,
	ctx: SikesraRequestContext,
	action: { type: string; values?: Record<string, unknown> },
): Promise<BlockResponse> {
	if (action.values?.action_id === "settings:update") {
		const values = action.values as Record<string, unknown>;
		const reason = typeof values.reason === "string" ? values.reason : "Update melalui admin UI";

		const updates: string[] = [];
		const params: unknown[] = [];

		if (typeof values.publicEnabled === "boolean") {
			updates.push("public_enabled = ?");
			params.push(values.publicEnabled ? 1 : 0);
		}
		if (typeof values.publicTitle === "string") {
			updates.push("public_title = ?");
			params.push(values.publicTitle);
		}
		if (typeof values.publicDescription === "string") {
			updates.push("public_description = ?");
			params.push(values.publicDescription);
		}
		if (typeof values.dataScopeNote === "string") {
			updates.push("data_scope_note = ?");
			params.push(values.dataScopeNote);
		}
		if (typeof values.officialContact === "string") {
			updates.push("official_contact = ?");
			params.push(values.officialContact);
		}
		if (typeof values.smallCellThreshold === "number") {
			updates.push("small_cell_threshold = ?");
			params.push(values.smallCellThreshold);
		}

		if (updates.length > 0) {
			updates.push("updated_at = datetime('now')", "updated_by = ?");
			params.push(ctx.userId);
			params.push(ctx.tenantId);
			params.push(ctx.siteId);

			await sql
				.raw(
					`UPDATE awcms_sikesra_settings SET ${updates.join(", ")} WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
				)
				.execute(db as never);
		}

		// Write audit log
		await sql`
			INSERT INTO awcms_sikesra_audit_logs (
				id, tenant_id, site_id, actor_id, actor_role, action,
				resource_type, resource_id, request_id, success, reason,
				before_json, after_json, ip_address, user_agent, created_at
			) VALUES (
				${`audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
				${ctx.tenantId}, ${ctx.siteId}, ${ctx.userId},
				${ctx.roles[0] ?? "unknown"}, 'settings.update',
				'settings', 'global', ${ctx.requestId}, 1, ${reason},
				${JSON.stringify(values)}, ${JSON.stringify(values)},
				${ctx.ipAddress ?? null}, ${ctx.userAgent ?? null},
				datetime('now')
			)
		`.execute(db as never);

		return {
			blocks: [
				{
					type: "banner",
					variant: "alert",
					title: "Pengaturan Disimpan",
					description: "Perubahan telah disimpan dengan sukses",
				},
			],
			toast: { message: "Pengaturan berhasil disimpan", type: "success" },
		};
	}
	return { blocks: [] };
}

// ── Operations ───────────────────────────────────────────────────────────────

async function buildOperations(db: unknown, ctx: SikesraRequestContext): Promise<BlockResponse> {
	// Use dashboard:read as fallback since operations:read doesn't exist
	const denied = guardRoute(ctx, "dashboard:read");
	if (!denied.allowed) {
		return {
			blocks: [
				{
					type: "banner",
					variant: "error",
					title: "Akses Ditolak",
					description: denied.reasonMessage,
				},
			],
		};
	}

	const blocks: Block[] = [
		{ type: "header", text: "Operasional SIKESRA" },
		{ type: "context", text: "Workflow operasional: dokumen, import, export, dan laporan" },
		{ type: "divider" },
		{
			type: "actions",
			elements: [
			{
				type: "button",
				action_id: "navigate:documents",
				label: "Kelola Dokumen",
				style: "primary",
			},
			{ type: "button", action_id: "navigate:imports", label: "Import Excel", style: "primary" },
			{
				type: "button",
				action_id: "navigate:reports",
				label: "Laporan & Export",
				style: "primary",
			},
			],
		},
		{ type: "divider" },
		{ type: "header", text: "Status Sistem" },
	];

	// Check D1 connection
	try {
		await sql`SELECT 1`.execute(db as never);
		blocks.push({
			type: "fields",
			fields: [
				{ label: "Database D1", value: "Terhubung" },
				{ label: "Tenant", value: ctx.tenantId },
				{ label: "Site", value: ctx.siteId },
			],
		});
	} catch {
		blocks.push({
			type: "banner",
			variant: "error",
			title: "Database Error",
			description: "Tidak dapat terhubung ke database D1",
		});
	}

	return { blocks };
}

async function handleOperationsAction(
	db: unknown,
	ctx: SikesraRequestContext,
	action: { type: string; values?: Record<string, unknown> },
): Promise<BlockResponse> {
	const actionId = action.values?.action_id;
	if (actionId === "navigate:reports") {
		return buildReportsPage(db, ctx);
	}
	if (actionId === "navigate:documents" || actionId === "navigate:imports") {
		return actionId === "navigate:documents"
			? buildOperationsDocumentsPage(db, ctx)
			: buildOperationsImportsPage(db, ctx);
	}
	if (actionId === "operations:back") {
		return buildOperations(db, ctx);
	}
	if (actionId === "reports:create") {
		const input = normalizeReportCreateInput(action.values);
		const created = await createExportJob(createDbExportRuntime(db), input, ctx);
		const refreshed = await buildReportsPage(db, ctx);
		return {
			...refreshed,
			toast: {
				message: `Job export ${created.id} dibuat untuk laporan ${input.reportType}`,
				type: "success",
			},
		};
	}
	return { blocks: [] };
}

async function handleOperationsDocumentsAction(
	db: unknown,
	ctx: SikesraRequestContext,
	action: { type: string; values?: Record<string, unknown> },
): Promise<BlockResponse> {
	const actionId = action.values?.action_id;
	if (actionId === "operations:back") return buildOperations(db, ctx);
	if (actionId === "navigate:entities") return buildEntityList(db, ctx);
	return buildOperationsDocumentsPage(db, ctx);
}

async function handleOperationsImportsAction(
	db: unknown,
	ctx: SikesraRequestContext,
	action: { type: string; values?: Record<string, unknown> },
): Promise<BlockResponse> {
	const actionId = action.values?.action_id;
	if (actionId === "operations:back") return buildOperations(db, ctx);
	if (actionId === "navigate:entities") return buildEntityList(db, ctx);
	if (actionId === "navigate:reports") return buildReportsPage(db, ctx);
	return buildOperationsImportsPage(db, ctx);
}

async function handleReportsAction(
	db: unknown,
	ctx: SikesraRequestContext,
	action: { type: string; values?: Record<string, unknown> },
): Promise<BlockResponse> {
	const actionId = action.values?.action_id;
	if (actionId === "operations:back") return buildOperations(db, ctx);
	if (actionId === "navigate:documents") return buildOperationsDocumentsPage(db, ctx);
	if (actionId === "navigate:imports") return buildOperationsImportsPage(db, ctx);
	return buildReportsPage(db, ctx);
}

async function buildOperationsDocumentsPage(db: unknown, ctx: SikesraRequestContext): Promise<BlockResponse> {
	const denied = guardRoute(ctx, "dashboard:read");
	if (!denied.allowed) {
		return {
			blocks: [
				{
					type: "banner",
					variant: "error",
					title: "Akses Ditolak",
					description: denied.reasonMessage,
				},
			],
		};
	}

	const stats = await sql<{ file_objects: number; supporting_documents: number; verified_documents: number }>`
		SELECT
			COUNT(DISTINCT fo.id) AS file_objects,
			COUNT(DISTINCT doc.id) AS supporting_documents,
			COUNT(DISTINCT CASE WHEN doc.is_verified = 1 THEN doc.id END) AS verified_documents
		FROM awcms_sikesra_file_objects fo
		LEFT JOIN awcms_sikesra_supporting_documents doc
			ON doc.file_object_id = fo.id
			AND doc.tenant_id = fo.tenant_id
			AND doc.site_id = fo.site_id
			AND doc.deleted_at IS NULL
		WHERE fo.tenant_id = ${ctx.tenantId}
			AND fo.site_id = ${ctx.siteId}
			AND fo.deleted_at IS NULL
	`.execute(db as never);
	const recentDocuments = await sql<{
		id: string;
		document_type: string | null;
		classification: string;
		original_filename: string;
		entity_name: string | null;
		is_verified: number;
		created_at: string;
	}>`
		SELECT
			doc.id,
			doc.document_type,
			doc.classification,
			fo.original_filename,
			e.display_name AS entity_name,
			doc.is_verified,
			doc.created_at
		FROM awcms_sikesra_supporting_documents doc
		LEFT JOIN awcms_sikesra_file_objects fo ON fo.id = doc.file_object_id
		LEFT JOIN awcms_sikesra_entities e ON e.id = doc.entity_id
		WHERE doc.tenant_id = ${ctx.tenantId}
			AND doc.site_id = ${ctx.siteId}
			AND doc.deleted_at IS NULL
		ORDER BY doc.created_at DESC
		LIMIT 10
	`.execute(db as never);

	return {
		blocks: [
			{ type: "header", text: "Kelola Dokumen" },
			{ type: "context", text: "Pantau file object, dokumen pendukung, dan status verifikasinya di satu tempat." },
			{ type: "divider" },
			{
				type: "actions",
				elements: [
					{ type: "button", action_id: "operations:back", label: "Kembali ke Operasional", style: "secondary" },
					{ type: "button", action_id: "navigate:entities", label: "Buka Registry", style: "primary" },
				],
			},
			{ type: "divider" },
			{
				type: "stats",
				items: [
					{ label: "File object", value: stats.rows[0]?.file_objects ?? 0 },
					{ label: "Dokumen pendukung", value: stats.rows[0]?.supporting_documents ?? 0 },
					{ label: "Terverifikasi", value: stats.rows[0]?.verified_documents ?? 0 },
				],
			},
			{ type: "divider" },
			{ type: "header", text: "Dokumen Terbaru" },
			...(recentDocuments.rows.length === 0
				? ([
					{
						type: "empty",
						title: "Belum Ada Dokumen",
						description: "Dokumen pendukung akan tampil di sini setelah diunggah dari workflow entitas.",
					},
				] as Block[])
				: ([
					{
						type: "table",
						columns: [
							{ key: "id", label: "Document ID", format: "code" },
							{ key: "entity", label: "Entitas", format: "text" },
							{ key: "type", label: "Jenis", format: "text" },
							{ key: "classification", label: "Klasifikasi", format: "badge" },
							{ key: "verified", label: "Verifikasi", format: "badge" },
						],
						rows: recentDocuments.rows.map((doc) => ({
							id: doc.id,
							entity: doc.entity_name ?? "-",
							type: doc.document_type ?? "-",
							classification: doc.classification,
							verified: doc.is_verified ? "verified" : "uploaded",
						})),
						empty_text: "Tidak ada dokumen",
					},
				] as Block[])),
		],
	};
}

async function buildOperationsImportsPage(db: unknown, ctx: SikesraRequestContext): Promise<BlockResponse> {
	const denied = guardRoute(ctx, "dashboard:read");
	if (!denied.allowed) {
		return {
			blocks: [
				{
					type: "banner",
					variant: "error",
					title: "Akses Ditolak",
					description: denied.reasonMessage,
				},
			],
		};
	}

	const stats = await sql<{ total: number; uploaded: number; validated: number; promoted: number; failed: number }>`
		SELECT
			COUNT(*) AS total,
			COUNT(CASE WHEN status = 'uploaded' THEN 1 END) AS uploaded,
			COUNT(CASE WHEN status = 'validated' THEN 1 END) AS validated,
			COUNT(CASE WHEN status = 'promoted' THEN 1 END) AS promoted,
			COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed
		FROM awcms_sikesra_import_batches
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND deleted_at IS NULL
	`.execute(db as never);
	const batches = await sql<{
		id: string;
		original_filename: string;
		object_type_code: string | null;
		row_count: number;
		valid_row_count: number;
		invalid_row_count: number;
		promoted_row_count: number;
		status: string;
		created_at: string;
	}>`
		SELECT id, original_filename, object_type_code, row_count, valid_row_count, invalid_row_count, promoted_row_count, status, created_at
		FROM awcms_sikesra_import_batches
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT 10
	`.execute(db as never);

	return {
		blocks: [
			{ type: "header", text: "Import Excel" },
			{ type: "context", text: "Kelola batch import, mapping, validasi, dan hasil promosi dari satu subpage operasional." },
			{ type: "divider" },
			{
				type: "actions",
				elements: [
					{ type: "button", action_id: "operations:back", label: "Kembali ke Operasional", style: "secondary" },
					{ type: "button", action_id: "navigate:reports", label: "Buka Laporan", style: "primary" },
				],
			},
			{ type: "divider" },
			{
				type: "stats",
				items: [
					{ label: "Total batch", value: stats.rows[0]?.total ?? 0 },
					{ label: "Uploaded", value: stats.rows[0]?.uploaded ?? 0 },
					{ label: "Validated", value: stats.rows[0]?.validated ?? 0 },
					{ label: "Promoted", value: stats.rows[0]?.promoted ?? 0 },
					{ label: "Failed", value: stats.rows[0]?.failed ?? 0 },
				],
			},
			{ type: "divider" },
			{ type: "header", text: "Batch Terbaru" },
			...(batches.rows.length === 0
				? ([
					{
						type: "empty",
						title: "Belum Ada Import Batch",
						description: "Batch import akan tampil setelah file CSV diunggah dan diproses.",
					},
				] as Block[])
				: ([
					{
						type: "table",
						columns: [
							{ key: "id", label: "Batch ID", format: "code" },
							{ key: "file", label: "File", format: "text" },
							{ key: "type", label: "Jenis", format: "text" },
							{ key: "rows", label: "Rows", format: "number" },
							{ key: "status", label: "Status", format: "badge" },
						],
						rows: batches.rows.map((batch) => ({
							id: batch.id,
							file: batch.original_filename,
							type: batch.object_type_code ?? "-",
							rows: batch.row_count,
							status: batch.status,
						})),
						empty_text: "Tidak ada batch import",
					},
				] as Block[])),
		],
	};
}

async function buildReportsPage(db: unknown, ctx: SikesraRequestContext): Promise<BlockResponse> {
	const reports = listAvailableReports(ctx);
	const jobs = await listExportJobs(createDbExportRuntime(db), ctx);

	const blocks: Block[] = [
		{ type: "header", text: "Laporan & Export SIKESRA" },
		{
			type: "context",
			text: "Gunakan halaman ini untuk memilih laporan yang tersedia dan melihat job export terbaru.",
		},
		{ type: "divider" },
			{
				type: "actions",
				elements: [
					{
						type: "button",
						action_id: "operations:back",
						label: "Kembali ke Operasional",
						style: "secondary",
					},
				],
			},
		{ type: "divider" },
	];

	if (reports.length === 0) {
		blocks.push({
			type: "empty",
			title: "Belum Ada Laporan Yang Bisa Diakses",
			description: "Permission export Anda belum membuka laporan apa pun.",
		});
		return { blocks };
	}

	blocks.push({
		type: "form",
		fields: [
			{
				type: "select",
				action_id: "reportType",
				label: "Jenis Laporan",
				options: reports.map((report) => ({ label: report.name, value: report.id })),
			},
			{
				type: "text_input",
				action_id: "reason",
				label: "Alasan Akses / Catatan",
				placeholder: "Wajib untuk laporan restricted atau audit",
			},
		],
		submit: { label: "Buat Job Export", action_id: "reports:create" },
	});

	blocks.push({ type: "divider" });
	blocks.push({ type: "header", text: "Laporan Tersedia" });
	blocks.push({
		type: "table",
		columns: [
			{ key: "name", label: "Nama", format: "text" },
			{ key: "description", label: "Deskripsi", format: "text" },
			{ key: "permission", label: "Permission", format: "badge" },
			{ key: "reasonRequired", label: "Alasan", format: "badge" },
		],
		rows: reports.map((report) => ({
			name: report.name,
			description: report.description,
			permission: report.requiredPermission,
			reasonRequired: report.reasonRequired ? "Wajib" : "Opsional",
		})),
		empty_text: "Tidak ada laporan",
	});

	blocks.push({ type: "divider" });
	blocks.push({ type: "header", text: "Job Export Terbaru" });
	if (jobs.length === 0) {
		blocks.push({
			type: "empty",
			title: "Belum Ada Job Export",
			description: "Buat job pertama Anda dari form di atas.",
		});
	} else {
		blocks.push({
			type: "table",
			columns: [
				{ key: "id", label: "Job ID", format: "code" },
				{ key: "reportType", label: "Laporan", format: "badge" },
				{ key: "status", label: "Status", format: "badge" },
				{ key: "format", label: "Format", format: "text" },
				{ key: "createdAt", label: "Dibuat", format: "relative_time" },
			],
			rows: jobs.slice(0, 10).map((job) => ({
				id: job.id,
				reportType: job.reportType,
				status: job.status,
				format: job.format,
				createdAt: job.createdAt,
			})),
			empty_text: "Tidak ada job export",
		});
	}

	return { blocks };
}

function createDbExportRuntime(db: unknown): ExportStorageContext {
	return {
		db,
		storage: {
			exportJobs: {
				put: async () => undefined,
				get: async () => null,
				query: async () => ({ items: [] }),
			},
			auditEntries: {
				put: async () => undefined,
				query: async () => ({ items: [] }),
			},
		},
		kv: {
			get: async () => null,
			set: async () => undefined,
		},
	};
}

function normalizeReportCreateInput(values: Record<string, unknown> | undefined): ExportCreateInput {
	const input = values ?? {};
	const reportType = typeof input.reportType === "string" ? input.reportType : "";
	if (!reportType) throw new Error("REPORT_TYPE_REQUIRED");
	return {
		reportType,
		reason: typeof input.reason === "string" ? input.reason : undefined,
		format: "csv",
	};
}

// ── Entity Registry ──────────────────────────────────────────────────────────

async function buildEntityList(
	db: unknown,
	ctx: SikesraRequestContext,
	filters: EntityListFilters = {},
): Promise<BlockResponse> {
	const denied = guardRoute(ctx, "entity:read");
	if (!denied.allowed) {
		return {
			blocks: [
				{
					type: "banner",
					variant: "error",
					title: "Akses Ditolak",
					description: denied.reasonMessage,
				},
			],
		};
	}

	const result = await listEntities(db, ctx, { ...filters, limit: 50 });
	const moduleOptions = listModuleUiConfigs().map((moduleConfig) => ({
		label: moduleConfig.label,
		value: moduleConfig.objectTypeCode,
	}));
	const subtypeOptions = [
		{ label: "Semua Subjenis", value: "" },
		...getModuleSubtypeOptions(filters.objectTypeCode),
	];

	const blocks: Block[] = [
		{ type: "header", text: "Registry Entitas" },
		{ type: "context", text: "Daftar semua entitas terdaftar" },
		{
			type: "actions",
			elements: [
				{
					type: "button",
					action_id: "entities:start_create",
					label: "Tambah Entitas Baru",
					style: "primary",
				},
			],
		},
		{ type: "divider" },
	];

	// Filter form
	blocks.push({
		type: "form",
		fields: [
			{
				type: "text_input",
				action_id: "keyword",
				label: "Kata Kunci",
				placeholder: "Cari nama atau ID",
			},
			{
				type: "select",
				action_id: "objectTypeCode",
				label: "Modul Data",
				options: [{ label: "Semua Modul", value: "" }, ...moduleOptions],
				value: filters.objectTypeCode ?? "",
			},
			{
				type: "select",
				action_id: "objectSubtypeCode",
				label: filters.objectTypeCode
					? "Subjenis Modul"
					: "Subjenis Modul (pilih modul agar lebih spesifik)",
				options: subtypeOptions,
				value: filters.objectSubtypeCode ?? "",
			},
			{
				type: "select",
				action_id: "statusData",
				label: "Status Data",
				options: [
					{ label: "Semua", value: "" },
					{ label: "Draft", value: "draft" },
					{ label: "Submitted", value: "submitted" },
					{ label: "Active", value: "active" },
					{ label: "Archived", value: "archived" },
				],
				value: filters.statusData ?? "",
			},
			{
				type: "select",
				action_id: "statusVerification",
				label: "Status Verifikasi",
				options: [
					{ label: "Semua", value: "" },
					{ label: "Draft", value: "draft" },
					{ label: "Submitted", value: "submitted_village" },
					{ label: "Verified", value: "verified" },
					{ label: "Need Revision", value: "need_revision" },
					{ label: "Rejected", value: "rejected" },
				],
				value: filters.statusVerification ?? "",
			},
			{
				type: "select",
				action_id: "duplicateStatus",
				label: "Status Duplikat",
				options: [
					{ label: "Semua", value: "" },
					{ label: "Kandidat Duplikat", value: "candidate" },
					{ label: "Tidak Ada", value: "none" },
					{ label: "Terkonfirmasi", value: "confirmed" },
					{ label: "Resolved", value: "resolved" },
				],
				value: filters.duplicateStatus ?? "",
			},
			{
				type: "select",
				action_id: "sensitivityLevel",
				label: "Sensitivitas",
				options: [
					{ label: "Semua", value: "" },
					{ label: "Public Safe", value: "public_safe" },
					{ label: "Internal", value: "internal" },
					{ label: "Restricted", value: "restricted" },
					{ label: "Highly Restricted", value: "highly_restricted" },
				],
			},
		],
		submit: { label: "Filter", action_id: "entities:filter" },
	});

	blocks.push({ type: "divider" });

	if (result.items.length === 0) {
		blocks.push({
			type: "empty",
			title: "Tidak Ada Entitas",
			description: "Belum ada entitas yang terdaftar",
			actions: [
				{
					type: "button",
					action_id: "navigate:entities/new",
					label: "Tambah Entitas Baru",
					style: "primary",
				},
			],
		});
	} else {
		blocks.push({
			type: "table",
			columns: [
				{ key: "entityId", label: "Entity ID", format: "text" },
				{ key: "id", label: "ID SIKESRA", format: "code" },
				{ key: "type", label: "Tipe", format: "badge" },
				{ key: "displayName", label: "Nama", format: "text" },
				{ key: "statusData", label: "Status Data", format: "badge" },
				{ key: "statusVerification", label: "Verifikasi", format: "badge" },
				{ key: "sensitivity", label: "Sensitivitas", format: "badge" },
				{ key: "completeness", label: "Kelengkapan", format: "number" },
				{ key: "actions", label: "Aksi", format: "text" },
			],
			rows: result.items.map((row) => ({
				entityId: row.id,
				id: row.sikesraId20 ?? row.id.slice(0, 12),
				type: `${row.objectTypeName} / ${row.objectSubtypeName}`,
				displayName: row.displayName,
				statusData: row.statusData,
				statusVerification: row.statusVerification,
				sensitivity: row.sensitivityLevel,
				completeness: row.completenessPercent,
				actions: "Lihat",
			})),
			page_action_id: "entities:view",
			empty_text: "Tidak ada entitas",
		});
	}

	return { blocks };
}

async function handleEntityAction(
	db: unknown,
	ctx: SikesraRequestContext,
	action: { type: string; values?: Record<string, unknown> },
): Promise<BlockResponse> {
	const actionId = typeof action.values?.action_id === "string" ? action.values.action_id : "";
	if (actionId === "entities:filter") {
		return buildEntityList(db, ctx, parseEntityFilters(action.values));
	}
	if (actionId === "entities:start_create" || actionId === "navigate:entities/new") {
		return buildEntityCreateForm(db, ctx);
	}
	if (actionId === "entities:create_draft") {
		const input = normalizeDraftCreateForm(action.values);
		if (
			(input.selectedSubtypeModuleCode && input.selectedSubtypeModuleCode !== input.objectTypeCode) ||
			(input.objectTypeCode && input.objectSubtypeCode && !hasModuleSubtype(input.objectTypeCode, input.objectSubtypeCode))
		) {
			const createForm = await buildEntityCreateForm(db, ctx);
			return {
				...createForm,
				blocks: [
					{
						type: "banner",
						variant: "error",
						title: "Subjenis Tidak Sesuai",
						description: "Subjenis data tidak cocok dengan modul yang dipilih. Pilih subjenis yang sesuai dengan modul data SIKESRA.",
					},
					...createForm.blocks,
				],
				toast: { message: "Subjenis data tidak cocok dengan modul yang dipilih", type: "error" },
			};
		}
		const created = await createDraft(db, ctx, input);
		const detail = await buildEntityDetail(db, ctx, created.entityId);
		return {
			...detail,
			toast: { message: "Draft entitas berhasil dibuat", type: "success" },
		};
	}
	if (actionId === "entities:view") {
		const entityId = getActionEntityId(action.values);
		if (entityId) {
			return buildEntityDetail(db, ctx, entityId);
		}
	}
	if (actionId === "entities:back_to_list") {
		return buildEntityList(db, ctx);
	}
	if (actionId === "entities:edit_identity") {
		const entityId = getActionEntityId(action.values);
		if (entityId) return buildEntityEditForm(db, ctx, entityId, "identity");
	}
	if (actionId === "entities:edit_location") {
		const entityId = getActionEntityId(action.values);
		if (entityId) return buildEntityEditForm(db, ctx, entityId, "location");
	}
	if (actionId === "entities:edit_details") {
		const entityId = getActionEntityId(action.values);
		if (entityId) return buildEntityEditForm(db, ctx, entityId, "details");
	}
	if (actionId === "entities:open_documents") {
		const entityId = getActionEntityId(action.values);
		if (entityId) return buildEntityDocumentStep(db, ctx, entityId);
	}
	if (actionId === "entities:open_review") {
		const entityId = getActionEntityId(action.values);
		if (entityId) return buildEntityReviewSummary(db, ctx, entityId);
	}
	if (actionId === "entities:document_register") {
		try {
			const input = normalizeDocumentRegisterForm(action.values);
			const registered = await registerEntityDocument(db, ctx, input);
			if (registered.mode === "prepared") {
				return buildPreparedDocumentUploadStep(db, ctx, input.entityId, {
					entityId: input.entityId,
					fileName: input.fileName,
					documentType: input.documentType,
					classification: input.classification,
					mimeType: input.mimeType,
					fileObjectId: registered.upload.fileObjectId,
				});
			}
			const step = await buildEntityDocumentStep(db, ctx, input.entityId);
			return { ...step, toast: { message: "Dokumen berhasil dicatat", type: "success" } };
		} catch (error) {
			const entityId = typeof action.values?.entityId === "string" ? action.values.entityId : "";
			const step = entityId ? await buildEntityDocumentStep(db, ctx, entityId) : { blocks: [] };
			const rawMessage = error instanceof Error ? error.message : "Dokumen tidak valid";
			const message = rawMessage === "DOCUMENT_REGISTER_INPUT_REQUIRED"
				? "Nama file, jenis dokumen, dan entity ID wajib diisi."
				: rawMessage.replace(/^DOCUMENT_REGISTER_INVALID:\s*/, "");
			return {
				...step,
				blocks: [
					{
						type: "banner",
						variant: "error",
						title: "Dokumen Tidak Valid",
						description: message,
					},
					...step.blocks,
				],
				toast: { message: message || "Dokumen tidak valid", type: "error" },
			};
		}
	}
	if (actionId === "entities:update_section") {
		const input = normalizeDraftUpdateForm(action.values);
		await updateDraft(db, ctx, input);
		const detail = await buildEntityDetail(db, ctx, input.entityId);
		return { ...detail, toast: { message: "Draft berhasil diperbarui", type: "success" } };
	}
	if (actionId === "entities:validate") {
		const entityId = getActionEntityId(action.values);
		if (entityId) return buildEntityValidationView(db, ctx, entityId);
	}
	if (actionId === "entities:generate_code") {
		const entityId = getActionEntityId(action.values);
		if (entityId) {
			await generateSikesraId20(db, ctx, entityId);
			const detail = await buildEntityDetail(db, ctx, entityId);
			return { ...detail, toast: { message: "ID SIKESRA berhasil dibuat", type: "success" } };
		}
	}
	if (actionId === "entities:open_submit") {
		const entityId = getActionEntityId(action.values);
		if (entityId) return buildEntitySubmitForm(db, ctx, entityId);
	}
	if (actionId === "entities:submit_verification") {
		const entityId = getActionEntityId(action.values);
		if (entityId) {
			const readiness = await getEntitySubmitReadiness(db, ctx, entityId);
			if (!readiness.canSubmit) {
				await auditBlockedSubmitAttempt(db, ctx, entityId, readiness.reasonMessage ?? "Entitas belum siap diajukan", {
					invalidSections: readiness.invalidSections,
					highRiskDuplicateCount: readiness.highRiskDuplicateCount,
					documentCount: readiness.documentCount,
					canSubmit: readiness.canSubmit,
					recommendedAction: readiness.recommendedAction,
					reasonMessage: readiness.reasonMessage,
				});
				const submitView = await buildEntitySubmitForm(db, ctx, entityId);
				return {
					...submitView,
					toast: {
						message: readiness.reasonMessage ?? "Entitas belum siap diajukan",
						type: "error",
					},
				};
			}
			await submitForVerification(db, ctx, {
				entityId,
				note:
					typeof action.values?.note === "string" && action.values.note.trim()
						? action.values.note
						: undefined,
			});
			const detail = await buildEntityDetail(db, ctx, entityId);
			return { ...detail, toast: { message: "Entitas diajukan untuk verifikasi", type: "success" } };
		}
	}
	if (actionId === "entities:open_archive") {
		const entityId = getActionEntityId(action.values);
		if (entityId) return buildEntityLifecycleForm(db, ctx, entityId, "archive");
	}
	if (actionId === "entities:archive_submit") {
		const input = normalizeEntityLifecycleForm(action.values);
		await archiveEntity(db, ctx, input);
		const detail = await buildEntityDetail(db, ctx, input.entityId);
		return { ...detail, toast: { message: "Entitas berhasil diarsipkan", type: "success" } };
	}
	if (actionId === "entities:open_restore") {
		const entityId = getActionEntityId(action.values);
		if (entityId) return buildEntityLifecycleForm(db, ctx, entityId, "restore");
	}
	if (actionId === "entities:restore_submit") {
		const input = normalizeEntityLifecycleForm(action.values);
		await restoreEntity(db, ctx, input);
		const detail = await buildEntityDetail(db, ctx, input.entityId);
		return { ...detail, toast: { message: "Entitas berhasil dipulihkan", type: "success" } };
	}
	return { blocks: [] };
}

async function buildEntityDetail(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<BlockResponse> {
	const detail = await getEntityDetail(db, ctx, entityId);
	const duplicatePreview = ctx.permissions.includes("awcms:sikesra:duplicate:read")
		? await getEntityDuplicatePreview(db, ctx, entityId)
		: [];
	if (!detail?.entity) {
		return {
			blocks: [
				{
					type: "banner",
					variant: "error",
					title: "Tidak Ditemukan",
					description: "Entitas tidak ditemukan",
				},
			],
		};
	}

	const entity = detail.entity;
	const statusLine = `${entity.statusData} | ${entity.statusVerification}`;
	const moduleDetailFields = detail.details
		? Object.entries(detail.details)
				.filter(([key]) => !["id", "entity_id", "created_at", "updated_at"].includes(key))
				.slice(0, 8)
				.map(([key, value]) => ({
					label: getReadableFieldLabel(entity.objectTypeCode, key),
					value: stringifyBlockValue(value),
				}))
		: [];

	const actionButtons: Block[] = [
		{
			type: "actions",
			elements: [
				{
					type: "button",
					action_id: "entities:back_to_list",
					entityId: entity.id,
					label: "Kembali ke Daftar",
					style: "secondary",
				},
				{
					type: "button",
					action_id: "entities:edit_identity",
					entityId: entity.id,
					label: "Edit Identitas",
				},
				{
					type: "button",
					action_id: "entities:edit_location",
					entityId: entity.id,
					label: "Edit Wilayah",
				},
				{
					type: "button",
					action_id: "entities:edit_details",
					entityId: entity.id,
					label: "Edit Detail Modul",
				},
			],
		},
		{
			type: "actions",
			elements: [
				{
					type: "button",
					action_id: "entities:open_documents",
					entityId: entity.id,
					label: "Dokumen",
				},
				{
					type: "button",
					action_id: "entities:validate",
					entityId: entity.id,
					label: "Validasi",
				},
				{
					type: "button",
					action_id: "entities:generate_code",
					entityId: entity.id,
					label: "Generate ID",
					style: detail.access.canGenerateCode ? "primary" : "secondary",
				},
				{
					type: "button",
					action_id: "entities:open_submit",
					entityId: entity.id,
					label: "Ajukan Verifikasi",
					style: detail.access.canSubmit ? "primary" : "secondary",
				},
				entity.statusData === "archived"
					? {
							type: "button",
							action_id: "entities:open_restore",
							entityId: entity.id,
							label: "Pulihkan",
						}
					: {
							type: "button",
							action_id: "entities:open_archive",
							entityId: entity.id,
							label: "Arsipkan",
						},
			],
		},
	];

	return {
		blocks: [
			{ type: "header", text: entity.displayName },
			{ type: "context", text: `ID: ${entity.sikesraId20 ?? entity.id}` },
			{ type: "context", text: `Status: ${statusLine}` },
			...buildEntityWizardSteps(entity.id, 6),
			{ type: "divider" },
			{
				type: "fields",
				fields: [
					{ label: "Tipe Objek", value: entity.objectTypeName },
					{ label: "Subtipe", value: entity.objectSubtypeName },
					{ label: "Status Data", value: entity.statusData },
					{ label: "Status Verifikasi", value: entity.statusVerification },
					{ label: "Sensitivitas", value: entity.sensitivityLevel },
					{ label: "Kelengkapan", value: `${entity.completenessPercent}%` },
					{ label: "Sumber Input", value: detail.summary.sourceInput as string },
					{ label: "Dibuat", value: detail.summary.createdAt as string },
					{ label: "Diperbarui", value: detail.summary.updatedAt as string },
				],
			},
			...(moduleDetailFields.length > 0
				? ([
					{ type: "divider" },
					{ type: "header", text: "Detail Modul" },
					{ type: "fields", fields: moduleDetailFields },
				] as Block[])
				: []),
			...(duplicatePreview.length > 0
				? ([
					{ type: "divider" },
					{
						type: "banner",
						variant: duplicatePreview.some((item) => ["high", "blocking"].includes(item.riskLevel))
							? "alert"
							: "info",
						title: "Sinyal Duplikat Terdeteksi",
						description: `${duplicatePreview.length} kandidat duplikat perlu ditinjau`,
					},
					{
						type: "table",
						columns: [
							{ key: "risk", label: "Risk", format: "badge" },
							{ key: "name", label: "Entitas Pembanding", format: "text" },
							{ key: "score", label: "Score", format: "number" },
							{ key: "signals", label: "Signals", format: "text" },
						],
						rows: duplicatePreview.map((item) => ({
							risk: item.riskLevel,
							name: `${item.otherDisplayName} (${item.otherEntityId})`,
							score: item.matchScore ?? 0,
							signals: item.matchSignals.join(", ") || item.detectionSource,
						})),
						empty_text: "Tidak ada kandidat duplikat",
					},
				] as Block[])
				: []),
			{ type: "divider" },
			...actionButtons,
		],
	};
}

function buildEntityWizardSteps(entityId?: string, activeStep = 0): Block[] {
	const steps = [
		{ step: 1, label: "1. Jenis Data", actionId: "entities:edit_identity" },
		{ step: 2, label: "2. Wilayah", actionId: "entities:edit_location" },
		{ step: 3, label: "3. Detail Modul", actionId: "entities:edit_details" },
		{ step: 4, label: "4. Dokumen", actionId: "entities:open_documents" },
		{ step: 5, label: "5. Validasi", actionId: "entities:validate" },
		{ step: 6, label: "6. Review", actionId: "entities:open_review" },
		{ step: 7, label: "7. Submit", actionId: "entities:open_submit" },
	];

	return [
		{ type: "header", text: "Progress Wizard" },
		{
			type: "actions",
			elements: steps.map((step) => ({
				type: "button",
				action_id: step.actionId,
				entityId,
				label: activeStep === step.step ? `▶ ${step.label}` : step.label,
				style: "secondary",
			})),
		},
	];
}

async function buildEntityCreateForm(
	db: unknown,
	ctx: SikesraRequestContext,
): Promise<BlockResponse> {
	const villages = await listOfficialRegions(db, ctx, { level: "village" });
	const moduleConfigs = listModuleUiConfigs();
	return {
		blocks: [
			{ type: "header", text: "Wizard Buat Entitas" },
			{ type: "context", text: "Mulai dari memilih modul data, lalu isi identitas dasar dan wilayah entitas." },
			...buildEntityWizardSteps(undefined, 1),
			{ type: "divider" },
			{ type: "header", text: "Pilihan 8 Modul Data" },
			{
				type: "table",
				columns: [
					{ key: "module", label: "Modul", format: "text" },
					{ key: "description", label: "Deskripsi Singkat", format: "text" },
					{ key: "entityKind", label: "Jenis Entitas", format: "badge" },
					{ key: "subtypes", label: "Subjenis", format: "text" },
				],
				rows: moduleConfigs.map((moduleConfig) => ({
					module: moduleConfig.label,
					description: moduleConfig.description,
					entityKind: getEntityKindLabel(moduleConfig.entityKind),
					subtypes: moduleConfig.subtypes.map((item) => item.label).join(", "),
				})),
				empty_text: "Tidak ada modul data",
			},
			{ type: "divider" },
			{
				type: "form",
				fields: [
					{
						type: "select",
						action_id: "objectTypeCode",
						label: "Modul Data SIKESRA",
						options: moduleConfigs.map((item) => ({ label: item.label, value: item.objectTypeCode })),
					},
					{
						type: "select",
						action_id: "objectSubtypeCode",
						label: "Subjenis Data",
						options: getModuleSubtypeOptions(),
						value: "",
					},
					{
						type: "text_input",
						action_id: "displayName",
						label: "Nama Tampilan",
						placeholder: "Nama entitas, lembaga, orang, atau lokasi sesuai modul",
					},
					{
						type: "select",
						action_id: "officialVillageCode",
						label: "Desa/Kelurahan",
						options: villages.map((item) => ({ label: item.name, value: item.code })),
					},
					{ type: "text_input", action_id: "localRegionId", label: "Wilayah Lokal (Opsional)", placeholder: "Isi bila wilayah lokal sudah tersedia" },
					{ type: "text_input", action_id: "addressText", label: "Alamat", multiline: true },
				],
				submit: { label: "Buat Draft", action_id: "entities:create_draft" },
			},
		],
	};
}

async function buildEntityEditForm(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
	section: DraftUpdateInput["section"],
): Promise<BlockResponse> {
	const detail = await getEntityDetail(db, ctx, entityId);
	const villages = section === "location" ? await listOfficialRegions(db, ctx, { level: "village" }) : [];
	const detailModule = getDetailModuleConfig(detail.entity.objectTypeCode);
	const subtypeOptions = getModuleSubtypeOptions(detail.entity.objectTypeCode);
	const fields =
		section === "identity"
			? [
					{ type: "text_input", action_id: "display_name", label: "Nama Tampilan", value: detail.entity.displayName },
					{
						type: "select",
						action_id: "object_type_code",
						label: "Modul Data",
						value: detail.entity.objectTypeCode,
						options: listModuleUiConfigs().map((item) => ({ label: item.label, value: item.objectTypeCode })),
					},
					{
						type: "select",
						action_id: "object_subtype_code",
						label: "Subjenis Data",
						value: detail.entity.objectSubtypeCode,
						options: subtypeOptions,
					},
				]
			: section === "location"
				? [
						{
							type: "select",
							action_id: "official_village_code",
							label: "Desa/Kelurahan",
							options: villages.map((item) => ({ label: item.name, value: item.code })),
						},
						{ type: "text_input", action_id: "local_region_id", label: "Local Region ID", value: detail.entity.localRegion?.id ?? "" },
						{ type: "text_input", action_id: "address_text", label: "Alamat", multiline: true, value: (detail.summary.addressText as string | null) ?? "" },
					]
				: buildModuleDetailFields(detail.entity.objectTypeCode, detail.details, detailModule?.fields ?? []);

	return {
		blocks: [
			{ type: "header", text: `Edit ${section}` },
			{ type: "context", text: `Entity: ${detail.entity.displayName}` },
			...buildEntityWizardSteps(entityId, section === "identity" ? 1 : section === "location" ? 2 : 3),
			{ type: "form",
				fields: [
					{ type: "text_input", action_id: "entityId", label: "Entity ID", value: entityId },
					{ type: "text_input", action_id: "section", label: "Section", value: section },
					...fields,
				],
				submit: { label: "Simpan Perubahan", action_id: "entities:update_section" },
			},
		],
	};
}

async function buildEntityValidationView(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<BlockResponse> {
	const result = await validateEntity(db, ctx, entityId);
	const detail = await getEntityDetail(db, ctx, entityId);
	const duplicatePreview = ctx.permissions.includes("awcms:sikesra:duplicate:read")
		? await getEntityDuplicatePreview(db, ctx, entityId)
		: [];
	return {
		blocks: [
			{ type: "header", text: "Hasil Validasi" },
			{ type: "context", text: `Kelengkapan keseluruhan: ${result.overallPercent}%` },
			...buildEntityWizardSteps(entityId, 5),
			...(duplicatePreview.length > 0
				? ([
					{
						type: "banner",
						variant: duplicatePreview.some((item) => ["high", "blocking"].includes(item.riskLevel))
							? "alert"
							: "info",
						title: "Peringatan Duplikat",
						description: duplicatePreview
							.map((item) => `${item.otherDisplayName} [${item.riskLevel}]`)
							.join("; "),
					},
				] as Block[])
				: []),
			{ type: "table",
				columns: [
					{ key: "section", label: "Tahap", format: "text" },
					{ key: "valid", label: "Valid", format: "badge" },
					{ key: "errors", label: "Yang Perlu Dilengkapi", format: "text" },
				],
				rows: result.sections.map((section) => ({
					section: getReadableSectionLabel(section.sectionKey),
					valid: section.isValid ? "yes" : "no",
					errors:
						section.errors
							.map((error) => `${getReadableFieldLabel(detail.entity.objectTypeCode, error.field)}: ${error.message}`)
							.join("; ") || "-",
				})),
				empty_text: "Tidak ada data validasi",
			},
			{ type: "actions", elements: [{ type: "button", action_id: "entities:view", entityId, label: "Kembali ke Detail" }] },
		],
	};
}

async function buildEntityDocumentStep(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<BlockResponse> {
	const detail = await getEntityDetail(db, ctx, entityId);
	const runtime = buildAdminDocumentRuntime(db);
	const documents = await getEntityDocuments(runtime, entityId, ctx);

	return {
		blocks: [
			{ type: "header", text: "Dokumen Pendukung" },
			{ type: "context", text: `Entity: ${detail.entity.displayName}` },
			{ type: "context", text: `${documents.length} dokumen tercatat` },
			...buildEntityWizardSteps(entityId, 4),
			{ type: "divider" },
			{
				type: "banner",
				variant: "info",
				title: "Workflow Upload Dokumen",
				description: "MIME type diturunkan dari nama file dan ukuran dihitung dari payload file yang diberikan di shell ini. Jika shell belum bisa unggah file langsung, gunakan handoff API upload yang aman tanpa mengisi metadata teknis secara manual.",
			},
			{
				type: "form",
				fields: [
					{ type: "text_input", action_id: "entityId", label: "Entity ID", value: entityId },
					{ type: "text_input", action_id: "fileName", label: "Nama File", placeholder: "ktp.pdf" },
					{
						type: "select",
						action_id: "documentType",
						label: "Jenis Dokumen",
						options: [
							{ label: "KTP", value: "ktp" },
							{ label: "KK", value: "kk" },
							{ label: "Surat Keterangan", value: "surat_keterangan" },
							{ label: "Foto Lokasi", value: "foto_lokasi" },
							{ label: "Lainnya", value: "lainnya" },
						],
					},
					{
						type: "select",
						action_id: "classification",
						label: "Klasifikasi",
						options: [
							{ label: "Internal", value: "internal" },
							{ label: "Restricted", value: "restricted" },
							{ label: "Highly Restricted", value: "highly_restricted" },
						],
					},
					{
						type: "text_input",
						action_id: "contentBase64",
						label: "Konten File Base64 (opsional untuk shell ini)",
						multiline: true,
						placeholder: "Tempel base64 file untuk simulasi/testing, atau kosongkan untuk menyiapkan upload URL.",
					},
					{ type: "text_input", action_id: "checksumSha256", label: "Checksum SHA256", placeholder: "opsional" },
				],
				submit: { label: "Siapkan / Catat Dokumen", action_id: "entities:document_register" },
			},
			{ type: "divider" },
			...(documents.length === 0
				? ([
					{
						type: "empty",
						title: "Belum Ada Dokumen",
						description: "Tambahkan dokumen pendukung untuk melengkapi workflow entitas.",
					},
				] as Block[])
				: ([
					{
						type: "table",
						columns: [
							{ key: "documentType", label: "Jenis", format: "text" },
							{ key: "classification", label: "Klasifikasi", format: "badge" },
							{ key: "filename", label: "File", format: "text" },
							{ key: "verified", label: "Verifikasi", format: "badge" },
							{ key: "mime", label: "MIME", format: "text" },
							{ key: "size", label: "Size", format: "number" },
						],
						rows: documents.map((item) => ({
							documentType: item.documentType,
							classification: item.classification,
							filename: item.originalFilename ?? item.id,
							verified: item.isVerified ? "verified" : "uploaded",
							mime: item.mimeType ?? "-",
							size: item.sizeBytes ?? 0,
						})),
						empty_text: "Tidak ada dokumen",
					},
				] as Block[])),
			{ type: "divider" },
			{
				type: "actions",
				elements: [
					{ type: "button", action_id: "entities:view", entityId, label: "Kembali ke Detail", style: "secondary" },
				],
			},
		],
	};
}

async function buildEntityReviewSummary(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<BlockResponse> {
	const [detail, validation, duplicatePreview] = await Promise.all([
		getEntityDetail(db, ctx, entityId),
		validateEntity(db, ctx, entityId),
		ctx.permissions.includes("awcms:sikesra:duplicate:read")
			? getEntityDuplicatePreview(db, ctx, entityId)
			: Promise.resolve([]),
	]);
	const runtime = buildAdminDocumentRuntime(db);
	const documents = await getEntityDocuments(runtime, entityId, ctx);
	const readiness = await getEntitySubmitReadiness(db, ctx, entityId, validation, documents.length, duplicatePreview);

	return {
		blocks: [
			{ type: "header", text: "Review dan Submit" },
			{ type: "context", text: `Entity: ${detail.entity.displayName}` },
			...buildEntityWizardSteps(entityId, 6),
			{ type: "divider" },
			{
				type: "stats",
				items: [
					{ label: "Kelengkapan", value: `${validation.overallPercent}%` },
					{ label: "Dokumen", value: documents.length },
					{ label: "Duplikat", value: Math.max(duplicatePreview.length, readiness.highRiskDuplicateCount) },
					{ label: "Status", value: detail.entity.statusVerification },
				],
			},
			{ type: "divider" },
			{
				type: "fields",
				fields: [
					{ label: "Nama", value: detail.entity.displayName },
					{ label: "Jenis/Subjenis", value: `${detail.entity.objectTypeName} / ${detail.entity.objectSubtypeName}` },
					{ label: "Jenis Entitas", value: getEntityKindLabel(detail.entity.entityKind) },
					{ label: "Status Data", value: detail.entity.statusData },
					{ label: "Status Verifikasi", value: detail.entity.statusVerification },
					{ label: "Alamat", value: stringifyBlockValue(detail.summary.addressText) },
				],
			},
			{
				type: "table",
				columns: [
					{ key: "section", label: "Tahap", format: "text" },
					{ key: "valid", label: "Valid", format: "badge" },
					{ key: "issueCount", label: "Issues", format: "number" },
				],
				rows: validation.sections.map((section) => ({
					section: getReadableSectionLabel(section.sectionKey),
					valid: section.isValid ? "yes" : "no",
					issueCount: section.errors.length,
				})),
				empty_text: "Tidak ada hasil validasi",
			},
			...(duplicatePreview.length > 0
				? ([
					{
						type: "banner",
						variant: "alert",
						title: "Perlu Review Duplikat",
						description: `${duplicatePreview.length} kandidat duplikat masih perlu perhatian sebelum submit.`,
					},
				] as Block[])
				: []),
			{
				type: "banner",
				variant: readiness.canSubmit ? "success" : "info",
				title: readiness.canSubmit ? "Siap Diajukan" : "Tindakan Berikutnya",
				description: readiness.recommendedAction,
			},
			...(documents.length === 0
				? ([
					{
						type: "banner",
						variant: "info",
						title: "Dokumen Belum Ada",
						description: "Tambahkan dokumen pendukung sebelum final submit bila diperlukan SOP.",
					},
				] as Block[])
				: []),
			{ type: "divider" },
			{
				type: "actions",
				elements: [
					{ type: "button", action_id: "entities:edit_identity", entityId, label: "Perbaiki Identitas" },
					{ type: "button", action_id: "entities:open_documents", entityId, label: "Periksa Dokumen" },
					{ type: "button", action_id: "entities:open_submit", entityId, label: "Lanjut Submit", style: "primary" },
				],
			},
		],
	};
}

async function buildEntitySubmitForm(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<BlockResponse> {
	const detail = await getEntityDetail(db, ctx, entityId);
	const readiness = await getEntitySubmitReadiness(db, ctx, entityId);
	if (!readiness.canSubmit) {
		return {
			blocks: [
				{ type: "header", text: "Ajukan Verifikasi" },
				{ type: "context", text: detail.entity.displayName },
				...buildEntityWizardSteps(entityId, 7),
				{
					type: "banner",
					variant: "error",
					title: "Belum Bisa Diajukan",
					description: readiness.reasonMessage ?? readiness.recommendedAction,
				},
				{
					type: "actions",
					elements: [
						{ type: "button", action_id: "entities:open_review", entityId, label: "Kembali ke Review", style: "secondary" },
						{ type: "button", action_id: readiness.highRiskDuplicateCount > 0 ? "entities:validate" : "entities:edit_details", entityId, label: readiness.highRiskDuplicateCount > 0 ? "Tinjau Validasi & Duplikat" : "Lengkapi Detail Modul", style: "primary" },
					],
				},
			],
		};
	}
	return {
		blocks: [
			{ type: "header", text: "Ajukan Verifikasi" },
			{ type: "context", text: detail.entity.displayName },
			...buildEntityWizardSteps(entityId, 7),
			{ type: "form",
				fields: [
					{ type: "text_input", action_id: "entityId", label: "Entity ID", value: entityId },
					{ type: "text_input", action_id: "note", label: "Catatan", multiline: true, placeholder: "Opsional" },
				],
				submit: { label: "Ajukan", action_id: "entities:submit_verification" },
			},
		],
	};
}

async function getEntitySubmitReadiness(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
	validationResult?: Awaited<ReturnType<typeof validateEntity>>,
	documentCount?: number,
	duplicatePreview?: Awaited<ReturnType<typeof getEntityDuplicatePreview>>,
): Promise<EntitySubmitReadiness> {
	const validation = validationResult ?? (await validateEntity(db, ctx, entityId));
	const invalidSections = validation.sections.filter((section) => !section.isValid).map((section) => section.sectionKey);
	const highRiskDuplicateCount =
		duplicatePreview?.filter((item) => ["high", "blocking"].includes(item.riskLevel)).length ??
		(await countHighRiskDuplicateCandidates(db, ctx, entityId));
	const resolvedDocumentCount =
		documentCount ?? (await getEntityDocuments(buildAdminDocumentRuntime(db), entityId, ctx)).length;

	if (invalidSections.length > 0) {
		return {
			invalidSections,
			highRiskDuplicateCount,
			documentCount: resolvedDocumentCount,
			canSubmit: false,
			reasonMessage: "Masih ada field wajib yang belum lengkap.",
			recommendedAction: `Lengkapi tahap ${invalidSections.map((section) => getReadableSectionLabel(section)).join(", ")} sebelum mengajukan verifikasi.`,
		};
	}

	if (highRiskDuplicateCount > 0) {
		return {
			invalidSections,
			highRiskDuplicateCount,
			documentCount: resolvedDocumentCount,
			canSubmit: false,
			reasonMessage: "Masih ada kandidat duplikat berisiko tinggi yang harus ditinjau.",
			recommendedAction: "Tinjau kandidat duplikat berisiko tinggi pada detail atau validasi sebelum submit.",
		};
	}

	if (resolvedDocumentCount === 0) {
		return {
			invalidSections,
			highRiskDuplicateCount,
			documentCount: resolvedDocumentCount,
			canSubmit: true,
			recommendedAction: "Dokumen pendukung belum ada. Tambahkan dokumen bila diwajibkan SOP, lalu ajukan verifikasi.",
		};
	}

	return {
		invalidSections,
		highRiskDuplicateCount,
		documentCount: resolvedDocumentCount,
		canSubmit: true,
		recommendedAction: "Semua syarat minimum sudah terpenuhi. Lanjutkan submit untuk verifikasi.",
	};
}

async function countHighRiskDuplicateCandidates(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<number> {
	const result = await sql<{ total: number }>`
		SELECT COUNT(*) AS total
		FROM awcms_sikesra_duplicate_candidates candidate
		JOIN awcms_sikesra_entities other_entity
			ON other_entity.tenant_id = candidate.tenant_id
			AND other_entity.site_id = candidate.site_id
			AND (
				(candidate.entity_id_a = ${entityId} AND other_entity.id = candidate.entity_id_b)
				OR (candidate.entity_id_b = ${entityId} AND other_entity.id = candidate.entity_id_a)
			)
		WHERE candidate.tenant_id = ${ctx.tenantId}
			AND candidate.site_id = ${ctx.siteId}
			AND candidate.deleted_at IS NULL
			AND other_entity.deleted_at IS NULL
			AND candidate.risk_level IN ('high', 'blocking')
			AND (candidate.entity_id_a = ${entityId} OR candidate.entity_id_b = ${entityId})
	`.execute(db as never);

	return result.rows[0]?.total ?? 0;
}

async function auditBlockedSubmitAttempt(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
	reason: string,
	metadata: Record<string, unknown>,
): Promise<void> {
	try {
		await sql`
			INSERT INTO awcms_sikesra_audit_logs (
				id, tenant_id, site_id, actor_id, actor_role, action,
				resource_type, resource_id, request_id, success, reason,
				before_json, after_json, ip_address, user_agent, created_at
			) VALUES (
				${`audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
				${ctx.tenantId}, ${ctx.siteId}, ${ctx.userId},
				${ctx.roles[0] ?? "unknown"}, 'security.access_denied',
				'entity', ${entityId}, ${ctx.requestId}, 0, ${reason},
				${null}, ${JSON.stringify(metadata)},
				${ctx.ipAddress ?? null}, ${ctx.userAgent ?? null},
				datetime('now')
			)
		`.execute(db as never);
	} catch {
		// Audit write failures should not block the admin response
	}
}

async function buildEntityLifecycleForm(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
	mode: "archive" | "restore",
): Promise<BlockResponse> {
	const detail = await getEntityDetail(db, ctx, entityId);
	return {
		blocks: [
			{ type: "header", text: mode === "archive" ? "Arsipkan Entitas" : "Pulihkan Entitas" },
			{ type: "context", text: detail.entity.displayName },
			...buildEntityWizardSteps(entityId, 7),
			{ type: "form",
				fields: [
					{ type: "text_input", action_id: "entityId", label: "Entity ID", value: entityId },
					{ type: "text_input", action_id: "reason", label: "Alasan", multiline: true },
					{ type: "text_input", action_id: "confirmed", label: "Ketik true untuk konfirmasi", value: "false" },
				],
				submit: {
					label: mode === "archive" ? "Arsipkan" : "Pulihkan",
					action_id: mode === "archive" ? "entities:archive_submit" : "entities:restore_submit",
				},
			},
		],
	};
}

function parseEntityFilters(values: Record<string, unknown> | undefined): EntityListFilters {
	return {
		keyword: typeof values?.keyword === "string" && values.keyword ? values.keyword : undefined,
		objectTypeCode:
			typeof values?.objectTypeCode === "string" && values.objectTypeCode
				? values.objectTypeCode
				: undefined,
		objectSubtypeCode:
			typeof values?.objectSubtypeCode === "string" && values.objectSubtypeCode
				? values.objectSubtypeCode
				: undefined,
		statusVerification:
			typeof values?.statusVerification === "string" && values.statusVerification
				? values.statusVerification
				: undefined,
		statusData:
			typeof values?.statusData === "string" && values.statusData ? values.statusData : undefined,
		duplicateStatus:
			typeof values?.duplicateStatus === "string" && values.duplicateStatus
				? values.duplicateStatus
				: undefined,
		sensitivityLevel:
			typeof values?.sensitivityLevel === "string" && values.sensitivityLevel
				? values.sensitivityLevel
				: undefined,
	};
}

function getActionEntityId(values: Record<string, unknown> | undefined) {
	if (typeof values?.entityId === "string" && values.entityId) return values.entityId;
	if (typeof values?.id === "string" && values.id.startsWith("ent_")) return values.id;
	return undefined;
}

function normalizeDraftCreateForm(values: Record<string, unknown> | undefined): DraftCreateInput {
	const rawObjectTypeCode = typeof values?.objectTypeCode === "string" ? values.objectTypeCode : "";
	const rawObjectSubtypeCode = typeof values?.objectSubtypeCode === "string" ? values.objectSubtypeCode : "";
	const selectedSubtypeModuleCode = rawObjectSubtypeCode.includes(":")
		? rawObjectSubtypeCode.split(":")[0] ?? undefined
		: undefined;
	const objectSubtypeCode = rawObjectSubtypeCode.includes(":")
		? rawObjectSubtypeCode.split(":")[1] ?? ""
		: rawObjectSubtypeCode;
	const moduleUi = getModuleUiConfig(rawObjectTypeCode);
	return {
		objectTypeCode: rawObjectTypeCode,
		objectSubtypeCode,
		selectedSubtypeModuleCode,
		entityKind: moduleUi?.entityKind ?? "",
		displayName: typeof values?.displayName === "string" ? values.displayName : "",
		officialVillageCode: typeof values?.officialVillageCode === "string" ? values.officialVillageCode : "",
		localRegionId: typeof values?.localRegionId === "string" && values.localRegionId ? values.localRegionId : undefined,
		addressText: typeof values?.addressText === "string" && values.addressText ? values.addressText : undefined,
	};
}

function normalizeDraftUpdateForm(values: Record<string, unknown> | undefined): DraftUpdateInput {
	const entityId = typeof values?.entityId === "string" ? values.entityId : "";
	const section = typeof values?.section === "string" ? values.section : "identity";
	const patch: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(values ?? {})) {
		if (["action_id", "entityId", "section"].includes(key)) continue;
		patch[key] = value;
	}
	if (section === "identity" && typeof patch.object_type_code === "string") {
		const moduleUi = getModuleUiConfig(patch.object_type_code);
		if (moduleUi) patch.entity_kind = moduleUi.entityKind;
	}
	return { entityId, section, patch };
}

function normalizeEntityLifecycleForm(values: Record<string, unknown> | undefined) {
	return {
		entityId: typeof values?.entityId === "string" ? values.entityId : "",
		reason: typeof values?.reason === "string" ? values.reason : "",
		confirmed: values?.confirmed === true || values?.confirmed === "true",
	};
}

function normalizeDocumentRegisterForm(values: Record<string, unknown> | undefined):
	AdminDocumentRegisterInput {
	const fileName = typeof values?.fileName === "string" ? values.fileName : "";
	const mimeType = guessMimeTypeFromFilename(fileName) ?? "";
	const contentBase64 =
		typeof values?.contentBase64 === "string" && values.contentBase64.trim()
			? values.contentBase64.trim()
			: undefined;
	const classification =
		typeof values?.classification === "string"
			? (values.classification as DocumentClassification)
			: "internal";
	const entityId = typeof values?.entityId === "string" ? values.entityId : "";
	const documentType = typeof values?.documentType === "string" ? values.documentType : "";
	const input = {
		fileName,
		mimeType,
		sizeBytes: contentBase64 ? estimateBase64SizeBytes(contentBase64) : 0,
		classification,
		entityId,
		documentType,
		contentBase64,
		checksumSha256:
			typeof values?.checksumSha256 === "string" && values.checksumSha256
				? values.checksumSha256
				: undefined,
	};
	if (!entityId || !documentType) throw new Error("DOCUMENT_REGISTER_INPUT_REQUIRED");
	if (!mimeType) throw new Error("DOCUMENT_REGISTER_INVALID: Tipe file belum didukung dari nama file yang diberikan.");
	const errors = validateUploadInput(input);
	if (errors.length > 0) throw new Error(`DOCUMENT_REGISTER_INVALID: ${errors.join("; ")}`);
	return input;
}

async function registerEntityDocument(
	db: unknown,
	ctx: SikesraRequestContext,
	input: AdminDocumentRegisterInput,
): Promise<{ mode: "prepared" | "completed"; upload: UploadUrlResponse }> {
	const runtime = buildAdminDocumentRuntime(db);
	if (!input.contentBase64) {
		const upload = await generateUploadUrl(input, ctx, runtime);
		return {
			mode: "prepared",
			upload,
		};
	}
	const upload = await generateUploadUrl(input, ctx, runtime);
	await completeUpload(
		{
			fileObjectId: upload.fileObjectId,
			entityId: input.entityId,
			documentType: input.documentType,
			classification: input.classification,
			contentBase64: input.contentBase64,
			checksumSha256: input.checksumSha256,
			originalFilename: input.fileName,
			mimeType: input.mimeType,
			sizeBytes: input.sizeBytes,
		},
		ctx,
		runtime,
	);
	return { mode: "completed", upload };
}

async function buildPreparedDocumentUploadStep(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
	prepared: {
		entityId: string;
		fileName: string;
		documentType: string;
		classification: string;
		mimeType: string;
		fileObjectId: string;
	},
): Promise<BlockResponse> {
	const step = await buildEntityDocumentStep(db, ctx, entityId);
	return {
		blocks: [
			{
				type: "banner",
				variant: "info",
				title: "Handoff Upload API",
				description: "Shell admin ini belum mengunggah file biner langsung. Gunakan fileObjectId berikut pada klien/API yang mendukung upload, lalu panggil endpoint complete dengan MIME type, sizeBytes, dan payload file sebenarnya untuk menyimpan metadata akhir dan audit.",
			},
			{
				type: "fields",
				fields: [
					{ label: "Entity ID", value: prepared.entityId },
					{ label: "Nama File", value: prepared.fileName },
					{ label: "Jenis Dokumen", value: prepared.documentType },
					{ label: "Klasifikasi", value: prepared.classification },
					{ label: "MIME Type", value: prepared.mimeType },
					{ label: "File Object ID", value: prepared.fileObjectId },
					{ label: "API Complete Upload", value: `${SIKESRA_API_BASE}/v1/documents/complete` },
				],
			},
			...step.blocks,
		],
				toast: { message: "Handoff upload siap digunakan", type: "info" },
			};
}

function buildModuleDetailFields(
	objectTypeCode: string,
	values: Record<string, unknown> | undefined,
	fieldKeys: readonly string[],
): Block[] {
	return fieldKeys.map((fieldKey) => {
		const fieldConfig = getModuleUiFieldConfig(objectTypeCode, fieldKey);
		const description = buildFieldDescription(fieldConfig);

		if (fieldConfig?.input === "select" && fieldConfig.options) {
			return {
				type: "select",
				action_id: fieldKey,
				label: getReadableFieldLabel(objectTypeCode, fieldKey),
				value: stringifyBlockValue(values?.[fieldKey]),
				options: fieldConfig.options,
				description,
			};
		}

		return {
			type: "text_input",
			action_id: fieldKey,
			label: getReadableFieldLabel(objectTypeCode, fieldKey),
			value: stringifyBlockValue(values?.[fieldKey]),
			multiline: fieldConfig?.input === "textarea",
			placeholder: fieldConfig?.placeholder,
			description,
		};
	});
}

function buildFieldDescription(fieldConfig: ReturnType<typeof getModuleUiFieldConfig>) {
	if (!fieldConfig) return undefined;
	const requiredNote = fieldConfig.required ? "Wajib diisi." : undefined;
	return [requiredNote, fieldConfig.helperText].filter(Boolean).join(" ") || undefined;
}

function getReadableSectionLabel(sectionKey: string): string {
	switch (sectionKey) {
		case "identity":
			return "Identitas Dasar";
		case "location":
			return "Wilayah dan Alamat";
		case "details":
			return "Detail Modul";
		default:
			return sectionKey;
	}
}

function getReadableFieldLabel(objectTypeCode: string, fieldKey: string): string {
	if (fieldKey === "display_name") return "Nama Tampilan";
	if (fieldKey === "object_type_code") return "Modul Data";
	if (fieldKey === "object_subtype_code") return "Subjenis Data";
	if (fieldKey === "entity_kind") return "Jenis Entitas";
	if (fieldKey === "official_village_code") return "Desa/Kelurahan";
	if (fieldKey === "local_region_id") return "Wilayah Lokal";
	if (fieldKey === "address_text") return "Alamat";
	return getModuleUiFieldConfig(objectTypeCode, fieldKey)?.label ?? fieldKey;
}

function stringifyBlockValue(value: unknown) {
	if (value === null || value === undefined) return "";
	return typeof value === "string" ? value : JSON.stringify(value);
}

function buildAdminDocumentRuntime(db: unknown): DocumentStorageContext {
	return {
		db,
		storage: {
			documents: {
				put: async () => undefined,
				get: async () => null,
				query: async () => ({ items: [] }),
			},
			auditEntries: {
				put: async () => undefined,
			},
		},
		kv: {
			get: async () => null,
			set: async () => undefined,
		},
	};
}

// ── Verification Queue ───────────────────────────────────────────────────────

async function buildVerificationQueue(
	db: unknown,
	ctx: SikesraRequestContext,
): Promise<BlockResponse> {
	const denied = guardRoute(ctx, "verification:verify");
	if (!denied.allowed) {
		return {
			blocks: [
				{
					type: "banner",
					variant: "error",
					title: "Akses Ditolak",
					description: denied.reasonMessage,
				},
			],
		};
	}

	const result = await sql<{
		id: string;
		sikesra_id_20: string | null;
		display_name: string;
		object_type_code: string;
		status_verification: string;
		submitted_at: string | null;
		completeness_score: number;
	}>`
		SELECT id, sikesra_id_20, display_name, object_type_code, status_verification,
			updated_at as submitted_at, completeness_percent as completeness_score
		FROM awcms_sikesra_entities
		WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)}
			AND deleted_at IS NULL
			AND status_verification LIKE 'submitted%'
		ORDER BY updated_at ASC
		LIMIT 50
	`.execute(db as never);

	const blocks: Block[] = [
		{ type: "header", text: "Antrian Verifikasi" },
		{ type: "context", text: "Entri yang menunggu verifikasi" },
		{ type: "divider" },
	];

	// Queue stats
	const statsResult = await sql<{
		total_submitted: number;
		avg_completeness: number;
	}>`
		SELECT
			COUNT(*) as total_submitted,
			AVG(completeness_percent) as avg_completeness
		FROM awcms_sikesra_entities
		WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)}
			AND deleted_at IS NULL
			AND status_verification LIKE 'submitted%'
	`.execute(db as never);

	const stats = statsResult.rows[0];
	if (stats) {
		blocks.push({
			type: "stats",
			items: [
				{ label: "Menunggu Verifikasi", value: stats.total_submitted },
				{ label: "Rata-rata Kelengkapan", value: `${Math.round(stats.avg_completeness ?? 0)}%` },
			],
		});
		blocks.push({ type: "divider" });
	}

	if (result.rows.length === 0) {
		blocks.push({
			type: "empty",
			title: "Antrian Kosong",
			description: "Tidak ada entri yang menunggu verifikasi",
		});
	} else {
		blocks.push({
			type: "table",
			columns: [
				{ key: "id", label: "ID SIKESRA", format: "code" },
				{ key: "displayName", label: "Nama", format: "text" },
				{ key: "type", label: "Tipe", format: "badge" },
				{ key: "completeness", label: "Kelengkapan", format: "number" },
				{ key: "submittedAt", label: "Diajukan", format: "relative_time" },
				{ key: "actions", label: "Aksi", format: "text" },
			],
			rows: result.rows.map((row) => ({
				id: row.sikesra_id_20 ?? row.id.slice(0, 12),
				displayName: row.display_name,
				type: row.object_type_code,
				completeness: row.completeness_score,
				submittedAt: row.submitted_at ?? "-",
				actions: "Review",
			})),
			page_action_id: "verification:review",
			empty_text: "Tidak ada entri dalam antrian",
		});
	}

	return { blocks };
}

async function handleVerificationAction(
	db: unknown,
	ctx: SikesraRequestContext,
	action: { type: string; values?: Record<string, unknown> },
): Promise<BlockResponse> {
	if (action.values?.action_id === "verification:review") {
		const entityId = action.values?.id as string | undefined;
		if (entityId) {
			return buildVerificationReview(db, ctx, entityId);
		}
	}
	return { blocks: [] };
}

async function buildVerificationReview(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<BlockResponse> {
	const result = await sql<{
		id: string;
		sikesra_id_20: string | null;
		display_name: string;
		object_type_code: string;
		object_subtype_code: string;
		status_verification: string;
		completeness_score: number;
	}>`
		SELECT id, sikesra_id_20, display_name, object_type_code, object_subtype_code,
			status_verification, completeness_percent as completeness_score
		FROM awcms_sikesra_entities
		WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)}
			AND id = ${entityId}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	const row = result.rows[0];
	if (!row) {
		return {
			blocks: [
				{
					type: "banner",
					variant: "error",
					title: "Tidak Ditemukan",
					description: "Entitas tidak ditemukan",
				},
			],
		};
	}

	return {
		blocks: [
			{ type: "header", text: `Review: ${row.display_name}` },
			{ type: "context", text: `ID: ${row.sikesra_id_20 ?? row.id}` },
			{ type: "divider" },
			{
				type: "fields",
				fields: [
					{ label: "Tipe", value: `${row.object_type_code}/${row.object_subtype_code}` },
					{ label: "Status", value: row.status_verification },
					{ label: "Kelengkapan", value: `${row.completeness_score}%` },
				],
			},
			{ type: "divider" },
			{
				type: "form",
				fields: [
					{
						type: "text_input",
						action_id: "note",
						label: "Catatan Verifikasi",
						multiline: true,
						placeholder: "Tambahkan catatan...",
					},
					{
						type: "select",
						action_id: "decision",
						label: "Keputusan",
						options: [
							{ label: "Verifikasi", value: "verify" },
							{ label: "Perlu Revisi", value: "need_revision" },
							{ label: "Tolak", value: "reject" },
						],
					},
				],
				submit: { label: "Submit Keputusan", action_id: "verification:submit_decision" },
			},
			{ type: "divider" },
			{
				type: "actions",
				elements: [
					{
						type: "button",
						action_id: "verification:back_to_queue",
						label: "Kembali ke Antrian",
						style: "secondary",
					},
				],
			},
		],
	};
}

// ── Not Found ────────────────────────────────────────────────────────────────

function buildNotFound(page: string): BlockResponse {
	return {
		blocks: [
			{ type: "header", text: "Halaman Tidak Ditemukan" },
			{ type: "context", text: `Halaman "${page}" tidak tersedia` },
			{
				type: "actions",
				elements: [
					{
						type: "button",
						action_id: "navigate:dashboard",
						label: "Kembali ke Dashboard",
						style: "primary",
					},
				],
			},
		],
	};
}
