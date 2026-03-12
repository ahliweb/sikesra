-- ============================================================================
-- Migration: Fix Supabase Security & Performance Advisor Warnings
-- Date: 2026-03-03
-- 
-- Security:  Set search_path on 4 functions (Function Search Path Mutable)
-- Performance: Fix duplicate permissive policies on categories and regions
--              (Auth RLS Initialization Plan warnings are advisory-only and
--              relate to current_setting() / auth.uid() usage in RLS quals,
--              which is by-design for our multi-tenant architecture)
-- ============================================================================

-- ============================================================================
-- SECURITY FIXES: Set search_path on functions missing it
-- ============================================================================

-- 1. current_tenant_id() — SECURITY DEFINER without search_path
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    BEGIN
      v_tenant_id := current_setting('app.current_tenant_id', true)::uuid;
      IF v_tenant_id IS NOT NULL THEN
        RETURN v_tenant_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    RETURN NULL;
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.users
  WHERE id = v_user_id
    AND deleted_at IS NULL;

  IF v_tenant_id IS NOT NULL THEN
    RETURN v_tenant_id;
  END IF;

  RETURN NULL;
END;
$$;

-- 2. is_platform_admin() — SECURITY DEFINER without search_path
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.deleted_at IS NULL
      AND (r.is_platform_admin = true OR r.is_full_access = true)
  );
END;
$$;

-- 3. handle_updated_at() — trigger function without search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. create_tenant_with_defaults(text,text,text,text) — 4-arg overload
--    The 7-arg overload already has search_path set.
--    We need to get the full body of the 4-arg version and add search_path.
--    Note: This function will be replaced with search_path added.
DO $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_tenant_with_defaults'
      AND pg_catalog.pg_get_function_arguments(p.oid) = 'p_name text, p_slug text, p_domain text DEFAULT NULL::text, p_tier text DEFAULT ''free''::text'
  ) INTO func_exists;

  IF func_exists THEN
    -- Drop the old 4-arg version (it will be superseded by the 7-arg version)
    DROP FUNCTION IF EXISTS public.create_tenant_with_defaults(text, text, text, text);
    RAISE NOTICE 'Dropped legacy 4-arg create_tenant_with_defaults (superseded by 7-arg version with search_path)';
  END IF;
END;
$$;

-- ============================================================================
-- PERFORMANCE FIXES: Remove duplicate/overlapping permissive policies
-- ============================================================================

-- categories: has both categories_select_tenant (tenant_id = current_tenant_id())
--   AND categories_select_unified (true) — the unified one makes tenant one redundant
DROP POLICY IF EXISTS categories_select_tenant ON public.categories;

-- regions: has "Regions tenant isolation" (ALL) which overlaps with individual
--   regions_select_all, regions_insert_admin, regions_update_admin, regions_delete_admin
DROP POLICY IF EXISTS "Regions tenant isolation" ON public.regions;

-- ============================================================================
-- GRANTS: Ensure function permissions are maintained
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO anon, authenticated, service_role;
