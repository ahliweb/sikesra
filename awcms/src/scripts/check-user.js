
import pg from 'pg';

// Default local Supabase connection
const connectionString = process.env.DATABASE_URL
    || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const { Pool } = pg;
const pool = new Pool({ connectionString });

async function checkUser() {
    console.log('Connecting to DB...');
    const client = await pool.connect();

    try {
        const res = await client.query("SELECT id, email, encrypted_password FROM auth.users WHERE email = 'cms@ahliweb.com'");

        if (res.rows.length > 0) {
            console.log('User found:', res.rows[0]);
        } else {
            console.log('User cms@ahliweb.com NOT FOUND');
        }

    } catch (err) {
        console.error('Error checking user:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkUser();
