-- ============================================================
-- Trinity CRM: Multi-tenant WhatsApp custom integration
-- Migration: add per-org Whapi credentials to wa_integrations
-- Date: 2026-04-02
-- ============================================================

-- Добавляем поля в wa_integrations для per-tenant overrides
-- Логика Fallback:
--   use_custom_wa = true + поля заполнены → использовать custom ключи
--   use_custom_wa = false или поля пустые  → fallback на глобальный инстанс

ALTER TABLE public.wa_integrations
  ADD COLUMN IF NOT EXISTS use_custom_wa   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_api_url  varchar(512),
  ADD COLUMN IF NOT EXISTS custom_vault_id uuid REFERENCES vault.secrets(id) ON DELETE SET NULL;

-- Индекс для быстрого lookup при отправке
CREATE INDEX IF NOT EXISTS idx_wa_integrations_org_custom
  ON public.wa_integrations(org_id, use_custom_wa)
  WHERE use_custom_wa = true;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Существующие RLS политики wa_integrations уже ограничивают по org_id.
-- Новые поля наследуют те же правила — дополнительных политик не требуется.

-- ── FUNCTION: get_custom_wa_config ───────────────────────────────────────────
-- Возвращает кастомные реквизиты Whapi для org или NULL если их нет.
-- SECURITY DEFINER — читает vault.secrets без RLS.
-- Вызывается только с сервера (service role).
CREATE OR REPLACE FUNCTION public.get_custom_wa_config(p_org_id uuid)
RETURNS TABLE (
  api_url  text,
  api_key  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_vault_id uuid;
  v_api_url  text;
  v_secret   text;
BEGIN
  -- Берём vault_id и url только если use_custom_wa = true
  SELECT wai.custom_vault_id, wai.custom_api_url
  INTO   v_vault_id, v_api_url
  FROM   public.wa_integrations wai
  WHERE  wai.org_id        = p_org_id
    AND  wai.use_custom_wa = true
    AND  wai.custom_vault_id IS NOT NULL
  LIMIT 1;

  IF v_vault_id IS NULL THEN
    RETURN; -- пустой результат → caller использует глобальный fallback
  END IF;

  -- Читаем секрет из vault
  SELECT decrypted_secret
  INTO   v_secret
  FROM   vault.decrypted_secrets
  WHERE  id = v_vault_id;

  IF v_secret IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    COALESCE(v_api_url, 'https://gate.whapi.cloud'),
    v_secret;
END;
$$;

-- Доступ только для service role
REVOKE ALL ON FUNCTION public.get_custom_wa_config(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_custom_wa_config(uuid) TO service_role;

COMMENT ON FUNCTION public.get_custom_wa_config IS
  'Returns per-org custom Whapi credentials (api_url + decrypted api_key). Returns empty if org uses global config.';
