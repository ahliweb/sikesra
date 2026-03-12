-- Migration: Seed SIKESRA Permission Family
-- Objective: Create the full SIKESRA permission family following scope.resource.action pattern
-- Authority: docs/product/PRD.md, AGENTS.md

DO $$
DECLARE
  perm record;
  action text;
  permission_name text;
  v_perm_id uuid;
  v_owner_role_id uuid;
  v_super_admin_role_id uuid;
  v_admin_role_id uuid;
  v_editor_role_id uuid;
  v_author_role_id uuid;
BEGIN
  SELECT id INTO v_owner_role_id FROM public.roles WHERE name = 'owner' LIMIT 1;
  SELECT id INTO v_super_admin_role_id FROM public.roles WHERE name = 'super_admin' LIMIT 1;
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;
  SELECT id INTO v_editor_role_id FROM public.roles WHERE name = 'editor' LIMIT 1;
  SELECT id INTO v_author_role_id FROM public.roles WHERE name = 'author' LIMIT 1;

  -- SIKESRA Permission Family
  -- Format: tenant.sikesra_<resource>.<action>
  FOR perm IN
    SELECT * FROM (VALUES
      -- Entity Permissions
      ('tenant.sikesra_entity', 'sikesra_entity', 'sikesra', ARRAY['create', 'read', 'update', 'update_own', 'publish', 'delete', 'restore', 'permanent_delete']),
      
      -- Micro Region Permissions
      ('tenant.sikesra_micro_region', 'sikesra_micro_region', 'sikesra', ARRAY['create', 'read', 'update', 'delete']),
      
      -- Document Permissions
      ('tenant.sikesra_document', 'sikesra_document', 'sikesra', ARRAY['create', 'read', 'update', 'delete', 'verify']),
      
      -- Submission Permissions
      ('tenant.sikesra_submission', 'sikesra_submission', 'sikesra', ARRAY['submit', 'read', 'update', 'withdraw']),
      
      -- Verification Permissions (Level-Specific)
      ('tenant.sikesra_verification', 'sikesra_verification', 'sikesra', ARRAY['verify_kecamatan', 'verify_kabupaten', 'validate_instansi', 'read', 'update']),
      
      -- Approval Permissions
      ('tenant.sikesra_approval', 'sikesra_approval', 'sikesra', ARRAY['approve', 'reject', 'read', 'update']),
      
      -- Audit Permissions
      ('tenant.sikesra_audit', 'sikesra_audit', 'sikesra', ARRAY['read', 'export']),
      
      -- Report Permissions
      ('tenant.sikesra_report', 'sikesra_report', 'sikesra', ARRAY['read', 'export']),
      
      -- Dashboard Permissions
      ('tenant.sikesra_dashboard', 'sikesra_dashboard', 'sikesra', ARRAY['read'])
      
    ) AS t(prefix, resource, module, actions)
  LOOP
    FOREACH action IN ARRAY perm.actions LOOP
      permission_name := perm.prefix || '.' || action;

      INSERT INTO public.permissions (name, description, resource, action, module)
      VALUES (
        permission_name,
        'SIKESRA permission: ' || permission_name,
        perm.resource,
        action,
        perm.module
      )
      ON CONFLICT (name) DO UPDATE SET
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        module = EXCLUDED.module
      RETURNING id INTO v_perm_id;

      -- Assign to roles based on permission type
      
      -- Owner/Super Admin get all permissions
      IF v_owner_role_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (v_owner_role_id, v_perm_id)
        ON CONFLICT DO NOTHING;
      END IF;

      IF v_super_admin_role_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (v_super_admin_role_id, v_perm_id)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Admin gets most permissions except permanent_delete
      IF v_admin_role_id IS NOT NULL AND action NOT IN ('permanent_delete', 'export') THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (v_admin_role_id, v_perm_id)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Editor gets verification and read permissions
      IF v_editor_role_id IS NOT NULL AND action IN ('read', 'verify_kecamatan', 'verify_kabupaten', 'validate_instansi', 'update') THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (v_editor_role_id, v_perm_id)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Author gets create, read, update_own, submit permissions
      IF v_author_role_id IS NOT NULL AND action IN ('create', 'read', 'update_own', 'submit', 'withdraw') THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (v_author_role_id, v_perm_id)
        ON CONFLICT DO NOTHING;
      END IF;

    END LOOP;
  END LOOP;

  -- Log the seeding
  RAISE NOTICE 'SIKESRA permission family seeded successfully';
END
$$;
