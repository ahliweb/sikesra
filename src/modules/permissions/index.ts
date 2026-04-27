/**
 * Permissions module — repository layer.
 * Issue: ahliweb/sikesra#65
 */

import { getPool } from "../../db/client.js";
import { PERMISSION_KEYS, type PermissionKey } from "../../api/middleware/abac.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Permission {
  id: string;
  key: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ── Repository ────────────────────────────────────────────────────────────────

export async function listPermissions(): Promise<Permission[]> {
  const pool = getPool();
  const rows = await pool<Permission[]>`
    select id, key, description, created_at, updated_at
    from public.permissions
    order by key
  `;
  return rows;
}

export async function getPermissionByKey(
  key: PermissionKey,
): Promise<Permission | null> {
  const pool = getPool();
  const rows = await pool<Permission[]>`
    select id, key, description, created_at, updated_at
    from public.permissions
    where key = ${key}
    limit 1
  `;
  return rows[0] ?? null;
}

/**
 * Ensure all well-known permission keys exist in the DB.
 * Safe to call on startup — uses on conflict do nothing.
 */
export async function seedPermissionKeys(): Promise<void> {
  const pool = getPool();
  const descriptions: Record<PermissionKey, string> = {
    "users.read": "View user list and profiles",
    "users.create": "Create new users",
    "users.update": "Update user details",
    "users.delete": "Soft-delete users",
    "roles.manage": "Create, update and assign roles",
    "files.upload": "Upload files to R2",
    "files.read": "Read/download files",
    "files.delete": "Delete files from R2",
    "content.read": "Read content items",
    "content.create": "Create new content",
    "content.update": "Update existing content",
    "content.publish": "Publish or unpublish content",
    "audit.read": "Read audit logs",
    "settings.manage": "Change application settings",
    "notifications.send": "Send notification messages",
    "notifications.read": "Read notification history",
    "notifications.manage_templates": "Create/update notification templates",
    "notifications.read_delivery_logs": "Read delivery log details",
    "integrations.mailketing.manage": "Configure Mailketing integration",
    "integrations.starsender.manage": "Configure Starsender integration",
  };

  for (const key of PERMISSION_KEYS) {
    await pool`
      insert into public.permissions (key, description)
      values (${key}, ${descriptions[key]})
      on conflict (key) do nothing
    `;
  }
}
