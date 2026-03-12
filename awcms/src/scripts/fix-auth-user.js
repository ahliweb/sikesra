
import pg from 'pg';

// Default local Supabase connection
const connectionString = process.env.DATABASE_URL
    || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const { Pool } = pg;
const pool = new Pool({ connectionString });

async function fixAuthUser() {
    console.log('Connecting to DB...');
    const client = await pool.connect();

    try {
        console.log('Setting confirmation_token to empty string for cms@ahliweb.com...');

        // Also setting other tokens to empty string just in case, typical Go scanning issue with NULLs
        await client.query(`
      UPDATE auth.users 
      SET 
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change_token_current = '',
        email_change = '',
        phone_change = '',
        reauthentication_token = '',
        phone_change_token = ''
      WHERE email = 'cms@ahliweb.com'
    `);

        console.log('Update complete.');

    } catch (err) {
        console.error('Error fixing user:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

fixAuthUser();
