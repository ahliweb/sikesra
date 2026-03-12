
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function inspectAuth() {
    const client = await pool.connect();
    try {
        console.log('--- User Record ---');
        const res = await client.query("SELECT * FROM auth.users WHERE email = 'cms@ahliweb.com'");
        console.log(res.rows[0]);

        console.log('\n--- Column Types ---');
        const types = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'auth' AND table_name = 'users'
    `);
        types.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable})`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

inspectAuth();
