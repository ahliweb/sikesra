
import pg from 'pg';

const connectionString = process.env.DATABASE_URL
    || 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString });

async function checkSidebar() {
    const client = await pool.connect();
    try {
        console.log('--- Checking Primary Tenant ---');
        const tenantRes = await client.query("SELECT id, name FROM public.tenants WHERE slug = 'primary'");
        if (tenantRes.rows.length === 0) {
            console.log('Primary tenant not found!');
            return;
        }
        const tenantId = tenantRes.rows[0].id;
        console.log(`Tenant ID: ${tenantId}`);

        console.log('\n--- Checking Admin Menus ---');
        const menusRes = await client.query("SELECT id, label, key, group_label, tenant_id FROM public.admin_menus WHERE tenant_id = $1 OR tenant_id IS NULL", [tenantId]);
        console.log(`Found ${menusRes.rows.length} menu items (Tenant + Global).`);
        if (menusRes.rows.length > 0) {
            console.table(menusRes.rows.map(r => ({ ...r, type: r.tenant_id ? 'Tenant' : 'Global' })));
        } else {
            console.log('No menu items found.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSidebar();
