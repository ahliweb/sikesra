
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function checkTenantPermissions() {
    const client = await pool.connect();
    try {
        console.log('--- Checking for Tenant Permissions ---');

        const res = await client.query("SELECT id, name FROM public.permissions WHERE name LIKE 'tenant%' LIMIT 50");
        console.log(`Found ${res.rows.length} tenant permissions.`);
        console.table(res.rows);

    } catch (err) {
        console.error('Error checking permissions:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTenantPermissions();
