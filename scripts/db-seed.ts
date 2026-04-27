#!/usr/bin/env tsx
/**
 * scripts/db-seed.ts
 *
 * Seeds baseline roles and permissions for SIKESRA.
 *
 * Usage:
 *   tsx scripts/db-seed.ts
 *
 * Reads DATABASE_MIGRATION_URL (preferred) or DATABASE_URL from environment.
 * Safe to re-run — uses ON CONFLICT DO NOTHING.
 * Does NOT create user accounts or assign roles to users.
 */

import postgres from "postgres";

// ---------------------------------------------------------------------------
// Baseline roles
// ---------------------------------------------------------------------------

const ROLES = [
  {
    id: "role_superadmin",
    name: "superadmin",
    description: "Full system access. Reserved for platform administrators.",
  },
  {
    id: "role_admin",
    name: "admin",
    description: "Tenant-level administrator. Manages users, content, and config.",
  },
  {
    id: "role_operator",
    name: "operator",
    description:
      "Operational staff. Can manage beneficiary data and run workflows.",
  },
  {
    id: "role_viewer",
    name: "viewer",
    description: "Read-only access to non-sensitive reports and dashboards.",
  },
  {
    id: "role_auditor",
    name: "auditor",
    description: "Read-only access to audit logs and security events.",
  },
] as const;

// ---------------------------------------------------------------------------
// Baseline permissions
// ---------------------------------------------------------------------------

const PERMISSIONS = [
  // Users
  { id: "perm_users_read", key: "users:read", description: "View user list and profiles." },
  { id: "perm_users_create", key: "users:create", description: "Create new users." },
  { id: "perm_users_update", key: "users:update", description: "Update user profiles and status." },
  { id: "perm_users_delete", key: "users:delete", description: "Soft-delete users." },

  // Roles and permissions management
  { id: "perm_roles_manage", key: "roles:manage", description: "Create, update, delete roles." },
  { id: "perm_permissions_manage", key: "permissions:manage", description: "Create, update, delete permissions." },
  { id: "perm_user_roles_assign", key: "user_roles:assign", description: "Assign or revoke roles to/from users." },

  // Content
  { id: "perm_content_read", key: "content:read", description: "View published and draft content." },
  { id: "perm_content_create", key: "content:create", description: "Create new content entries." },
  { id: "perm_content_update", key: "content:update", description: "Update content entries." },
  { id: "perm_content_delete", key: "content:delete", description: "Soft-delete content entries." },
  { id: "perm_content_publish", key: "content:publish", description: "Publish or archive content." },

  // Files
  { id: "perm_files_upload", key: "files:upload", description: "Upload files to R2 storage." },
  { id: "perm_files_read", key: "files:read", description: "View file metadata." },
  { id: "perm_files_delete", key: "files:delete", description: "Delete files from storage." },

  // Notifications
  { id: "perm_notifications_read", key: "notifications:read", description: "View notification history and delivery logs." },
  { id: "perm_notifications_send", key: "notifications:send", description: "Trigger notification sends." },
  { id: "perm_templates_manage", key: "templates:manage", description: "Create, update, delete message templates." },

  // Audit
  { id: "perm_audit_logs_read", key: "audit_logs:read", description: "View audit logs." },

  // Security
  { id: "perm_security_read", key: "security:read", description: "View security settings and login attempts." },
  { id: "perm_security_manage", key: "security:manage", description: "Manage security settings." },

  // Religion references
  { id: "perm_religion_refs_read", key: "religion_refs:read", description: "View religion reference data." },
  { id: "perm_religion_refs_manage", key: "religion_refs:manage", description: "Manage religion reference data." },

  // Site config
  { id: "perm_site_config_read", key: "site_config:read", description: "View site configuration." },
  { id: "perm_site_config_manage", key: "site_config:manage", description: "Update site configuration." },
] as const;

// ---------------------------------------------------------------------------
// Role → permission assignments
// ---------------------------------------------------------------------------

