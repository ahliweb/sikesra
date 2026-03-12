
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 2000 // Fail fast
});

const EMAIL = 'cms@ahliweb.com';
const TENANT_SLUG = 'primary';
const TARGET_ROLE_NAME = 'owner';

async function checkUserAndRole() {
    let client;
    try {
        client = await pool.connect();
        console.log(`--- Checking User '${EMAIL}' and Role '${TARGET_ROLE_NAME}' ---`);

        // 1. Get Tenant ID
        const tenantRes = await client.query("SELECT id FROM public.tenants WHERE slug = $1", [TENANT_SLUG]);
        if (tenantRes.rows.length === 0) {
            console.error(`Tenant '${TENANT_SLUG}' not found.`);
            return;
        }
        const tenantId = tenantRes.rows[0].id;
        console.log(`Tenant ID: ${tenantId}`);

        // 2. Check for Owner Role
        const roleRes = await client.query("SELECT id, name FROM public.roles WHERE tenant_id = $1", [tenantId]);
        console.log('Existing Roles:', roleRes.rows.map(r => r.name));

        const ownerRole = roleRes.rows.find(r => r.name.toLowerCase() === TARGET_ROLE_NAME);
        let ownerRoleId;

        if (!ownerRole) {
            console.log(`Role '${TARGET_ROLE_NAME}' does not exist.`);
        } else {
            ownerRoleId = ownerRole.id;
            console.log(`Found '${TARGET_ROLE_NAME}' Role ID: ${ownerRoleId}`);
            // Check permissions for owner role
            const permRes = await client.query("SELECT count(*) FROM public.role_permissions WHERE role_id = $1", [ownerRoleId]);
            console.log(`Owner role has ${permRes.rows[0].count} permissions.`);
        }

        // 3. Get User
        const userRes = await client.query("SELECT id, email, role FROM public.users WHERE email = $1", [EMAIL]);
        if (userRes.rows.length === 0) {
            console.error(`User '${EMAIL}' not found in public.users.`);
            return;
        }
        const user = userRes.rows[0];
        console.log(`User Found: ID=${user.id}, Current Role Field=${user.role}`);

        // 4. Check Tenant Role Links
        // Check if tenant_role_links table exists first? It should.
        const linkRes = await client.query("SELECT * FROM public.tenant_role_links WHERE user_id = $1 AND tenant_id = $2", [user.id, tenantId]);
        console.log('Current Tenant Role Links:', linkRes.rows);

        if (linkRes.rows.length > 0) {
            const linkedRoleId = linkRes.rows[0].role_id;
            const linkedRoleRes = await client.query("SELECT name FROM public.roles WHERE id = $1", [linkedRoleId]);
            if (linkedRoleRes.rows.length > 0) {
                console.log(`User is linked to role: ${linkedRoleRes.rows[0].name}`);
            }
        }

    } catch (err) {
        console.error('Error checking user/role:', err);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

checkUserAndRole();
