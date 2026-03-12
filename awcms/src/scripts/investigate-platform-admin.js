
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function investigatePlatformAdmin() {
    const client = await pool.connect();
    try {
        console.log('--- Investigating Platform Admin Mechanisms ---');

        // 1. Check Roles table for global roles or Platform Admin specific roles
        console.log('\nChecking for Global Roles (tenant_id IS NULL):');
        const globalRoles = await client.query("SELECT * FROM public.roles WHERE tenant_id IS NULL");
        if (globalRoles.rows.length === 0) {
            console.log('No global roles found.');
        } else {
            console.log(globalRoles.rows);
        }

        // 2. Check for Platform related columns in Users (using information_schema to be sure)
        console.log('\nChecking public.users columns again:');
        const userCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public'");
        const platformCols = userCols.rows.filter(r => r.column_name.includes('admin') || r.column_name.includes('platform') || r.column_name.includes('super'));
        console.log('Potential Platform/Admin Columns:', platformCols);

        // 3. Check Tenant Types
        console.log('\nChecking Tenants for "platform" type:');
        // Check if 'type' column exists in tenants first?
        const tenantCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants' AND table_schema = 'public'");
        const hasTypeCol = tenantCols.rows.some(r => r.column_name === 'type');

        if (hasTypeCol) {
            const platformTenant = await client.query("SELECT * FROM public.tenants WHERE type = 'platform' OR is_platform = true"); // Guessing 'is_platform' potentially
            if (platformTenant.rows.length === 0) {
                console.log('No explicit platform tenant found by type.');
            } else {
                console.log('Platform Tenant:', platformTenant.rows);
            }
        } else {
            console.log('No "type" column on tenants table. Checking columns:', tenantCols.rows.map(c => c.column_name));
        }

    } catch (err) {
        console.error('Error investigating:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

investigatePlatformAdmin();
