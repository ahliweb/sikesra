import type { SikesraRequestContext } from "./request-context.js";

export const AUDIT_ACTIONS = {
	ENTITY_CREATE: "entity.create",
	ENTITY_UPDATE: "entity.update",
	ENTITY_ARCHIVE: "entity.archive",
	ENTITY_RESTORE: "entity.restore",
	CODE_GENERATE: "code.generate",
	CODE_CORRECT: "code.correct",
	VERIFICATION_SUBMIT: "verification.submit",
	VERIFICATION_VERIFY: "verification.verify",
	VERIFICATION_NEED_REVISION: "verification.need_revision",
	VERIFICATION_REJECT: "verification.reject",
	DOCUMENT_UPLOAD: "document.upload",
	DOCUMENT_COMPLETE: "document.complete",
	DOCUMENT_DOWNLOAD: "document.download",
	DOCUMENT_REPLACE: "document.replace",
	DOCUMENT_VERIFY: "document.verify",
	DOCUMENT_REJECT: "document.reject",
	IMPORT_CREATE: "import.create",
	IMPORT_MAP: "import.map",
	IMPORT_VALIDATE: "import.validate",
	IMPORT_PROMOTE: "import.promote",
	IMPORT_OVERRIDE_DUPLICATE: "import.override_duplicate",
	DUPLICATE_DECISION: "duplicate.decision",
	EXPORT_CREATE: "export.create",
	EXPORT_DOWNLOAD: "export.download",
	EXPORT_RESTRICTED_CREATE: "export.restricted_create",
	ACCESS_DENIED: "security.access_denied",
	SENSITIVE_REVEAL: "security.sensitive_reveal",
	ABAC_DENIED: "security.abac_denied",
	SETTINGS_UPDATE: "settings.update",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditEventInput {
	tenantId: string;
	siteId: string;
	actorId?: string;
	actorRole?: string;
	action: AuditAction;
	resourceType?: string;
	resourceId?: string;
	requestId?: string;
	success?: boolean;
	reason?: string;
	before?: Record<string, unknown>;
	after?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
}

export interface AuditEvent extends AuditEventInput {
	id: string;
	createdAt: string;
}

export interface AuditDbBinding {
	prepare(query: string): {
		bind(...values: unknown[]): { run(): Promise<unknown> };
	};
}

export type AuditWriteResult = { ok: true; auditEventId: string } | { ok: false; message: string };

export const HIGH_RISK_AUDIT_REQUIRED: Set<AuditAction> = new Set([
	AUDIT_ACTIONS.CODE_CORRECT,
	AUDIT_ACTIONS.VERIFICATION_VERIFY,
	AUDIT_ACTIONS.VERIFICATION_REJECT,
	AUDIT_ACTIONS.DOCUMENT_DOWNLOAD,
	AUDIT_ACTIONS.EXPORT_RESTRICTED_CREATE,
	AUDIT_ACTIONS.IMPORT_PROMOTE,
	AUDIT_ACTIONS.IMPORT_OVERRIDE_DUPLICATE,
	AUDIT_ACTIONS.DUPLICATE_DECISION,
	AUDIT_ACTIONS.SENSITIVE_REVEAL,
	AUDIT_ACTIONS.SETTINGS_UPDATE,
]);

export function isHighRiskAction(action: AuditAction): boolean {
	return HIGH_RISK_AUDIT_REQUIRED.has(action);
}

export async function writeAuditEvent(
	db: AuditDbBinding,
	input: AuditEventInput,
	ctx: SikesraRequestContext,
): Promise<AuditWriteResult> {
	const event: AuditEvent = {
		...input,
		id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		createdAt: new Date().toISOString(),
		success: input.success ?? true,
		actorId: input.actorId ?? ctx.userId,
		actorRole: input.actorRole ?? ctx.roles[0] ?? "unknown",
		requestId: input.requestId ?? ctx.requestId,
		ipAddress: input.ipAddress ?? ctx.ipAddress,
		userAgent: input.userAgent ?? ctx.userAgent,
	};

	try {
		await db
			.prepare(
				`INSERT INTO awcms_sikesra_audit_logs (id, tenant_id, site_id, actor_id, actor_role, action, resource_type, resource_id, request_id, success, reason, before_json, after_json, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				event.id,
				event.tenantId,
				event.siteId,
				event.actorId,
				event.actorRole,
				event.action,
				event.resourceType ?? null,
				event.resourceId ?? null,
				event.requestId ?? null,
				event.success ? 1 : 0,
				event.reason ?? null,
				event.before ? JSON.stringify(event.before) : null,
				event.after ? JSON.stringify(event.after) : null,
				event.ipAddress ?? null,
				event.userAgent ?? null,
				event.createdAt,
			)
			.run();
		return { ok: true, auditEventId: event.id };
	} catch (error) {
		return {
			ok: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
