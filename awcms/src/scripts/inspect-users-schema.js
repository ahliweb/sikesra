
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function inspectUsersSchema() {
    const client = await pool.connect();
    try {
        console.log('--- Inspecting users Schema ---');
        const res = await client.query("SELECT * FROM public.users LIMIT 1");
        if (res.rows.length === 0) {
            console.log('Table is empty. Checking columns via information_schema...');
            const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
            console.log('Columns:', cols.rows.map(r => r.column_name));
        } else {
            console.log('Columns:', Object.keys(res.rows[0]));
        }

    } catch (err) {
        console.error('Error inspecting schema:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

inspectUsersSchema();
