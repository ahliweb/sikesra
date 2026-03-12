-- Migration: SIKESRA Core Schema
-- Objective: Create the core SIKESRA registry, workflow, and audit tables
-- Authority: docs/product/PRD.md, docs/product/GAP_ANALYSIS.md

SET client_min_messages TO warning;

-- ============================================================================
-- 1. SIKESRA Entity Types (Reference Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sikesra_entity_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL, -- 2-digit code for 20D ID (01-99)
  name text NOT NULL, -- e.g., 'Rumah Ibadah', 'Lembaga Sosial'
  description text,
  parent_type_id uuid REFERENCES public.sikesra_entity_types(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE (code)
);

COMMENT ON TABLE public.sikesra_entity_types IS 'Reference table for SIKESRA entity type codes used in 20D ID generation';
COMMENT ON COLUMN public.sikesra_entity_types.code IS '2-digit code (01-99) used as entity_type segment in 20D SIKESRA ID';

-- Seed initial entity types for MVP
INSERT INTO public.sikesra_entity_types (code, name, description, sort_order) VALUES
  ('01', 'Rumah Ibadah', 'Houses of Worship (Masjid, Gereja, Pura, Vihara, Kelenteng)', 1),
  ('02', 'Lembaga Sosial Keagamaan', 'Social/Religious Institutions', 2),
  ('03', 'Tokoh Agama', 'Religious Teachers/Figures', 3),
  ('04', 'Yatim Piatu', 'Orphans', 4),
  ('05', 'Penyandang Disabilitas', 'People with Disabilities', 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. SIKESRA Micro Regions (RT/RW/Dusun)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sikesra_micro_regions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  village_id uuid REFERENCES public.administrative_regions(id) ON DELETE SET NULL,
  
  name text NOT NULL, -- e.g., 'RT 01', 'RW 05', 'Dusun Sukamaju'
  type text NOT NULL CHECK (type IN ('rt', 'rw', 'dusun', 'lingkungan', 'other')),
  code text, -- e.g., '001', '005'
  
  parent_micro_region_id uuid REFERENCES public.sikesra_micro_regions(id) ON DELETE SET NULL,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_sikesra_micro_regions_tenant ON public.sikesra_micro_regions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_micro_regions_village ON public.sikesra_micro_regions(village_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_micro_regions_parent ON public.sikesra_micro_regions(parent_micro_region_id);

COMMENT ON TABLE public.sikesra_micro_regions IS 'Operational micro-regions (RT, RW, Dusun) for SIKESRA field operations';
COMMENT ON COLUMN public.sikesra_micro_regions.type IS 'Micro-region type: rt, rw, dusun, lingkungan, other';

-- ============================================================================
-- 3. SIKESRA Entities (Core Registry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sikesra_entities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- 20D SIKESRA ID (immutable business identifier)
  sikesra_id text UNIQUE,
  sikesra_id_issued_at timestamptz,
  
  -- Classification
  entity_type_id uuid NOT NULL REFERENCES public.sikesra_entity_types(id),
  entity_subtype_id uuid REFERENCES public.sikesra_entity_types(id),
  
  -- Identity
  name text NOT NULL,
  slug text,
  nik text, -- For individuals (masked by default)
  description text,
  
  -- Location (Official Administrative)
  province_id uuid REFERENCES public.administrative_regions(id) ON DELETE SET NULL,
  kabupaten_id uuid REFERENCES public.administrative_regions(id) ON DELETE SET NULL,
  kecamatan_id uuid REFERENCES public.administrative_regions(id) ON DELETE SET NULL,
  village_id uuid REFERENCES public.administrative_regions(id) ON DELETE SET NULL,
  
  -- Micro-Region Context (Operational)
  micro_region_id uuid REFERENCES public.sikesra_micro_regions(id) ON DELETE SET NULL,
  address text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  
  -- Contact
  phone text,
  email text,
  website text,
  
  -- Domain Extension (JSONB for type-specific attributes)
  attributes jsonb DEFAULT '{}'::jsonb,
  
  -- Workflow State
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'ready_for_submission',
    'submitted_kelurahan',
    'under_verification_kecamatan',
    'revision_requested_kecamatan',
    'verified_kecamatan',
    'under_validation_instansi',
    'validated_instansi',
    'under_review_kabupaten',
    'revision_requested_kabupaten',
    'approved_kabupaten',
    'active',
    'inactive',
    'archived',
    'rejected'
  )),
  
  -- Lifecycle
  submitted_at timestamptz,
  verified_kecamatan_at timestamptz,
  verified_kecamatan_by uuid REFERENCES public.users(id),
  validated_instansi_at timestamptz,
  validated_instansi_by uuid REFERENCES public.users(id),
  approved_kabupaten_at timestamptz,
  approved_kabupaten_by uuid REFERENCES public.users(id),
  activated_at timestamptz,
  deactivated_at timestamptz,
  archived_at timestamptz,
  
  -- Ownership & Audit
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  
  -- Constraints
  UNIQUE (tenant_id, slug)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sikesra_entities_tenant ON public.sikesra_entities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_entities_sikesra_id ON public.sikesra_entities(sikesra_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_entities_status ON public.sikesra_entities(status);
CREATE INDEX IF NOT EXISTS idx_sikesra_entities_type ON public.sikesra_entities(entity_type_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_entities_village ON public.sikesra_entities(village_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_entities_kecamatan ON public.sikesra_entities(kecamatan_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_entities_kabupaten ON public.sikesra_entities(kabupaten_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_entities_created_by ON public.sikesra_entities(created_by);
CREATE INDEX IF NOT EXISTS idx_sikesra_entities_deleted ON public.sikesra_entities(deleted_at);

COMMENT ON TABLE public.sikesra_entities IS 'Core SIKESRA entity registry with 20D business identifier and multi-tier workflow';
COMMENT ON COLUMN public.sikesra_entities.sikesra_id IS 'Immutable 20-digit SIKESRA business identifier: [10-digit village code][2-digit type][2-digit subtype][6-digit sequence]';
COMMENT ON COLUMN public.sikesra_entities.nik IS 'NIK for individual entities. Sensitive - must be masked in most views';
COMMENT ON COLUMN public.sikesra_entities.status IS 'Workflow state following SIKESRA verification chain';

-- ============================================================================
-- 4. SIKESRA Documents (Evidence & Attachments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sikesra_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.sikesra_entities(id) ON DELETE CASCADE,
  
  -- Document Classification
  document_type text NOT NULL, -- e.g., 'KTP', 'SKT', 'Foto Lokasi', 'Surat Keterangan'
  document_category text CHECK (document_category IN ('identity', 'legal', 'evidence', 'supporting', 'other')),
  
  -- Storage (R2)
  storage_key text NOT NULL, -- R2 object key
  original_filename text,
  mime_type text,
  file_size bigint,
  
  -- Status
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN (
    'uploaded',
    'under_review',
    'verified',
    'rejected',
    'expired',
    'superseded'
  )),
  
  -- Review
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id),
  review_notes text,
  
  -- Supersession
  superseded_by uuid REFERENCES public.sikesra_documents(id) ON DELETE SET NULL,
  superseded_at timestamptz,
  
  -- Metadata
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Audit
  uploaded_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sikesra_documents_tenant ON public.sikesra_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_documents_entity ON public.sikesra_documents(entity_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_documents_status ON public.sikesra_documents(status);
CREATE INDEX IF NOT EXISTS idx_sikesra_documents_type ON public.sikesra_documents(document_type);

COMMENT ON TABLE public.sikesra_documents IS 'Document and evidence attachments for SIKESRA entities with review lifecycle';

-- ============================================================================
-- 5. SIKESRA Submissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sikesra_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.sikesra_entities(id) ON DELETE CASCADE,
  
  -- Submission Info
  submission_type text NOT NULL CHECK (submission_type IN ('new', 'update', 'correction', 'reactivation')),
  notes text,
  
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'withdrawn')),
  
  -- Timestamps
  submitted_at timestamptz DEFAULT now(),
  submitted_by uuid REFERENCES public.users(id),
  
  -- Resolution
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.users(id),
  resolution_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sikesra_submissions_tenant ON public.sikesra_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_submissions_entity ON public.sikesra_submissions(entity_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_submissions_status ON public.sikesra_submissions(status);

COMMENT ON TABLE public.sikesra_submissions IS 'Submission records tracking entity lifecycle transitions';

-- ============================================================================
-- 6. SIKESRA Verifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sikesra_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.sikesra_entities(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES public.sikesra_submissions(id) ON DELETE SET NULL,
  
  -- Verification Level
  verification_level text NOT NULL CHECK (verification_level IN ('kelurahan', 'kecamatan', 'instansi', 'kabupaten')),
  
  -- Decision
  decision text NOT NULL CHECK (decision IN ('verified', 'revision_requested', 'rejected')),
  notes text,
  
  -- Actor
  verified_at timestamptz DEFAULT now(),
  verified_by uuid NOT NULL REFERENCES public.users(id),
  
  -- Region Context (for territorial scope)
  region_id uuid REFERENCES public.administrative_regions(id) ON DELETE SET NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sikesra_verifications_tenant ON public.sikesra_verifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_verifications_entity ON public.sikesra_verifications(entity_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_verifications_level ON public.sikesra_verifications(verification_level);
CREATE INDEX IF NOT EXISTS idx_sikesra_verifications_decision ON public.sikesra_verifications(decision);

COMMENT ON TABLE public.sikesra_verifications IS 'Verification records at each workflow stage (Kelurahan, Kecamatan, Instansi, Kabupaten)';

-- ============================================================================
-- 7. SIKESRA Approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sikesra_approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.sikesra_entities(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES public.sikesra_submissions(id) ON DELETE SET NULL,
  
  -- Approval Decision
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'revision_requested')),
  notes text,
  
  -- Actor
  approved_at timestamptz DEFAULT now(),
  approved_by uuid NOT NULL REFERENCES public.users(id),
  
  -- Activation
  activates_entity boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sikesra_approvals_tenant ON public.sikesra_approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_approvals_entity ON public.sikesra_approvals(entity_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_approvals_decision ON public.sikesra_approvals(decision);

COMMENT ON TABLE public.sikesra_approvals IS 'Final approval records for SIKESRA entities at Kabupaten level';

-- ============================================================================
-- 8. SIKESRA Audit Events
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sikesra_audit_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.sikesra_entities(id) ON DELETE SET NULL,
  
  -- Event Classification
  event_type text NOT NULL, -- e.g., 'entity.created', 'status.changed', 'document.uploaded'
  event_category text CHECK (event_category IN ('entity', 'document', 'workflow', 'export', 'permission', 'system')),
  
  -- Event Details
  description text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Actor
  actor_id uuid REFERENCES public.users(id),
  actor_ip inet,
  actor_user_agent text,
  
  -- Context
  region_id uuid REFERENCES public.administrative_regions(id) ON DELETE SET NULL,
  
  -- Immutable (append-only)
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sikesra_audit_tenant ON public.sikesra_audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_audit_entity ON public.sikesra_audit_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_audit_type ON public.sikesra_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sikesra_audit_actor ON public.sikesra_audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_sikesra_audit_created ON public.sikesra_audit_events(created_at);

COMMENT ON TABLE public.sikesra_audit_events IS 'Append-only audit trail for SIKESRA operations';

-- ============================================================================
-- 9. 20D SIKESRA ID Generation Functions
-- ============================================================================

-- Function: Generate 20D SIKESRA ID
-- Format: [10-digit village code][2-digit entity type][2-digit entity subtype][6-digit sequence]
CREATE OR REPLACE FUNCTION public.generate_sikesra_id(
  p_village_id uuid,
  p_entity_type_id uuid,
  p_entity_subtype_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_village_code text;
  v_type_code text;
  v_subtype_code text;
  v_sequence integer;
  v_sikesra_id text;
BEGIN
  -- Get village code (10 digits, padded)
  SELECT LPAD(code, 10, '0') INTO v_village_code
  FROM public.administrative_regions
  WHERE id = p_village_id;
  
  IF v_village_code IS NULL THEN
    RAISE EXCEPTION 'Village not found for ID: %', p_village_id;
  END IF;
  
  -- Get entity type code (2 digits)
  SELECT LPAD(code, 2, '0') INTO v_type_code
  FROM public.sikesra_entity_types
  WHERE id = p_entity_type_id;
  
  IF v_type_code IS NULL THEN
    RAISE EXCEPTION 'Entity type not found for ID: %', p_entity_type_id;
  END IF;
  
  -- Get entity subtype code (2 digits, default '00')
  IF p_entity_subtype_id IS NOT NULL THEN
    SELECT LPAD(code, 2, '0') INTO v_subtype_code
    FROM public.sikesra_entity_types
    WHERE id = p_entity_subtype_id;
    v_subtype_code := COALESCE(v_subtype_code, '00');
  ELSE
    v_subtype_code := '00';
  END IF;
  
  -- Get next sequence for this village+type combination
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(sikesra_id, 15, 6) AS integer)
  ), 0) + 1 INTO v_sequence
  FROM public.sikesra_entities
  WHERE village_id = p_village_id
    AND entity_type_id = p_entity_type_id
    AND sikesra_id IS NOT NULL;
  
  -- Construct 20D ID
  v_sikesra_id := v_village_code || v_type_code || v_subtype_code || LPAD(v_sequence::text, 6, '0');
  
  RETURN v_sikesra_id;
END;
$$;

-- Function: Validate 20D SIKESRA ID format
CREATE OR REPLACE FUNCTION public.validate_sikesra_id(p_sikesra_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Must be exactly 20 digits
  IF LENGTH(p_sikesra_id) != 20 THEN
    RETURN false;
  END IF;
  
  -- Must be all digits
  IF p_sikesra_id !~ '^[0-9]{20}$' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Function: Parse 20D SIKESRA ID components
CREATE OR REPLACE FUNCTION public.parse_sikesra_id(p_sikesra_id text)
RETURNS TABLE (
  village_code text,
  entity_type_code text,
  entity_subtype_code text,
  sequence integer
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NOT public.validate_sikesra_id(p_sikesra_id) THEN
    RAISE EXCEPTION 'Invalid SIKESRA ID format: %', p_sikesra_id;
  END IF;
  
  RETURN QUERY SELECT
    SUBSTRING(p_sikesra_id, 1, 10) AS village_code,
    SUBSTRING(p_sikesra_id, 11, 2) AS entity_type_code,
    SUBSTRING(p_sikesra_id, 13, 2) AS entity_subtype_code,
    CAST(SUBSTRING(p_sikesra_id, 15, 6) AS integer) AS sequence;
END;
$$;

-- Function: Issue SIKESRA ID to entity (called on approval)
CREATE OR REPLACE FUNCTION public.issue_sikesra_id(p_entity_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entity public.sikesra_entities%ROWTYPE;
  v_sikesra_id text;
BEGIN
  -- Get entity
  SELECT * INTO v_entity FROM public.sikesra_entities WHERE id = p_entity_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entity not found: %', p_entity_id;
  END IF;
  
  -- Check if already has SIKESRA ID
  IF v_entity.sikesra_id IS NOT NULL THEN
    RETURN v_entity.sikesra_id;
  END IF;
  
  -- Generate new SIKESRA ID
  v_sikesra_id := public.generate_sikesra_id(
    v_entity.village_id,
    v_entity.entity_type_id,
    v_entity.entity_subtype_id
  );
  
  -- Update entity
  UPDATE public.sikesra_entities
  SET 
    sikesra_id = v_sikesra_id,
    sikesra_id_issued_at = now(),
    updated_at = now()
  WHERE id = p_entity_id;
  
  -- Log audit event
  INSERT INTO public.sikesra_audit_events (
    tenant_id,
    entity_id,
    event_type,
    event_category,
    description,
    new_values,
    actor_id
  ) VALUES (
    v_entity.tenant_id,
    p_entity_id,
    'sikesra_id.issued',
    'entity',
    'SIKESRA ID issued',
    jsonb_build_object('sikesra_id', v_sikesra_id),
    auth.uid()
  );
  
  RETURN v_sikesra_id;
END;
$$;

COMMENT ON FUNCTION public.generate_sikesra_id IS 'Generate a new 20-digit SIKESRA ID for an entity';
COMMENT ON FUNCTION public.validate_sikesra_id IS 'Validate 20D SIKESRA ID format';
COMMENT ON FUNCTION public.parse_sikesra_id IS 'Parse 20D SIKESRA ID into components';
COMMENT ON FUNCTION public.issue_sikesra_id IS 'Issue SIKESRA ID to an entity (typically on approval)';

-- ============================================================================
-- 10. Audit Trigger for SIKESRA Entities
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sikesra_entity_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_type text;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'entity.created';
    v_new_values := to_jsonb(NEW);
    v_old_values := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if significant fields changed
    IF OLD.status != NEW.status THEN
      v_event_type := 'status.changed';
      v_old_values := jsonb_build_object('status', OLD.status);
      v_new_values := jsonb_build_object('status', NEW.status);
    ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_event_type := 'entity.soft_deleted';
      v_old_values := NULL;
      v_new_values := NULL;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      v_event_type := 'entity.restored';
      v_old_values := NULL;
      v_new_values := NULL;
    ELSE
      v_event_type := 'entity.updated';
      v_old_values := to_jsonb(OLD);
      v_new_values := to_jsonb(NEW);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'entity.deleted';
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  END IF;
  
  -- Insert audit event
  INSERT INTO public.sikesra_audit_events (
    tenant_id,
    entity_id,
    event_type,
    event_category,
    old_values,
    new_values,
    actor_id
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    COALESCE(NEW.id, OLD.id),
    v_event_type,
    'entity',
    v_old_values,
    v_new_values,
    auth.uid()
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sikesra_entity_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.sikesra_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.sikesra_entity_audit_trigger();

-- ============================================================================
-- 11. Updated At Triggers
-- ============================================================================

CREATE TRIGGER handle_updated_at_sikesra_entity_types
  BEFORE UPDATE ON public.sikesra_entity_types
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sikesra_micro_regions
  BEFORE UPDATE ON public.sikesra_micro_regions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sikesra_entities
  BEFORE UPDATE ON public.sikesra_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sikesra_documents
  BEFORE UPDATE ON public.sikesra_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sikesra_submissions
  BEFORE UPDATE ON public.sikesra_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sikesra_verifications
  BEFORE UPDATE ON public.sikesra_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sikesra_approvals
  BEFORE UPDATE ON public.sikesra_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 12. Enable RLS on All SIKESRA Tables
-- ============================================================================

ALTER TABLE public.sikesra_entity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sikesra_micro_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sikesra_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sikesra_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sikesra_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sikesra_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sikesra_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sikesra_audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 13. Grant Permissions
-- ============================================================================

GRANT ALL ON public.sikesra_entity_types TO authenticated;
GRANT ALL ON public.sikesra_micro_regions TO authenticated;
GRANT ALL ON public.sikesra_entities TO authenticated;
GRANT ALL ON public.sikesra_documents TO authenticated;
GRANT ALL ON public.sikesra_submissions TO authenticated;
GRANT ALL ON public.sikesra_verifications TO authenticated;
GRANT ALL ON public.sikesra_approvals TO authenticated;
GRANT SELECT ON public.sikesra_audit_events TO authenticated;

GRANT ALL ON public.sikesra_entity_types TO anon;
GRANT SELECT ON public.sikesra_micro_regions TO anon;
GRANT SELECT ON public.sikesra_entities TO anon;
GRANT SELECT ON public.sikesra_documents TO anon;
GRANT SELECT ON public.sikesra_submissions TO anon;
GRANT SELECT ON public.sikesra_verifications TO anon;
GRANT SELECT ON public.sikesra_approvals TO anon;
GRANT SELECT ON public.sikesra_audit_events TO anon;

-- Grant function execution
GRANT EXECUTE ON FUNCTION public.generate_sikesra_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_sikesra_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.parse_sikesra_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_sikesra_id TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_sikesra_id TO anon;
GRANT EXECUTE ON FUNCTION public.validate_sikesra_id TO anon;
GRANT EXECUTE ON FUNCTION public.parse_sikesra_id TO anon;
