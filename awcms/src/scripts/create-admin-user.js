
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Default local Supabase connection
const connectionString = process.env.DATABASE_URL
    || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const { Pool } = pg;
const pool = new Pool({ connectionString });

async function createAdminUser() {
    console.log('Connecting to DB...');
    const client = await pool.connect();

    try {
        // 1. Get Tenant ID
        const tenantRes = await client.query("SELECT id FROM public.tenants WHERE slug = 'primary'");
        if (tenantRes.rows.length === 0) {
            console.error('Primary tenant not found. Please run seed-primary-tenant.js first.');
            process.exit(1);
        }
        const tenantId = tenantRes.rows[0].id;

        // 2. Get Admin Role ID
        const roleRes = await client.query("SELECT id FROM public.roles WHERE name = 'admin' AND tenant_id = $1", [tenantId]);
        let roleId;
        if (roleRes.rows.length === 0) {
            console.log('Admin role not found for tenant, creating one...');
            const newRole = await client.query("INSERT INTO public.roles (name, description, tenant_id, is_system) VALUES ('admin', 'System Admin', $1, true) RETURNING id", [tenantId]);
            roleId = newRole.rows[0].id;
        } else {
            roleId = roleRes.rows[0].id;
        }

        // 3. Create User in auth.users
        const email = 'cms@ahliweb.com';
        const password = 'password123'; // Default password
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();

        console.log(`Creating user ${email}...`);

        // Insert into auth.users is tricky because of triggers, but we are superuser here.
        // We need to insert into auth.users directly.
        const userRes = await client.query(`
      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change_token_current,
        email_change,
        phone_change,
        reauthentication_token,
        phone_change_token,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin
      ) VALUES (
        $1,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        $2,
        $3,
        NOW(),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "System Admin"}',
        false
      )
      RETURNING id
    `, [userId, email, hashedPassword]);

        console.log('User created in auth.users:', userRes.rows[0].id);

        // 4. Insert into public.users (Profile)
        // Triggers might handle this, but let's be safe and check/insert if needed.
        // Actually, usually a trigger on auth.users creates public.users.
        // Let's check if it exists.
        const profileCheck = await client.query("SELECT id FROM public.users WHERE id = $1", [userId]);

        if (profileCheck.rows.length === 0) {
            console.log('Creating public profile...');
            await client.query(`
            INSERT INTO public.users (id, email, full_name, role_id, tenant_id, status)
            VALUES ($1, $2, 'System Admin', $3, $4, 'active')
        `, [userId, email, roleId, tenantId]);
        } else {
            console.log('Public profile already exists, updating role/tenant...');
            await client.query(`
            UPDATE public.users SET role_id = $1, tenant_id = $2 WHERE id = $3
        `, [roleId, tenantId, userId]);
        }

        console.log(`\nSUCCESS! \nUser: ${email}\nPassword: ${password}\n`);

    } catch (err) {
        if (err.code === '23505') { // Unique violation
            console.log('User already exists in auth.users. Resetting password...');
            const newPass = await bcrypt.hash('password123', 10);
            await client.query("UPDATE auth.users SET encrypted_password = $1 WHERE email = 'cms@ahliweb.com'", [newPass]);
            console.log(`Password reset to: password123`);
        } else {
            console.error('Error creating user:', err);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

createAdminUser();
