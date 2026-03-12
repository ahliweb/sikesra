-- Migration: SIKESRA RLS Policies
-- Objective: Implement Row Level Security for SIKESRA tables
-- Authority: docs/product/PRD.md, AGENTS.md

SET client_min_messages TO warning;

-- ============================================================================
-- 1. SIKESRA Entity Types RLS (Reference data - mostly readable)
-- ============================================================================

DROP POLICY IF EXISTS "sikesra_entity_types_select_all" ON public.sikesra_entity_types;
CREATE POLICY "sikesra_entity_types_select_all" ON public.sikesra_entity_types
  FOR SELECT
  USING (is_active = true OR public.is_platform_admin());

DROP POLICY IF EXISTS "sikesra_entity_types_insert_admin" ON public.sikesra_entity_types;
CREATE POLICY "sikesra_entity_types_insert_admin" ON public.sikesra_entity_types
  FOR INSERT
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "sikesra_entity_types_update_admin" ON public.sikesra_entity_types;
CREATE POLICY "sikesra_entity_types_update_admin" ON public.sikesra_entity_types
  FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "sikesra_entity_types_delete_admin" ON public.sikesra_entity_types;
CREATE POLICY "sikesra_entity_types_delete_admin" ON public.sikesra_entity_types
  FOR DELETE
  USING (public.is_platform_admin());

-- ============================================================================
-- 2. SIKESRA Micro Regions RLS
-- ============================================================================

DROP POLICY IF EXISTS "sikesra_micro_regions_select_tenant" ON public.sikesra_micro_regions;
CREATE POLICY "sikesra_micro_regions_select_tenant" ON public.sikesra_micro_regions
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "sikesra_micro_regions_insert_tenant" ON public.sikesra_micro_regions;
CREATE POLICY "sikesra_micro_regions_insert_tenant" ON public.sikesra_micro_regions
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_permission('tenant.sikesra_micro_region.create')
  );

DROP POLICY IF EXISTS "sikesra_micro_regions_update_tenant" ON public.sikesra_micro_regions;
CREATE POLICY "sikesra_micro_regions_update_tenant" ON public.sikesra_micro_regions
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
    AND public.has_permission('tenant.sikesra_micro_region.update')
  )
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "sikesra_micro_regions_delete_tenant" ON public.sikesra_micro_regions;
CREATE POLICY "sikesra_micro_regions_delete_tenant" ON public.sikesra_micro_regions
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
    AND public.has_permission('tenant.sikesra_micro_region.delete')
  );

-- ============================================================================
-- 3. SIKESRA Entities RLS (Core)
-- ============================================================================

DROP POLICY IF EXISTS "sikesra_entities_select_tenant" ON public.sikesra_entities;
CREATE POLICY "sikesra_entities_select_tenant" ON public.sikesra_entities
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "sikesra_entities_insert_tenant" ON public.sikesra_entities;
CREATE POLICY "sikesra_entities_insert_tenant" ON public.sikesra_entities
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_permission('tenant.sikesra_entity.create')
  );

DROP POLICY IF EXISTS "sikesra_entities_update_tenant" ON public.sikesra_entities;
CREATE POLICY "sikesra_entities_update_tenant" ON public.sikesra_entities
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
    AND (
      public.has_permission('tenant.sikesra_entity.update')
      OR (
        public.has_permission('tenant.sikesra_entity.update_own')
        AND created_by = auth.uid()
      )
    )
  )
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "sikesra_entities_soft_delete_tenant" ON public.sikesra_entities;
CREATE POLICY "sikesra_entities_soft_delete_tenant" ON public.sikesra_entities
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
    AND public.has_permission('tenant.sikesra_entity.delete')
  );

DROP POLICY IF EXISTS "sikesra_entities_restore_tenant" ON public.sikesra_entities;
CREATE POLICY "sikesra_entities_restore_tenant" ON public.sikesra_entities
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NOT NULL
    AND public.has_permission('tenant.sikesra_entity.restore')
  );

-- Platform Admin bypass
DROP POLICY IF EXISTS "sikesra_entities_platform_admin" ON public.sikesra_entities;
CREATE POLICY "sikesra_entities_platform_admin" ON public.sikesra_entities
  FOR ALL
  USING (public.is_platform_admin());

-- ============================================================================
-- 4. SIKESRA Documents RLS
-- ============================================================================

