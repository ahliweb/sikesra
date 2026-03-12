
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenant() {
    console.log('Checking for tenant with slug "primary"...');
    const { data, error } = await supabase.rpc('get_tenant_by_domain', { lookup_domain: 'primary' });

    if (error) {
        console.error('Error fetching tenant:', error);
    } else {
        console.log('Tenant Result:', data);
    }

    // Also verify what tenants exist generally if possible (RLS might block this with pub key)
    // Trying with Service Role Key if available in env for this script
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (secretKey) {
        const adminSupabase = createClient(supabaseUrl, secretKey);
        const { data: tenants, error: listError } = await adminSupabase.from('tenants').select('*');
        if (listError) {
            console.error('Error listing tenants with secret key:', listError);
        } else {
            console.log('All Tenants (via Secret Key):', tenants);
        }
    } else {
        console.log('No SUPABASE_SECRET_KEY found, skipping admin list.');
    }
}

checkTenant();
