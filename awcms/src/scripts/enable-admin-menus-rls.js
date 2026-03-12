
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function enableRLS() {
    const client = await pool.connect();
    try {
        console.log('Enabling RLS Policy for admin_menus...');

        // 1. Policy for viewing menus
        // Allow users to see global menus (tenant_id IS NULL) OR their own tenant's menus
        // Note: We need to cast tenant_id to uuid if it's not already, but it should be.
        // The auth.jwt() ->> 'tenant_id' returns text, so we cast it.
        const policyQuery = `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE tablename = 'admin_menus' 
                    AND policyname = 'Enable read access for authenticated users'
                ) THEN
                    CREATE POLICY "Enable read access for authenticated users" ON "public"."admin_menus"
                    AS PERMISSIVE FOR SELECT
                    TO authenticated
                    USING (
                        (tenant_id IS NULL) OR 
                        (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
                    );
                END IF;
            END
            $$;
        `;

        await client.query(policyQuery);
        console.log('Policy created/verified.');

    } catch (err) {
        console.error('Error enabling RLS:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

enableRLS();
