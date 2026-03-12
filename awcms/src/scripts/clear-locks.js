
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function clearLocks() {
    const client = await pool.connect();
    try {
        console.log('Clearing active connections to release locks...');
        // Terminate all OTHER connections to this database
        const res = await client.query(`
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE pid <> pg_backend_pid() 
            AND datname = 'postgres';
        `);
        console.log(`Terminated ${res.rowCount} connections.`);
    } catch (err) {
        console.error('Error clearing locks:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

clearLocks();
