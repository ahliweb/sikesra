BEGIN;

ALTER TABLE public.media_objects
  ADD COLUMN IF NOT EXISTS session_bound_access boolean NOT NULL DEFAULT false;

ALTER TABLE public.media_upload_sessions
  ADD COLUMN IF NOT EXISTS session_bound_access boolean NOT NULL DEFAULT false;

ALTER TABLE public.media_objects
  DROP CONSTRAINT IF EXISTS media_objects_session_bound_access_requires_private_check;

ALTER TABLE public.media_objects
  ADD CONSTRAINT media_objects_session_bound_access_requires_private_check
  CHECK (NOT session_bound_access OR access_control IN ('private', 'tenant_only'));

ALTER TABLE public.media_upload_sessions
  DROP CONSTRAINT IF EXISTS media_upload_sessions_session_bound_access_requires_private_check;

ALTER TABLE public.media_upload_sessions
  ADD CONSTRAINT media_upload_sessions_session_bound_access_requires_private_check
  CHECK (NOT session_bound_access OR access_control IN ('private', 'tenant_only'));

CREATE INDEX IF NOT EXISTS idx_media_objects_session_bound_access
  ON public.media_objects (tenant_id, session_bound_access)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.media_objects.session_bound_access IS
  'When true, this file is delivered only through session-bound signed access URLs and should use a protected storage key prefix on new uploads.';

COMMENT ON COLUMN public.media_upload_sessions.session_bound_access IS
  'Carries the session-bound access flag from upload form to finalized media object creation.';

COMMIT;
