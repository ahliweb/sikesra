
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function listTables() {
    const client = await pool.connect();
    try {
        console.log('--- Listing Public Tables ---');
        const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
        console.log(res.rows.map(r => r.tablename).join(', '));

    } catch (err) {
        console.error('Error listing tables:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

listTables();
