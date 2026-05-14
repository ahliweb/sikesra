import { sql } from "kysely";

import { AUDIT_ACTIONS, type AuditAction } from "../security/audit.js";
import { guardRoute } from "../security/route-guard.js";
import type { SikesraRequestContext } from "../security/request-context.js";

export interface VerificationSubmitInput {
	entityId: string;
	note?: string;
}

export interface VerificationQueueFilters {
	status?: string;
	districtCode?: string;
	officialVillageCode?: string;
	limit?: number;
	cursor?: string;
}

export interface VerificationDecisionInput {
	entityId: string;
	decision: "verify" | "need_revision" | "reject";
	note: string;
}

export interface VerificationQueueItem {
	id: string;
	sikesraId20: string | null;
	displayName: string;
	objectTypeCode: string;
	objectSubtypeCode: string;
	statusVerification: string;
	verificationLevel: string | null;
	sensitivityLevel: string;
	officialVillageCode: string;
	villageName: string;
	districtCode: string | null;
	districtName: string | null;
	submittedAt: string | null;
	completenessPercent: number;
}

export interface VerificationTimelineEntry {
	id: string;
	entityId: string;
	actorId: string;
	actorRole: string;
	action: string;
	previousStatus: string;
	nextStatus: string;
	level: string | null;
	note: string | null;
	requestId: string | null;
	ipAddress: string | null;
	createdAt: string;
}

export interface VerificationSubmitResult {
	entityId: string;
	previousStatus: string;
	nextStatus: string;
	timelineId: string;
}

