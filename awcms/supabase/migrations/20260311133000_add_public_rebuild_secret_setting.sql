SET client_min_messages TO warning;

-- The public_rebuild_webhook_secret setting can be added to individual tenants as needed.

CREATE OR REPLACE FUNCTION public.request_public_rebuild()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id uuid;
  v_hook_url text;
  v_hook_secret text;
  v_headers jsonb := '{"Content-Type":"application/json"}'::jsonb;
BEGIN
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);

  IF v_tenant_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT pg_try_advisory_xact_lock(hashtext(v_tenant_id::text), hashtext('public_rebuild')) THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  SELECT NULLIF(trim(value), '')
  INTO v_hook_url
  FROM public.settings
  WHERE tenant_id = v_tenant_id
    AND key = 'public_rebuild_webhook_url'
    AND deleted_at IS NULL
  LIMIT 1;

  SELECT NULLIF(trim(value), '')
  INTO v_hook_secret
  FROM public.settings
  WHERE tenant_id = v_tenant_id
    AND key = 'public_rebuild_webhook_secret'
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_hook_secret IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('x-awcms-rebuild-secret', v_hook_secret);
  END IF;

  IF v_hook_url IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := v_hook_url,
      headers := v_headers,
      body := jsonb_build_object(
        'tenant_id', v_tenant_id,
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'changed_at', timezone('utc', now())
      )
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'public rebuild trigger failed for tenant % on %: %', v_tenant_id, TG_TABLE_NAME, SQLERRM;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;
