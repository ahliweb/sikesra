
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

const TENANT_SLUG = 'primary';
const ROLE_NAME = 'admin';

async function grantPermissions() {
    const client = await pool.connect();
    try {
        console.log(`--- Granting Permissions to '${ROLE_NAME}' Role in '${TENANT_SLUG}' Tenant ---`);

        // 1. Get Tenant ID
        const tenantRes = await client.query("SELECT id FROM public.tenants WHERE slug = $1", [TENANT_SLUG]);
        if (tenantRes.rows.length === 0) {
            console.error(`Tenant '${TENANT_SLUG}' not found.`);
            return;
        }
        const tenantId = tenantRes.rows[0].id;
        console.log(`Tenant ID: ${tenantId}`);

        // 2. Get Role ID
        const roleRes = await client.query("SELECT id FROM public.roles WHERE tenant_id = $1 AND name = $2", [tenantId, ROLE_NAME]);
        if (roleRes.rows.length === 0) {
            console.error(`Role '${ROLE_NAME}' not found for tenant '${TENANT_SLUG}'.`);
            return;
        }
        const roleId = roleRes.rows[0].id;
        console.log(`Role ID: ${roleId}`);

        // 3. Grant All Permissions
        // We select all permissions from `permissions` table and insert into `role_permissions`
        // avoiding duplicates.

        const grantQuery = `
            INSERT INTO public.role_permissions (role_id, permission_id)
            SELECT $1, id
            FROM public.permissions
            WHERE NOT EXISTS (
                SELECT 1 FROM public.role_permissions rp
                WHERE rp.role_id = $1 AND rp.permission_id = public.permissions.id
            );
        `;

        const grantRes = await client.query(grantQuery, [roleId]);
        console.log(`Granted ${grantRes.rowCount} new permissions to '${ROLE_NAME}' role.`);

    } catch (err) {
        console.error('Error granting permissions:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

grantPermissions();