// Superadmin gets all permissions.
const SUPERADMIN_PERMISSIONS = PERMISSIONS.map((p) => p.id);

const ADMIN_PERMISSIONS = [
  "perm_users_read", "perm_users_create", "perm_users_update", "perm_users_delete",
  "perm_user_roles_assign",
  "perm_content_read", "perm_content_create", "perm_content_update",
  "perm_content_delete", "perm_content_publish",
  "perm_files_upload", "perm_files_read", "perm_files_delete",
  "perm_notifications_read", "perm_notifications_send", "perm_templates_manage",
  "perm_audit_logs_read",
  "perm_religion_refs_read", "perm_religion_refs_manage",
  "perm_site_config_read", "perm_site_config_manage",
  "perm_security_read",
];

const OPERATOR_PERMISSIONS = [
  "perm_users_read",
  "perm_content_read", "perm_content_create", "perm_content_update",
  "perm_files_upload", "perm_files_read",
  "perm_notifications_read", "perm_notifications_send",
  "perm_religion_refs_read",
];

const VIEWER_PERMISSIONS = [
  "perm_users_read",
  "perm_content_read",
  "perm_files_read",
  "perm_notifications_read",
  "perm_religion_refs_read",
  "perm_site_config_read",
];

const AUDITOR_PERMISSIONS = [
  "perm_audit_logs_read",
  "perm_security_read",
  "perm_users_read",
];

const ROLE_PERMISSION_MAP: Record<string, readonly string[]> = {
  role_superadmin: SUPERADMIN_PERMISSIONS,
  role_admin: ADMIN_PERMISSIONS,
  role_operator: OPERATOR_PERMISSIONS,
  role_viewer: VIEWER_PERMISSIONS,
  role_auditor: AUDITOR_PERMISSIONS,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMigrationUrl(): string {
  const url =
    process.env["DATABASE_MIGRATION_URL"] ?? process.env["DATABASE_URL"];
  if (!url) {
    console.error(
      "Error: DATABASE_MIGRATION_URL or DATABASE_URL must be set.",
    );
    process.exit(1);
  }
  return url;
}

function createClient(url: string): ReturnType<typeof postgres> {
  return postgres(url, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 20,
    ssl:
      process.env["NODE_ENV"] === "production"
        ? { rejectUnauthorized: false }
        : undefined,
    onnotice: () => {},
  });
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  const url = getMigrationUrl();
  const sql = createClient(url);

  try {
    console.log("Seeding baseline roles…");
    for (const role of ROLES) {
      await sql`
        insert into public.roles (id, name, description, created_at, updated_at)
        values (${role.id}, ${role.name}, ${role.description}, now(), now())
        on conflict (id) do update
          set name = excluded.name,
              description = excluded.description,
              updated_at = now()
      `;
      console.log(`  [role] ${role.name}`);
    }

    console.log("Seeding baseline permissions…");
    for (const perm of PERMISSIONS) {
      await sql`
        insert into public.permissions (id, key, description, created_at, updated_at)
        values (${perm.id}, ${perm.key}, ${perm.description}, now(), now())
        on conflict (id) do update
          set key = excluded.key,
              description = excluded.description,
              updated_at = now()
      `;
      console.log(`  [permission] ${perm.key}`);
    }

    console.log("Assigning permissions to roles…");
    for (const [roleId, permIds] of Object.entries(ROLE_PERMISSION_MAP)) {
      for (const permId of permIds) {
        await sql`
          insert into public.role_permissions (role_id, permission_id, granted_at)
          values (${roleId}, ${permId}, now())
          on conflict (role_id, permission_id) do nothing
        `;
      }
      console.log(`  [role_permissions] ${roleId} → ${permIds.length} permissions`);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          roles: ROLES.length,
          permissions: PERMISSIONS.length,
          assignments: Object.values(ROLE_PERMISSION_MAP).reduce(
            (acc, v) => acc + v.length,
            0,
          ),
        },
        null,
        2,
      ),
    );
    process.exit(0);
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  } finally {
    await sql.end();
  }
}

await seed();