export interface VerificationDecisionResult {
	entityId: string;
	previousStatus: string;
	nextStatus: string;
	verificationLevel: string | null;
	timelineId: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function submitForVerification(
	db: unknown,
	ctx: SikesraRequestContext,
	input: VerificationSubmitInput,
): Promise<VerificationSubmitResult> {
	const denied = guardRoute(ctx, "verification:submit");
	if (!denied.allowed) return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const entity = await getEntityForVerification(db, ctx, input.entityId);
	if (!entity) return throwRouteError("NOT_FOUND", "Entity not found or not eligible for verification", 404);

	const previousStatus = entity.status_verification;
	const nextStatus = "pending_verification";

	await sql`
		UPDATE awcms_sikesra_entities
		SET status_verification = ${nextStatus},
			updated_at = datetime('now')
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND id = ${input.entityId}
			AND deleted_at IS NULL
	`.execute(db as never);

	const timelineId = await writeVerificationTimelineEntry(db, ctx, {
		entityId: input.entityId,
		action: AUDIT_ACTIONS.VERIFICATION_SUBMIT,
		previousStatus,
		nextStatus,
		level: null,
		note: input.note || null,
	});

	await writeVerificationAudit(db, ctx, AUDIT_ACTIONS.VERIFICATION_SUBMIT, input.entityId, {
		previousStatus,
		nextStatus,
		timelineId,
	});

	return {
		entityId: input.entityId,
		previousStatus,
		nextStatus,
		timelineId,
	};
}

export async function getVerificationQueue(
	db: unknown,
	ctx: SikesraRequestContext,
	filters: VerificationQueueFilters,
): Promise<{ items: VerificationQueueItem[]; nextCursor?: string }> {
	const denied = guardRoute(ctx, "verification:verify");
	if (!denied.allowed) return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const limit = Math.min(Math.max(filters.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

	const result = await sql<{
		id: string;
		sikesra_id_20: string | null;
		display_name: string;
		object_type_code: string;
		object_subtype_code: string;
		status_verification: string;
		verification_level: string | null;
		sensitivity_level: string;
		official_village_code: string;
		village_name: string;
		district_code: string | null;
		district_name: string | null;
		submitted_at: string | null;
		completeness_percent: number;
	}>`
		SELECT
			entity.id,
			entity.sikesra_id_20,
			entity.display_name,
			entity.object_type_code,
			entity.object_subtype_code,
			entity.status_verification,
			entity.verification_level,
			entity.sensitivity_level,
			entity.official_village_code,
			village.name AS village_name,
			district.code AS district_code,
			district.name AS district_name,
			entity.updated_at AS submitted_at,
			entity.completeness_percent
		FROM awcms_sikesra_entities entity
		JOIN awcms_sikesra_official_regions village
			ON village.tenant_id = entity.tenant_id
			AND village.site_id = entity.site_id
			AND village.code = entity.official_village_code
		LEFT JOIN awcms_sikesra_official_regions district
			ON district.tenant_id = village.tenant_id
			AND district.site_id = village.site_id
			AND district.code = village.parent_code
		WHERE ${buildQueueWhereSql(ctx, filters)}
		ORDER BY entity.updated_at ASC, entity.id ASC
		LIMIT ${limit + 1}
	`.execute(db as never);

	const rows = result.rows;
	const hasMore = rows.length > limit;
	const items = rows.slice(0, limit).map((row) => ({
		id: row.id,
		sikesraId20: row.sikesra_id_20,
		displayName: row.display_name,
		objectTypeCode: row.object_type_code,
		objectSubtypeCode: row.object_subtype_code,
		statusVerification: row.status_verification,
		verificationLevel: row.verification_level,
		sensitivityLevel: row.sensitivity_level,
		officialVillageCode: row.official_village_code,
		villageName: row.village_name,
		districtCode: row.district_code,
		districtName: row.district_name,
		submittedAt: row.submitted_at,
		completenessPercent: row.completeness_percent,
	}));

	return {
		items,
		nextCursor: hasMore ? rows[limit]?.id : undefined,
	};
}

export async function makeVerificationDecision(
	db: unknown,
	ctx: SikesraRequestContext,
	input: VerificationDecisionInput,
): Promise<VerificationDecisionResult> {
	const denied = guardRoute(ctx, "verification:verify");
	if (!denied.allowed) return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	if (!input.note.trim()) {
		return throwRouteError("VALIDATION_ERROR", "Note is required for verification decisions", 400);
	}

	const entity = await getEntityForVerification(db, ctx, input.entityId);
	if (!entity) return throwRouteError("NOT_FOUND", "Entity not found or not eligible for verification", 404);

	const previousStatus = entity.status_verification;
	let nextStatus: string;
	let verificationLevel: string | null = null;

	switch (input.decision) {
		case "verify":
			nextStatus = "verified";
			verificationLevel = determineVerificationLevel(ctx);
			break;
		case "need_revision":
			nextStatus = "needs_revision";
			break;
		case "reject":
			nextStatus = "rejected";
			break;
		default:
			return throwRouteError("VALIDATION_ERROR", "Invalid verification decision", 400);
	}

	await sql`
		UPDATE awcms_sikesra_entities
		SET status_verification = ${nextStatus},
			verification_level = ${verificationLevel},
			verified_at = CASE WHEN ${nextStatus} = 'verified' THEN datetime('now') ELSE verified_at END,
			updated_at = datetime('now')
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND id = ${input.entityId}
			AND deleted_at IS NULL
	`.execute(db as never);

	const auditAction = input.decision === "verify"
		? AUDIT_ACTIONS.VERIFICATION_VERIFY
		: input.decision === "reject"
			? AUDIT_ACTIONS.VERIFICATION_REJECT
			: AUDIT_ACTIONS.VERIFICATION_SUBMIT;

	const timelineId = await writeVerificationTimelineEntry(db, ctx, {
		entityId: input.entityId,
		action: auditAction,
		previousStatus,
		nextStatus,
		level: verificationLevel,
		note: input.note,
	});

	await writeVerificationAudit(db, ctx, auditAction, input.entityId, {
		previousStatus,
		nextStatus,
		verificationLevel,
		timelineId,
		note: input.note,
	});

	return {
		entityId: input.entityId,
		previousStatus,
		nextStatus,
		verificationLevel,
		timelineId,
	};
}

export async function getVerificationTimeline(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<VerificationTimelineEntry[]> {
	const denied = guardRoute(ctx, "entity:read");
	if (!denied.allowed) return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const result = await sql<{
		id: string;
		entity_id: string;
		actor_id: string;
		actor_role: string;
		action: string;
		previous_status: string;
		next_status: string;
		verification_level: string | null;
		note: string | null;
		request_id: string | null;
		ip_address: string | null;
		created_at: string;
	}>`
		SELECT
			id,
			entity_id,
			actor_id,
			actor_role,
			action,
			previous_status,
			next_status,
			verification_level,
			note,
			request_id,
			ip_address,
			created_at
		FROM awcms_sikesra_verification_events
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND entity_id = ${entityId}
		ORDER BY created_at ASC
	`.execute(db as never);

	return result.rows.map((row) => ({
		id: row.id,
		entityId: row.entity_id,
		actorId: row.actor_id,
		actorRole: row.actor_role,
		action: row.action,
		previousStatus: row.previous_status,
		nextStatus: row.next_status,
		level: row.verification_level,
		note: row.note,
		requestId: row.request_id,
		ipAddress: row.ip_address,
		createdAt: row.created_at,
	}));
}

interface TimelineEntryInput {
	entityId: string;
	action: AuditAction;
	previousStatus: string;
	nextStatus: string;
	level: string | null;
	note: string | null;
}

async function writeVerificationTimelineEntry(
	db: unknown,
	ctx: SikesraRequestContext,
	input: TimelineEntryInput,
): Promise<string> {
	const id = `vtl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

	await sql`
		INSERT INTO awcms_sikesra_verification_events (
			id, tenant_id, site_id, entity_id, actor_id, actor_role,
			verification_level, action, previous_status, next_status, note,
			request_id, ip_address, created_at
		) VALUES (
			${id}, ${ctx.tenantId}, ${ctx.siteId}, ${input.entityId},
			${ctx.userId}, ${ctx.roles[0] ?? 'unknown'},
			${input.level ?? 'desa'}, ${input.action}, ${input.previousStatus}, ${input.nextStatus},
			${input.note},
			${ctx.requestId}, ${ctx.ipAddress ?? null},
			datetime('now')
		)
	`.execute(db as never);

	return id;
}

async function getEntityForVerification(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
) {
	const result = await sql<{
		id: string;
		status_verification: string;
	}>`
		SELECT id, status_verification
		FROM awcms_sikesra_entities
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND id = ${entityId}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	return result.rows[0];
}

function buildQueueWhereSql(ctx: SikesraRequestContext, filters: VerificationQueueFilters) {
	const conditions = [
		sql`entity.tenant_id = ${ctx.tenantId}`,
		sql`entity.site_id = ${ctx.siteId}`,
		sql`entity.deleted_at IS NULL`,
		sql`entity.status_verification IN ('pending_verification', 'needs_revision')`,
	];

	if (filters.status) {
		conditions.push(sql`entity.status_verification = ${filters.status}`);
	}
	if (filters.districtCode) {
		conditions.push(sql`district.code = ${filters.districtCode}`);
	}
	if (filters.officialVillageCode) {
		conditions.push(sql`entity.official_village_code = ${filters.officialVillageCode}`);
	}
	if (ctx.regionScope.villageCodes?.length) {
		conditions.push(
			sql`entity.official_village_code IN (${sql.join(
				ctx.regionScope.villageCodes.map((code) => sql`${code}`),
			)})`,
		);
	}
	if (filters.cursor) {
		conditions.push(sql`(entity.updated_at, entity.id) > (${sql.ref(filters.cursor)}, ${sql.ref(filters.cursor)})`);
	}

	return sql.join(conditions, sql` AND `);
}

function determineVerificationLevel(ctx: SikesraRequestContext): string | null {
	const role = ctx.roles[0];
	if (!role) return null;

	if (role.includes("admin")) return "national";
	if (role.includes("regency")) return "regency";
	if (role.includes("district")) return "district";
	if (role.includes("village")) return "village";

	return "village";
}

async function writeVerificationAudit(
	db: unknown,
	ctx: SikesraRequestContext,
	action: AuditAction,
	entityId: string,
	metadata: Record<string, unknown>,
): Promise<void> {
	try {
		await sql`
			INSERT INTO awcms_sikesra_audit_logs (
				id, tenant_id, site_id, actor_id, actor_role, action,
				resource_type, resource_id, request_id, success,
				before_json, after_json, ip_address, user_agent, created_at
			) VALUES (
				${`audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
				${ctx.tenantId}, ${ctx.siteId}, ${ctx.userId},
				${ctx.roles[0] ?? 'unknown'}, ${action},
				'entity', ${entityId}, ${ctx.requestId}, 1,
				${null}, ${JSON.stringify(metadata)},
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
