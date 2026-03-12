
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function viewActivity() {
    const client = await pool.connect();
    try {
        console.log('Checking active queries...');
        const res = await client.query(`
            SELECT pid, state, query_start, query 
            FROM pg_stat_activity 
            WHERE state <> 'idle' 
            AND pid <> pg_backend_pid()
            ORDER BY query_start ASC;
        `);
        if (res.rows.length === 0) {
            console.log('No active queries found.');
        } else {
            console.table(res.rows);
        }
    } catch (err) {
        console.error('Error viewing activity:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

viewActivity();
