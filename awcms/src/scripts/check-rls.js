
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function checkRLS() {
    const client = await pool.connect();
    try {
        console.log('--- Checking RLS Policies for admin_menus ---');
        const res = await client.query(`
            SELECT policyname, cmd, roles, qual, permissive 
            FROM pg_policies 
            WHERE tablename = 'admin_menus';
        `);
        console.table(res.rows);

        console.log('\n--- Checking RLS Enablement ---');
        const rlsRes = await client.query(`
            SELECT relname, relrowsecurity 
            FROM pg_class 
            WHERE relname = 'admin_menus';
        `);
        console.table(rlsRes.rows);

    } catch (err) {
        console.error('Error checking RLS:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkRLS();