DROP POLICY IF EXISTS "sikesra_documents_select_tenant" ON public.sikesra_documents;
CREATE POLICY "sikesra_documents_select_tenant" ON public.sikesra_documents
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "sikesra_documents_insert_tenant" ON public.sikesra_documents;
CREATE POLICY "sikesra_documents_insert_tenant" ON public.sikesra_documents
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_permission('tenant.sikesra_document.create')
  );

DROP POLICY IF EXISTS "sikesra_documents_update_tenant" ON public.sikesra_documents;
CREATE POLICY "sikesra_documents_update_tenant" ON public.sikesra_documents
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
    AND public.has_permission('tenant.sikesra_document.update')
  )
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "sikesra_documents_delete_tenant" ON public.sikesra_documents;
CREATE POLICY "sikesra_documents_delete_tenant" ON public.sikesra_documents
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
    AND public.has_permission('tenant.sikesra_document.delete')
  );

-- ============================================================================
-- 5. SIKESRA Submissions RLS
-- ============================================================================

DROP POLICY IF EXISTS "sikesra_submissions_select_tenant" ON public.sikesra_submissions;
CREATE POLICY "sikesra_submissions_select_tenant" ON public.sikesra_submissions
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "sikesra_submissions_insert_tenant" ON public.sikesra_submissions;
CREATE POLICY "sikesra_submissions_insert_tenant" ON public.sikesra_submissions
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_permission('tenant.sikesra_submission.submit')
  );

DROP POLICY IF EXISTS "sikesra_submissions_update_tenant" ON public.sikesra_submissions;
CREATE POLICY "sikesra_submissions_update_tenant" ON public.sikesra_submissions
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
    AND public.has_permission('tenant.sikesra_submission.update')
  )
  WITH CHECK (tenant_id = public.current_tenant_id());

-- ============================================================================
-- 6. SIKESRA Verifications RLS
-- ============================================================================

DROP POLICY IF EXISTS "sikesra_verifications_select_tenant" ON public.sikesra_verifications;
CREATE POLICY "sikesra_verifications_select_tenant" ON public.sikesra_verifications
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "sikesra_verifications_insert_tenant" ON public.sikesra_verifications;
CREATE POLICY "sikesra_verifications_insert_tenant" ON public.sikesra_verifications
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      public.has_permission('tenant.sikesra_verification.verify_kecamatan')
      OR public.has_permission('tenant.sikesra_verification.verify_kabupaten')
      OR public.has_permission('tenant.sikesra_verification.validate_instansi')
    )
  );

DROP POLICY IF EXISTS "sikesra_verifications_update_tenant" ON public.sikesra_verifications;
CREATE POLICY "sikesra_verifications_update_tenant" ON public.sikesra_verifications
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
    AND public.has_permission('tenant.sikesra_verification.update')
  )
  WITH CHECK (tenant_id = public.current_tenant_id());

-- ============================================================================
-- 7. SIKESRA Approvals RLS
-- ============================================================================

DROP POLICY IF EXISTS "sikesra_approvals_select_tenant" ON public.sikesra_approvals;
CREATE POLICY "sikesra_approvals_select_tenant" ON public.sikesra_approvals
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "sikesra_approvals_insert_tenant" ON public.sikesra_approvals;
CREATE POLICY "sikesra_approvals_insert_tenant" ON public.sikesra_approvals
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_permission('tenant.sikesra_approval.approve')
  );

DROP POLICY IF EXISTS "sikesra_approvals_update_tenant" ON public.sikesra_approvals;
CREATE POLICY "sikesra_approvals_update_tenant" ON public.sikesra_approvals
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND deleted_at IS NULL
    AND public.has_permission('tenant.sikesra_approval.update')
  )
  WITH CHECK (tenant_id = public.current_tenant_id());

-- ============================================================================
-- 8. SIKESRA Audit Events RLS (Read-only for most users)
-- ============================================================================

DROP POLICY IF EXISTS "sikesra_audit_events_select_tenant" ON public.sikesra_audit_events;
CREATE POLICY "sikesra_audit_events_select_tenant" ON public.sikesra_audit_events
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.has_permission('tenant.sikesra_audit.read')
  );

-- System can insert (via triggers)
DROP POLICY IF EXISTS "sikesra_audit_events_insert_system" ON public.sikesra_audit_events;
CREATE POLICY "sikesra_audit_events_insert_system" ON public.sikesra_audit_events
  FOR INSERT
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Platform Admin can read all
DROP POLICY IF EXISTS "sikesra_audit_events_platform_admin" ON public.sikesra_audit_events;
CREATE POLICY "sikesra_audit_events_platform_admin" ON public.sikesra_audit_events
  FOR SELECT
  USING (public.is_platform_admin());
