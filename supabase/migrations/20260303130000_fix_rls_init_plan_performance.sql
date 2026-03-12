-- ============================================================================
-- Migration: Fix Auth RLS Initialization Plan warnings
-- Date: 2026-03-03
--
-- The Supabase Performance Advisor flags RLS policies where calls to
-- current_setting(), auth.uid(), current_tenant_id(), is_platform_admin()
-- are evaluated per-row instead of once per statement.
--
-- Fix: Wrap these function calls in (SELECT ...) subselects so PostgreSQL
-- treats them as InitPlan constants evaluated once per statement.
--
-- Affected tables: blogs (4 policies), users (2 policies), user_profiles (3 policies)
-- ============================================================================

-- ============================================================================
-- BLOGS POLICIES
-- ============================================================================

-- blogs_select: wrap current_tenant_id(), is_platform_admin(), auth.uid()
DROP POLICY IF EXISTS blogs_select ON public.blogs;
CREATE POLICY blogs_select ON public.blogs
  FOR SELECT
  USING (
    status = 'published'
    OR tenant_id = (SELECT current_tenant_id())
    OR (SELECT is_platform_admin())
    OR EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = (SELECT auth.uid())
        AND r.is_full_access = true
    )
  );

-- blogs_insert: no qual change needed (WITH CHECK only)
DROP POLICY IF EXISTS blogs_insert ON public.blogs;
CREATE POLICY blogs_insert ON public.blogs
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT current_tenant_id())
    OR (SELECT is_platform_admin())
    OR EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = (SELECT auth.uid())
        AND r.is_full_access = true
    )
  );

-- blogs_update: wrap in both USING and WITH CHECK
DROP POLICY IF EXISTS blogs_update ON public.blogs;
CREATE POLICY blogs_update ON public.blogs
  FOR UPDATE
  USING (
    tenant_id = (SELECT current_tenant_id())
    OR (SELECT is_platform_admin())
    OR EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = (SELECT auth.uid())
        AND r.is_full_access = true
    )
  )
  WITH CHECK (
    tenant_id = (SELECT current_tenant_id())
    OR (SELECT is_platform_admin())
    OR EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = (SELECT auth.uid())
        AND r.is_full_access = true
    )
  );

-- blogs_delete: wrap function calls
DROP POLICY IF EXISTS blogs_delete ON public.blogs;
CREATE POLICY blogs_delete ON public.blogs
  FOR DELETE
  USING (
    tenant_id = (SELECT current_tenant_id())
    OR (SELECT is_platform_admin())
    OR EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = (SELECT auth.uid())
        AND r.is_full_access = true
    )
  );

-- ============================================================================
-- USERS POLICIES
-- ============================================================================

-- users_select_hierarchy: wrap function calls
DROP POLICY IF EXISTS users_select_hierarchy ON public.users;
CREATE POLICY users_select_hierarchy ON public.users
  FOR SELECT
  USING (
    tenant_id = (SELECT current_tenant_id())
    OR tenant_can_access_resource(tenant_id, 'users', 'read')
    OR (SELECT is_platform_admin())
  );

-- users_update_hierarchy: wrap function calls
DROP POLICY IF EXISTS users_update_hierarchy ON public.users;
CREATE POLICY users_update_hierarchy ON public.users
  FOR UPDATE
  USING (
    (SELECT is_platform_admin())
    OR (
      tenant_id = (SELECT current_tenant_id())
      AND (
        id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.role_permissions rp
          JOIN public.permissions p ON p.id = rp.permission_id
          JOIN public.users u ON u.role_id = rp.role_id
          WHERE u.id = (SELECT auth.uid())
            AND u.tenant_id = (SELECT current_tenant_id())
            AND p.name = 'tenant.user.update'
        )
      )
    )
    OR tenant_can_access_resource(tenant_id, 'users', 'write')
  )
  WITH CHECK (
    (SELECT is_platform_admin())
    OR (
      tenant_id = (SELECT current_tenant_id())
      AND (
        id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.role_permissions rp
          JOIN public.permissions p ON p.id = rp.permission_id
          JOIN public.users u ON u.role_id = rp.role_id
          WHERE u.id = (SELECT auth.uid())
            AND u.tenant_id = (SELECT current_tenant_id())
            AND p.name = 'tenant.user.update'
        )
      )
    )
    OR tenant_can_access_resource(tenant_id, 'users', 'write')
  );

-- ============================================================================
-- USER_PROFILES POLICIES
-- ============================================================================

-- user_profiles_select_self_or_admin: wrap function calls
DROP POLICY IF EXISTS user_profiles_select_self_or_admin ON public.user_profiles;
CREATE POLICY user_profiles_select_self_or_admin ON public.user_profiles
  FOR SELECT
  USING (
    (SELECT is_platform_admin())
    OR tenant_can_access_resource(tenant_id, 'users', 'read')
    OR (
      tenant_id = (SELECT current_tenant_id())
      AND (
        user_id = (SELECT auth.uid())
        OR (SELECT is_admin_or_above())
        OR (SELECT has_permission('tenant.user.update'))
      )
    )
  );

-- user_profiles_insert_self_or_admin: wrap function calls
DROP POLICY IF EXISTS user_profiles_insert_self_or_admin ON public.user_profiles;
CREATE POLICY user_profiles_insert_self_or_admin ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    (SELECT is_platform_admin())
    OR tenant_can_access_resource(tenant_id, 'users', 'write')
    OR (
      tenant_id = (SELECT current_tenant_id())
      AND (
        user_id = (SELECT auth.uid())
        OR (SELECT is_admin_or_above())
        OR (SELECT has_permission('tenant.user.update'))
      )
    )
  );

-- user_profiles_update_self_or_admin: wrap function calls
DROP POLICY IF EXISTS user_profiles_update_self_or_admin ON public.user_profiles;
CREATE POLICY user_profiles_update_self_or_admin ON public.user_profiles
  FOR UPDATE
  USING (
    (SELECT is_platform_admin())
    OR tenant_can_access_resource(tenant_id, 'users', 'write')
    OR (
      tenant_id = (SELECT current_tenant_id())
      AND (
        user_id = (SELECT auth.uid())
        OR (SELECT is_admin_or_above())
        OR (SELECT has_permission('tenant.user.update'))
      )
    )
  )
  WITH CHECK (
    (SELECT is_platform_admin())
    OR tenant_can_access_resource(tenant_id, 'users', 'write')
    OR (
      tenant_id = (SELECT current_tenant_id())
      AND (
        user_id = (SELECT auth.uid())
        OR (SELECT is_admin_or_above())
        OR (SELECT has_permission('tenant.user.update'))
      )
    )
  );
