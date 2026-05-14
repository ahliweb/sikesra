import { sql } from "kysely";

import type { SikesraRequestContext } from "./security/request-context.js";
import { guardRoute } from "./security/route-guard.js";

// ── Block Types (inline to avoid @emdash-cms/blocks dependency) ─────────────

type Block = {
	type: string;
	[key: string]: unknown;
};

interface BlockResponse {
	blocks: Block[];
	toast?: { message: string; type: "success" | "error" | "info" };
}

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
			return buildOperations(db, ctx);
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
				{ type: "banner", variant: "error", title: "Akses Ditolak", description: denied.reasonMessage },
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
		blocks.push({ type: "empty", title: "Belum Ada Aktivitas", description: "Aktivitas akan muncul setelah operasi dilakukan" });
	}

	// Quick actions
	blocks.push({ type: "divider" });
	blocks.push({ type: "header", text: "Aksi Cepat" });
	blocks.push({
		type: "actions",
		elements: [
			{ type: "button", action_id: "navigate:entities/new", label: "Tambah Entitas Baru", style: "primary" },
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
	if (action.type === "block_action" && action.values?.action_id?.toString().startsWith("navigate:")) {
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
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND deleted_at IS NULL
	`.execute(db as never);

	const row = result.rows[0];
	return [
		{ label: "Total Entitas", value: row?.total ?? 0, description: "Semua entitas aktif" },
		{ label: "Draft", value: row?.draft ?? 0, description: "Belum selesai diisi" },
		{ label: "Menunggu Verifikasi", value: row?.submitted ?? 0, description: "Sudah diajukan" },
		{ label: "Terverifikasi", value: row?.verified ?? 0, description: "Sudah diverifikasi", trend: "up" as const },
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
			(SELECT COUNT(*) FROM awcms_sikesra_entities WHERE tenant_id = ${ctx.tenantId} AND site_id = ${ctx.siteId} AND deleted_at IS NULL AND status_verification LIKE 'submitted%') as pending_verification,
			(SELECT COUNT(*) FROM awcms_sikesra_entities WHERE tenant_id = ${ctx.tenantId} AND site_id = ${ctx.siteId} AND deleted_at IS NULL AND duplicate_status = 'candidate') as duplicate_candidates,
			(SELECT COUNT(*) FROM awcms_sikesra_entities WHERE tenant_id = ${ctx.tenantId} AND site_id = ${ctx.siteId} AND deleted_at IS NULL AND completeness_score < 100) as incomplete_documents
	`.execute(db as never);

	const row = result.rows[0];
	return {
		pendingVerification: row?.pending_verification ?? 0,
		duplicateCandidates: row?.duplicate_candidates ?? 0,
		incompleteDocuments: row?.incomplete_documents ?? 0,
	};
}

async function loadRecentAudit(db: unknown, ctx: SikesraRequestContext, limit: number): Promise<Array<Record<string, unknown>>> {
	const result = await sql<{
		action: string;
		actor_id: string | null;
		resource_type: string | null;
		resource_id: string | null;
		created_at: string;
	}>`
		SELECT action, actor_id, resource_type, resource_id, created_at
		FROM awcms_sikesra_audit_logs
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
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
				{ type: "banner", variant: "error", title: "Akses Ditolak", description: denied.reasonMessage },
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
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
		ORDER BY created_at DESC
		LIMIT 50
	`.execute(db as never);

	const blocks: Block[] = [
		{ type: "header", text: "Audit Log" },
		{ type: "context", text: "Catatan aktivitas sistem dan perubahan data" },
		{ type: "divider" },
	];

	if (result.rows.length === 0) {
		blocks.push({ type: "empty", title: "Tidak Ada Audit Log", description: "Belum ada aktivitas yang tercatat" });
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
			blocks: [{ type: "banner", variant: "info", title: "Export Dimulai", description: "Audit log sedang diekspor" }],
			toast: { message: "Export audit log dimulai", type: "info" },
		};
	}
	return { blocks: [] };
}

async function buildAuditDetail(db: unknown, ctx: SikesraRequestContext, auditId: string): Promise<BlockResponse> {
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
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND id = ${auditId}
		LIMIT 1
	`.execute(db as never);

	const row = result.rows[0];
	if (!row) {
		return {
			blocks: [{ type: "banner", variant: "error", title: "Tidak Ditemukan", description: "Audit log tidak ditemukan" }],
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
					{ type: "button", action_id: "audit:back_to_list", label: "Kembali ke Daftar", style: "secondary" },
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
				{ type: "banner", variant: "error", title: "Akses Ditolak", description: denied.reasonMessage },
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
					{ type: "toggle", action_id: "publicEnabled", label: "Aktifkan Halaman Publik", initial_value: settings.publicEnabled },
					{ type: "text_input", action_id: "publicTitle", label: "Judul Halaman Publik", initial_value: settings.publicTitle },
					{ type: "text_input", action_id: "publicDescription", label: "Deskripsi Halaman Publik", initial_value: settings.publicDescription, multiline: true },
					{ type: "text_input", action_id: "dataScopeNote", label: "Catatan Lingkup Data", initial_value: settings.dataScopeNote, multiline: true },
					{ type: "text_input", action_id: "officialContact", label: "Kontak Resmi", initial_value: settings.officialContact },
					{ type: "number_input", action_id: "smallCellThreshold", label: "Batas Supresi Sel Kecil", initial_value: settings.smallCellThreshold, min: 1, max: 20 },
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
				.raw(`UPDATE awcms_sikesra_settings SET ${updates.join(", ")} WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`)
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
				{ type: "banner", variant: "alert", title: "Pengaturan Disimpan", description: "Perubahan telah disimpan dengan sukses" },
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
				{ type: "banner", variant: "error", title: "Akses Ditolak", description: denied.reasonMessage },
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
				{ type: "button", action_id: "navigate:documents", label: "Kelola Dokumen", style: "primary" },
				{ type: "button", action_id: "navigate:imports", label: "Import Excel", style: "primary" },
				{ type: "button", action_id: "navigate:reports", label: "Laporan & Export", style: "primary" },
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

// ── Not Found ────────────────────────────────────────────────────────────────

function buildNotFound(page: string): BlockResponse {
	return {
		blocks: [
			{ type: "header", text: "Halaman Tidak Ditemukan" },
			{ type: "context", text: `Halaman "${page}" tidak tersedia` },
			{
				type: "actions",
				elements: [
					{ type: "button", action_id: "navigate:dashboard", label: "Kembali ke Dashboard", style: "primary" },
				],
			},
		],
	};
}
