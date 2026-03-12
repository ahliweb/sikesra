
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function listPermissions() {
    const client = await pool.connect();
    try {
        console.log('--- Listing Available Permissions ---');

        const res = await client.query("SELECT id, name, resource, action, module FROM public.permissions LIMIT 50");
        console.table(res.rows);

    } catch (err) {
        console.error('Error listing permissions:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

listPermissions();
