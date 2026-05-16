import { sql } from "kysely";

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
			(SELECT COUNT(*) FROM awcms_sikesra_entities WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)} AND deleted_at IS NULL AND status_verification LIKE 'submitted%') as pending_verification,
			(SELECT COUNT(*) FROM awcms_sikesra_entities WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)} AND deleted_at IS NULL AND duplicate_status = 'candidate') as duplicate_candidates,
			(SELECT COUNT(*) FROM awcms_sikesra_entities WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)} AND deleted_at IS NULL AND completeness_score < 100) as incomplete_documents
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

// ── Entity Registry ──────────────────────────────────────────────────────────

async function buildEntityList(db: unknown, ctx: SikesraRequestContext): Promise<BlockResponse> {
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

	const result = await sql<{
		id: string;
		sikesra_id_20: string | null;
		object_type_code: string;
		object_subtype_code: string;
		display_name: string;
		status_data: string;
		status_verification: string;
		sensitivity_level: string;
		completeness_score: number;
		created_at: string;
	}>`
		SELECT id, sikesra_id_20, object_type_code, object_subtype_code, display_name,
			status_data, status_verification, sensitivity_level, completeness_score, created_at
		FROM awcms_sikesra_entities
		WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)}
			AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT 50
	`.execute(db as never);

	const blocks: Block[] = [
		{ type: "header", text: "Registry Entitas" },
		{ type: "context", text: "Daftar semua entitas terdaftar" },
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
				action_id: "statusVerification",
				label: "Status Verifikasi",
				options: [
					{ label: "Semua", value: "" },
					{ label: "Draft", value: "draft" },
					{ label: "Submitted", value: "submitted" },
					{ label: "Verified", value: "verified" },
					{ label: "Need Revision", value: "need_revision" },
					{ label: "Rejected", value: "rejected" },
				],
			},
			{
				type: "select",
				action_id: "sensitivityLevel",
				label: "Sensitivitas",
				options: [
					{ label: "Semua", value: "" },
					{ label: "Normal", value: "normal" },
					{ label: "Sensitive", value: "sensitive" },
					{ label: "Highly Restricted", value: "highly_restricted" },
				],
			},
		],
		submit: { label: "Filter", action_id: "entities:filter" },
	});

	blocks.push({ type: "divider" });

	if (result.rows.length === 0) {
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
				{ key: "id", label: "ID SIKESRA", format: "code" },
				{ key: "type", label: "Tipe", format: "badge" },
				{ key: "displayName", label: "Nama", format: "text" },
				{ key: "statusVerification", label: "Verifikasi", format: "badge" },
				{ key: "sensitivity", label: "Sensitivitas", format: "badge" },
				{ key: "completeness", label: "Kelengkapan", format: "number" },
				{ key: "actions", label: "Aksi", format: "text" },
			],
			rows: result.rows.map((row) => ({
				id: row.sikesra_id_20 ?? row.id.slice(0, 12),
				type: `${row.object_type_code}/${row.object_subtype_code}`,
				displayName: row.display_name,
				statusVerification: row.status_verification,
				sensitivity: row.sensitivity_level,
				completeness: row.completeness_score,
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
	if (action.values?.action_id === "entities:filter") {
		return buildEntityList(db, ctx);
	}
	if (action.values?.action_id === "entities:view") {
		const entityId = action.values?.id as string | undefined;
		if (entityId) {
			return buildEntityDetail(db, ctx, entityId);
		}
	}
	return { blocks: [] };
}

async function buildEntityDetail(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<BlockResponse> {
	const result = await sql<{
		id: string;
		sikesra_id_20: string | null;
		object_type_code: string;
		object_subtype_code: string;
		display_name: string;
		status_data: string;
		status_verification: string;
		sensitivity_level: string;
		completeness_score: number;
		source_input: string;
		created_at: string;
		updated_at: string;
	}>`
		SELECT id, sikesra_id_20, object_type_code, object_subtype_code, display_name,
			status_data, status_verification, sensitivity_level, completeness_score,
			source_input, created_at, updated_at
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
			{ type: "header", text: row.display_name },
			{ type: "context", text: `ID: ${row.sikesra_id_20 ?? row.id}` },
			{ type: "divider" },
			{
				type: "fields",
				fields: [
					{ label: "Tipe Objek", value: row.object_type_code },
					{ label: "Subtipe", value: row.object_subtype_code },
					{ label: "Status Data", value: row.status_data },
					{ label: "Status Verifikasi", value: row.status_verification },
					{ label: "Sensitivitas", value: row.sensitivity_level },
					{ label: "Kelengkapan", value: `${row.completeness_score}%` },
					{ label: "Sumber Input", value: row.source_input },
					{ label: "Dibuat", value: row.created_at },
					{ label: "Diperbarui", value: row.updated_at },
				],
			},
			{ type: "divider" },
			{
				type: "actions",
				elements: [
					{
						type: "button",
						action_id: "entities:back_to_list",
						label: "Kembali ke Daftar",
						style: "secondary",
					},
					{
						type: "button",
						action_id: "entities:submit_verification",
						label: "Ajukan Verifikasi",
						style: "primary",
					},
				],
			},
		],
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
			submitted_at, completeness_score
		FROM awcms_sikesra_entities
		WHERE ${buildTenantSiteScopeSql("tenant_id", "site_id", ctx.tenantId, ctx.siteId)}
			AND deleted_at IS NULL
			AND status_verification LIKE 'submitted%'
		ORDER BY submitted_at ASC
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
			AVG(completeness_score) as avg_completeness
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
			status_verification, completeness_score
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
