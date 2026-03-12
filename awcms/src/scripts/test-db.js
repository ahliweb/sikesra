
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString, connectionTimeoutMillis: 2000 });

async function testDb() {
    console.log('Testing DB connection...');
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT 1 as val');
        console.log('DB Connection Successful:', res.rows[0]);
    } catch (err) {
        console.error('DB Connection Failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

testDb();
