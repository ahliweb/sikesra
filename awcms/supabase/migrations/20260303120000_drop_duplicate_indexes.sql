-- ============================================================================
-- Migration: Remove duplicate indexes flagged by Performance Advisor
-- Date: 2026-03-03
--
-- regions: idx_regions_parent and idx_regions_parent_id both index parent_id
-- users:   idx_users_region and idx_users_region_id both index region_id
-- ============================================================================

-- Drop the older/less-descriptively-named duplicate indexes
DROP INDEX IF EXISTS public.idx_regions_parent;
DROP INDEX IF EXISTS public.idx_users_region;
