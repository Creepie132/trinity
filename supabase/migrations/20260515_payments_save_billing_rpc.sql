-- ============================================================
-- Trinity CRM — RPC: save_billing_profile
-- 15.05.2026
-- ============================================================
-- Применено в Supabase через MCP (apply_migration).
-- Файл хранится для истории и повторного применения.

CREATE OR REPLACE FUNCTION public.save_billing_profile(
  p_org_id         uuid,
  p_gateway        text,
  p_terminal_name  text,
  p_api_key        text,
  p_encryption_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_org_id uuid;
  v_is_admin      boolean;
  v_result        jsonb;
BEGIN
  v_caller_org_id := (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid;
  v_is_admin      := (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean;

  IF NOT v_is_admin AND v_caller_org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Access denied: org_id mismatch' USING ERRCODE = '42501';
  END IF;

  IF p_gateway NOT IN ('tranzila', 'cardcom') THEN
    RAISE EXCEPTION 'Invalid gateway: %', p_gateway USING ERRCODE = '22023';
  END IF;

  IF length(p_terminal_name) < 2 THEN
    RAISE EXCEPTION 'Terminal name too short' USING ERRCODE = '22023';
  END IF;

  IF length(p_api_key) < 4 THEN
    RAISE EXCEPTION 'API key too short' USING ERRCODE = '22023';
  END IF;

  IF length(p_encryption_key) < 16 THEN
    RAISE EXCEPTION 'Encryption key too weak (min 16 chars)' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.billing_profiles (
    org_id, gateway, terminal_name, api_key_enc, is_active, updated_at
  )
  VALUES (
    p_org_id, p_gateway, p_terminal_name,
    pgp_sym_encrypt(p_api_key, p_encryption_key),
    true, now()
  )
  ON CONFLICT (org_id, gateway)
  DO UPDATE SET
    terminal_name = EXCLUDED.terminal_name,
    api_key_enc   = EXCLUDED.api_key_enc,
    is_active     = true,
    updated_at    = now();

  SELECT jsonb_build_object(
    'ok', true, 'org_id', p_org_id,
    'gateway', p_gateway, 'terminal_name', p_terminal_name,
    'updated_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.save_billing_profile(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_billing_profile(uuid, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.save_billing_profile IS
  'Безопасное сохранение API-ключа шлюза через pgp_sym_encrypt. Мастер-ключ передаётся из Server Action, шифрование внутри Postgres.';
