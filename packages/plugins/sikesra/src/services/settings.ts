import { sql } from "kysely";

import type { SikesraRequestContext } from "../security/request-context.js";
import { guardRoute } from "../security/route-guard.js";

export interface AuditListFilters {
	action?: string;
	resourceType?: string;
	resourceId?: string;
	actorId?: string;
	success?: boolean;
	limit?: number;
	cursor?: string;
}

export interface AuditDetailResponse {
	id: string;
	tenantId: string;
	siteId: string;
	actorId: string | null;
	actorRole: string | null;
	action: string;
	resourceType: string | null;
	resourceId: string | null;
	requestId: string | null;
	success: boolean;
	reason: string | null;
	before: Record<string, unknown> | null;
	after: Record<string, unknown> | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string;
}

export interface AuditListItem {
	id: string;
	actorId: string | null;
	action: string;
	resourceType: string | null;
	resourceId: string | null;
	success: boolean;
	createdAt: string;
}

export interface SettingsUpdateInput {
	publicEnabled?: boolean;
	publicTitle?: string;
	publicDescription?: string;
	dataScopeNote?: string;
	officialContact?: string;
	smallCellThreshold?: number;
}

export interface SettingsResponse {
	publicEnabled: boolean;
	publicTitle: string;
	publicDescription: string | null;
	dataScopeNote: string | null;
	officialContact: string | null;
	smallCellThreshold: number;
	updatedAt: string | null;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_SITE_ID = "main";

export async function listAuditEntries(
	db: unknown,
	ctx: SikesraRequestContext,
	filters: AuditListFilters,
): Promise<{ items: AuditListItem[]; nextCursor?: string }> {
	const denied = guardRoute(ctx, "audit:read");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const limit = Math.min(Math.max(filters.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

	const result = await sql<{
		id: string;
		actor_id: string | null;
		action: string;
		resource_type: string | null;
		resource_id: string | null;
		success: number;
		created_at: string;
	}>`
		SELECT id, actor_id, action, resource_type, resource_id, success, created_at
		FROM awcms_sikesra_audit_logs
		WHERE ${buildAuditWhereSql(ctx, filters)}
		ORDER BY created_at DESC, id DESC
		LIMIT ${limit + 1}
	`.execute(db as never);

	const rows = result.rows;
	const hasMore = rows.length > limit;
	const items = rows.slice(0, limit).map((row) => ({
		id: row.id,
		actorId: row.actor_id,
		action: row.action,
		resourceType: row.resource_type,
		resourceId: row.resource_id,
		success: row.success === 1,
		createdAt: row.created_at,
	}));

	return {
		items,
		nextCursor: hasMore ? rows[limit]?.id : undefined,
	};
}

export async function getAuditDetail(
	db: unknown,
	ctx: SikesraRequestContext,
	auditId: string,
): Promise<AuditDetailResponse> {
	const denied = guardRoute(ctx, "audit:read");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const result = await sql<{
		id: string;
		tenant_id: string;
		site_id: string;
		actor_id: string | null;
		actor_role: string | null;
		action: string;
		resource_type: string | null;
		resource_id: string | null;
		request_id: string | null;
		success: number;
		reason: string | null;
		before_json: string | null;
		after_json: string | null;
		ip_address: string | null;
		user_agent: string | null;
		created_at: string;
	}>`
		SELECT id, tenant_id, site_id, actor_id, actor_role, action, resource_type, resource_id,
			request_id, success, reason, before_json, after_json, ip_address, user_agent, created_at
		FROM awcms_sikesra_audit_logs
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND id = ${auditId}
		LIMIT 1
	`.execute(db as never);

	const row = result.rows[0];
	if (!row) return throwRouteError("NOT_FOUND", "Audit entry not found", 404);

	const redacted = redactSensitiveAuditData(row);

	return {
		id: redacted.id,
		tenantId: redacted.tenant_id,
		siteId: redacted.site_id,
		actorId: redacted.actor_id,
		actorRole: redacted.actor_role,
		action: redacted.action,
		resourceType: redacted.resource_type,
		resourceId: redacted.resource_id,
		requestId: redacted.request_id,
		success: redacted.success === 1,
		reason: redacted.reason,
		before: redacted.before_json ? safeParseJson(redacted.before_json) : null,
		after: redacted.after_json ? safeParseJson(redacted.after_json) : null,
		ipAddress: redacted.ip_address,
		userAgent: redacted.user_agent,
		createdAt: redacted.created_at,
	};
}

export async function getSettings(
	db: unknown,
	ctx: SikesraRequestContext,
): Promise<SettingsResponse> {
	const denied = guardRoute(ctx, "settings:read");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const result = await sql<{
		public_enabled: number;
		public_title: string;
		public_description: string | null;
		data_scope_note: string | null;
		official_contact: string | null;
		small_cell_threshold: number;
		updated_at: string | null;
	}>`
		SELECT public_enabled, public_title, public_description, data_scope_note,
			official_contact, small_cell_threshold, updated_at
		FROM awcms_sikesra_settings
		WHERE tenant_id = ${DEFAULT_TENANT_ID}
			AND site_id = ${DEFAULT_SITE_ID}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	const row = result.rows[0];
	if (!row) {
		return {
			publicEnabled: true,
			publicTitle: "SIKESRA",
			publicDescription: null,
			dataScopeNote: null,
			officialContact: "",
			smallCellThreshold: 5,
			updatedAt: null,
		};
	}

	return {
		publicEnabled: row.public_enabled === 1,
		publicTitle: row.public_title,
		publicDescription: row.public_description,
		dataScopeNote: row.data_scope_note,
		officialContact: row.official_contact || "",
		smallCellThreshold: row.small_cell_threshold ?? 5,
		updatedAt: row.updated_at,
	};
}

export async function updateSettings(
	db: unknown,
	ctx: SikesraRequestContext,
	input: SettingsUpdateInput,
	reason: string,
): Promise<SettingsResponse> {
	const denied = guardRoute(ctx, "settings:update");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	if (!reason.trim()) {
		return throwRouteError("VALIDATION_ERROR", "Reason is required for settings updates", 400);
	}

	const existing = await getSettings(db, ctx);

	const updates: string[] = [];
	const values: unknown[] = [];

	if (input.publicEnabled !== undefined) {
		updates.push("public_enabled = ?");
		values.push(input.publicEnabled ? 1 : 0);
	}
	if (input.publicTitle !== undefined) {
		updates.push("public_title = ?");
		values.push(input.publicTitle);
	}
	if (input.publicDescription !== undefined) {
		updates.push("public_description = ?");
		values.push(input.publicDescription);
	}
	if (input.dataScopeNote !== undefined) {
		updates.push("data_scope_note = ?");
		values.push(input.dataScopeNote);
	}
	if (input.officialContact !== undefined) {
		updates.push("official_contact = ?");
		values.push(input.officialContact);
	}
	if (input.smallCellThreshold !== undefined) {
		updates.push("small_cell_threshold = ?");
		values.push(input.smallCellThreshold);
	}

	if (updates.length > 0) {
		updates.push("updated_at = datetime('now')", "updated_by = ?");
		values.push(ctx.userId);
		values.push(DEFAULT_TENANT_ID);
		values.push(DEFAULT_SITE_ID);

		await sql
			.raw(
				`UPDATE awcms_sikesra_settings SET ${updates.join(", ")} WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
			)
			.execute(db as never);
	}

	await writeSettingsAudit(db, ctx, existing, input, reason);

	return getSettings(db, ctx);
}

function buildAuditWhereSql(ctx: SikesraRequestContext, filters: AuditListFilters) {
	const conditions = [sql`tenant_id = ${ctx.tenantId}`, sql`site_id = ${ctx.siteId}`];

	if (filters.action) {
		conditions.push(sql`action = ${filters.action}`);
	}
	if (filters.resourceType) {
		conditions.push(sql`resource_type = ${filters.resourceType}`);
	}
	if (filters.resourceId) {
		conditions.push(sql`resource_id = ${filters.resourceId}`);
	}
	if (filters.actorId) {
		conditions.push(sql`actor_id = ${filters.actorId}`);
	}
	if (filters.success !== undefined) {
		conditions.push(sql`success = ${filters.success ? 1 : 0}`);
	}
	if (filters.cursor) {
		conditions.push(
			sql`(created_at, id) < (${sql.ref(filters.cursor)}, ${sql.ref(filters.cursor)})`,
		);
	}

	return sql.join(conditions, sql` AND `);
}

interface AuditRow {
	id: string;
	tenant_id: string;
	site_id: string;
	actor_id: string | null;
	actor_role: string | null;
	action: string;
	resource_type: string | null;
	resource_id: string | null;
	request_id: string | null;
	success: number;
	reason: string | null;
	before_json: string | null;
	after_json: string | null;
	ip_address: string | null;
	user_agent: string | null;
	created_at: string;
}

function redactSensitiveAuditData(row: AuditRow): AuditRow {
	const redacted = { ...row };

	if (redacted.before_json) {
		const before = safeParseJson(redacted.before_json);
		if (before) {
			delete before.nik;
			delete before.kia;
			delete before.child_name;
			delete before.phone;
			delete before.address;
			delete before.guardian;
			delete before.desil;
			redacted.before_json = JSON.stringify(before);
		}
	}

	if (redacted.after_json) {
		const after = safeParseJson(redacted.after_json);
		if (after) {
			delete after.nik;
			delete after.kia;
			delete after.child_name;
			delete after.phone;
			delete after.address;
			delete after.guardian;
			delete after.desil;
			redacted.after_json = JSON.stringify(after);
		}
	}

	return redacted;
}

function safeParseJson(json: string | null): Record<string, unknown> | null {
	if (!json) return null;
	try {
		const parsed = JSON.parse(json);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

async function writeSettingsAudit(
	db: unknown,
	ctx: SikesraRequestContext,
	existing: SettingsResponse,
	input: SettingsUpdateInput,
	reason: string,
): Promise<void> {
	try {
		const changes: Record<string, unknown> = {};
		if (input.publicEnabled !== undefined)
			changes.publicEnabled = { from: existing.publicEnabled, to: input.publicEnabled };
		if (input.publicTitle !== undefined)
			changes.publicTitle = { from: existing.publicTitle, to: input.publicTitle };
		if (input.publicDescription !== undefined)
			changes.publicDescription = { from: existing.publicDescription, to: input.publicDescription };
		if (input.dataScopeNote !== undefined)
			changes.dataScopeNote = { from: existing.dataScopeNote, to: input.dataScopeNote };
		if (input.officialContact !== undefined)
			changes.officialContact = { from: existing.officialContact, to: input.officialContact };
		if (input.smallCellThreshold !== undefined)
			changes.smallCellThreshold = {
				from: existing.smallCellThreshold,
				to: input.smallCellThreshold,
			};

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
				${JSON.stringify(existing)}, ${JSON.stringify(changes)},
				${ctx.ipAddress ?? null}, ${ctx.userAgent ?? null},
				datetime('now')
			)
		`.execute(db as never);
	} catch {
		// Audit write failures should not block the main operation
	}
}

async function throwRouteError(code: string, message: string, status: number): Promise<never> {
	const { PluginRouteError } = await import("emdash");
	throw new PluginRouteError(code, message, status);
}
