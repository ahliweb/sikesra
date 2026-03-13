-- Decommission smandapbun tenant and related data
-- This migration soft deletes the tenant and marks all related content as deleted.

DO $$ 
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. Find the smandapbun tenant ID
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'smandapbun';

    IF v_tenant_id IS NOT NULL THEN
        -- 2. Soft delete related records
        
        -- Menus
        UPDATE public.menus SET deleted_at = now() WHERE tenant_id = v_tenant_id;
        
        -- Pages
        UPDATE public.pages SET deleted_at = now() WHERE tenant_id = v_tenant_id;
        
        -- Blogs
        UPDATE public.blogs SET deleted_at = now() WHERE tenant_id = v_tenant_id;
        
        -- Settings
        UPDATE public.settings SET deleted_at = now() WHERE tenant_id = v_tenant_id;
        
        -- Visitor Stats
        DELETE FROM public.analytics_daily WHERE tenant_id = v_tenant_id;
        DELETE FROM public.visitor_stats WHERE tenant_id = v_tenant_id;

        -- 3. Soft delete the tenant itself
        UPDATE public.tenants SET deleted_at = now() WHERE id = v_tenant_id;

        RAISE NOTICE 'Decommissioned tenant smandapbun with ID %', v_tenant_id;
    ELSE
        RAISE NOTICE 'Tenant smandapbun not found or already decommissioned.';
    END IF;
END $$;
