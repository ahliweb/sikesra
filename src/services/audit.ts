// SIKESRA Audit Service Baseline
// Immutable critical-action event writer
// Source: docs/sikesra/06_security_rbac_abac.md

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

// Audit action catalog from docs/sikesra/06_security_rbac_abac.md
export const AUDIT_ACTIONS = {
  // Entity
  ENTITY_CREATE: "entity.create",
  ENTITY_UPDATE: "entity.update",
  ENTITY_ARCHIVE: "entity.archive",
  ENTITY_RESTORE: "entity.restore",

  // Code
  CODE_GENERATE: "code.generate",
  CODE_CORRECT: "code.correct",
  CODE_GENERATE_FAILED: "code.generate_failed",

  // Verification
  VERIFICATION_SUBMIT: "verification.submit",
  VERIFICATION_VERIFY: "verification.verify",
  VERIFICATION_NEED_REVISION: "verification.need_revision",
  VERIFICATION_REJECT: "verification.reject",

  // Document
  DOCUMENT_UPLOAD: "document.upload",
  DOCUMENT_COMPLETE: "document.complete",
  DOCUMENT_PREVIEW: "document.preview",
  DOCUMENT_DOWNLOAD: "document.download",
  DOCUMENT_REPLACE: "document.replace",
  DOCUMENT_VERIFY: "document.verify",
  DOCUMENT_REJECT: "document.reject",
  DOCUMENT_SUPERSEDE: "document.supersede",

  // Import
  IMPORT_CREATE: "import.create",
  IMPORT_MAP: "import.map",
  IMPORT_VALIDATE: "import.validate",
  IMPORT_PROMOTE: "import.promote",
  IMPORT_SKIP_ROW: "import.skip_row",
  IMPORT_OVERRIDE_DUPLICATE: "import.override_duplicate",

  // Duplicate
  DUPLICATE_DECISION: "duplicate.decision",

  // Completeness
  COMPLETENESS_CHECK: "completeness.check",

  // Export
  EXPORT_CREATE: "export.create",
  EXPORT_DOWNLOAD: "export.download",
  EXPORT_RESTRICTED_CREATE: "export.restricted_create",
  EXPORT_FAILED: "export.failed",

  // Security / Access
  ACCESS_DENIED: "security.access_denied",
  SENSITIVE_REVEAL: "security.sensitive_reveal",
  ABAC_DENIED: "security.abac_denied",

  // Region
  REGION_OFFICIAL_IMPORT: "region.official_import",
  REGION_LOCAL_CREATE: "region.local_create",
  REGION_LOCAL_UPDATE: "region.local_update",
  REGION_LOCAL_DEACTIVATE: "region.local_deactivate",

  // ABAC / Policy
  ATTRIBUTE_CREATE: "attribute.create",
  ATTRIBUTE_UPDATE: "attribute.update",
  ATTRIBUTE_ACTIVATE: "attribute.activate",
  ATTRIBUTE_DEACTIVATE: "attribute.deactivate",
  ATTRIBUTE_DELETE: "attribute.delete",
  POLICY_CREATE: "policy.create",
  POLICY_UPDATE: "policy.update",
  POLICY_PREVIEW: "policy.preview",
  POLICY_ACTIVATE: "policy.activate",
  POLICY_DISABLE: "policy.disable",
  POLICY_DELETE: "abac.policy_delete",

  // Settings
  SETTINGS_UPDATE: "settings.update",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditWriteResult = { ok: true; auditEventId: string } | { ok: false; message: string };

import type { D1Binding } from "../repositories/db";
import type { SikesraRequestContext } from "../security/request-context";

// Stub: actual D1 persistence to be wired in Phase 2 repository implementation
export async function writeAuditEvent(
  db: D1Binding,
  input: AuditEventInput,
  ctx: SikesraRequestContext,
): Promise<AuditWriteResult> {
  const event: AuditEvent = {
    ...input,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    success: input.success ?? true,
    createdAt: new Date().toISOString(),
    actorId: input.actorId ?? ctx.userId,
    actorRole: input.actorRole ?? ctx.roles[0] ?? "unknown",
    requestId: input.requestId ?? ctx.requestId,
    ipAddress: input.ipAddress ?? ctx.ipAddress,
    userAgent: input.userAgent ?? ctx.userAgent,
  };

  try {
    await db.prepare(
      `INSERT INTO awcms_sikesra_audit_logs 
       (id, tenant_id, site_id, actor_id, actor_role, action, resource_type, resource_id, request_id, success, reason, before_json, after_json, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
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
      event.createdAt
    ).run();
    return { ok: true, auditEventId: event.id };
  } catch (err) {
    console.error("Audit write failed:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" };
  }
}

// High-risk actions requiring audit (future enforcement hook)
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
