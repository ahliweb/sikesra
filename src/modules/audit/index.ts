/**
 * Audit log writer.
 * Issue: ahliweb/sikesra#65
 *
 * Writes structured audit entries to the audit_logs table.
 * Sensitive payloads must be pre-scrubbed before passing to writeAuditLog —
 * never pass raw NIK, KIA, No KK, passwords, tokens, or health data.
 */

import { getPool } from "../../db/client.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.restore"
  | "role.assign"
  | "role.revoke"
  | "permission.grant"
  | "permission.revoke"
  | "two_factor.enable"
  | "two_factor.disable"
  | "two_factor.recovery_codes_regenerated"
  | "file.delete"
  | "settings.change"
  | "login.success"
  | "login.failure"
  | "logout";

export interface AuditEntry {
  /** UUID of the acting user. Null for system/unauthenticated actions. */
  actorId: string | null;
  action: AuditAction;
  /** e.g. "user", "role", "file", "settings" */
  resourceType: string;
  /** UUID of the target resource. */
  resourceId: string | null;
  /**
   * Safe, pre-scrubbed subset of the payload.
   * Must NOT contain passwords, tokens, NIK, KIA, No KK, health data,
   * or any other sensitive personal data.
   */
  payloadSafe?: Record<string, unknown>;
}

// ── Writer ────────────────────────────────────────────────────────────────────

/**
 * Persist an audit log entry.
 * Errors are logged to stderr and swallowed — audit failures must never
 * break the primary operation.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const pool = getPool();
    await pool`
      insert into public.audit_logs
        (actor_id, action, resource_type, resource_id, payload_safe, created_at)
      values (
        ${entry.actorId},
        ${entry.action},
        ${entry.resourceType},
        ${entry.resourceId},
        ${entry.payloadSafe ? JSON.stringify(entry.payloadSafe) : null},
        now()
      )
    `;
  } catch (err) {
    // Audit write failures must not surface to callers.
    console.error("[audit] Failed to write audit log:", err);
  }
}
