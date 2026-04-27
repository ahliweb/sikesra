/**
 * Roles module — repository layer.
 * Issue: ahliweb/sikesra#65
 */

import { getPool } from "../../db/client.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: string[];
}

// ── Repository ────────────────────────────────────────────────────────────────

export async function listRoles(): Promise<Role[]> {
  const pool = getPool();
  const rows = await pool<Role[]>`
    select id, name, description, created_at, updated_at
    from public.roles
    order by name
  `;
  return rows;
}

export async function getRoleById(id: string): Promise<Role | null> {
  const pool = getPool();
  const rows = await pool<Role[]>`
    select id, name, description, created_at, updated_at
    from public.roles
    where id = ${id}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function getRoleWithPermissions(
  roleId: string,
): Promise<RoleWithPermissions | null> {
  const pool = getPool();
  const rows = await pool<Role[]>`
    select id, name, description, created_at, updated_at
    from public.roles
    where id = ${roleId}
    limit 1
  `;
  const role = rows[0];
  if (!role) return null;

  const permRows = await pool<{ key: string }[]>`
    select p.key
    from public.permissions p
    join public.role_permissions rp on rp.permission_id = p.id
    where rp.role_id = ${roleId}
    order by p.key
  `;
  return { ...role, permissions: permRows.map((r: { key: string }) => r.key) };
}

export async function getPermissionsForRoles(
  roleIds: string[],
): Promise<string[]> {
  if (roleIds.length === 0) return [];
  const pool = getPool();
  const rows = await pool<{ key: string }[]>`
    select distinct p.key
    from public.permissions p
    join public.role_permissions rp on rp.permission_id = p.id
    where rp.role_id = any(${roleIds})
    order by p.key
  `;
  return rows.map((r: { key: string }) => r.key);
}

export async function createRole(
  name: string,
  description: string | null,
  actorId: string,
): Promise<Role> {
  const pool = getPool();
  const rows = await pool<Role[]>`
    insert into public.roles (name, description, created_by, updated_by)
    values (${name}, ${description}, ${actorId}, ${actorId})
    returning id, name, description, created_at, updated_at
  `;
  return rows[0]!;
}

export async function assignPermissionToRole(
  roleId: string,
  permissionId: string,
  actorId: string,
): Promise<void> {
  const pool = getPool();
  await pool`
    insert into public.role_permissions (role_id, permission_id, granted_by)
    values (${roleId}, ${permissionId}, ${actorId})
    on conflict do nothing
  `;
}

export async function getRolesForUser(userId: string): Promise<Role[]> {
  const pool = getPool();
  const rows = await pool<Role[]>`
    select r.id, r.name, r.description, r.created_at, r.updated_at
    from public.roles r
    join public.user_roles ur on ur.role_id = r.id
    where ur.user_id = ${userId}
    order by r.name
  `;
  return rows;
}
