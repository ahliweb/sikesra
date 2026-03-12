
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function debugPermissions() {
    const client = await pool.connect();
    try {
        console.log('--- Inspecting Permissions Schema ---');

        // Check permissions table columns
        const permSchema = await client.query("SELECT * FROM public.permissions LIMIT 1");
        if (permSchema.rows.length > 0) {
            console.log('Permissions Table Columns:', Object.keys(permSchema.rows[0]));
        } else {
            console.log('Permissions table is empty.');
            // Check columns via information_schema
            const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'permissions'");
            console.log('Permissions Table Columns (Metadata):', cols.rows.map(r => r.column_name));
        }

        const roleId = '7a7a7362-dc9a-4251-8086-0b1691fb49fc'; // Hardcoded from previous run

        console.log('\n--- Checking Role Permissions (Raw) ---');
        const rpRes = await client.query(`
            SELECT * FROM public.role_permissions WHERE role_id = $1 LIMIT 5
        `, [roleId]);
        console.table(rpRes.rows);

        // If we know the permission column name (e.g. 'name' or 'key'), we can join.
        // Let's guess 'name' if 'slug' failed.

    } catch (err) {
        console.error('Error debugging permissions:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

debugPermissions();
