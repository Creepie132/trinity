-- ============================================================
-- Trinity CRM — Auth Hook: custom_access_token_hook
-- Обновление: добавляем org_type в app_metadata JWT
-- 15.05.2026
-- ============================================================
-- Эта функция вызывается Supabase при каждой выдаче токена.
-- Она добавляет в JWT:
--   app_metadata.org_id      (уже было)
--   app_metadata.org_role    (уже было)
--   app_metadata.is_admin    (уже было)
--   app_metadata.org_type    (НОВОЕ — 'trinity' | 'payments_only')
--
-- Благодаря этому RLS политики читают org_type из токена (O(1))
-- без единого запроса к таблице organizations.
-- ============================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_org_id         uuid;
  v_org_role       text;
  v_is_admin       boolean := false;
  v_is_sales_agent boolean := false;
  v_org_type       text    := 'trinity';   -- safe default
  v_claims         jsonb;
BEGIN
  -- ── 1. Получаем user_id из события ──────────────────────────────────────
  v_user_id := (event ->> 'user_id')::uuid;
  v_claims  := event -> 'claims';

  -- ── 2. Читаем org_id + org_role из org_users ────────────────────────────
  SELECT ou.org_id, ou.role
  INTO v_org_id, v_org_role
  FROM public.org_users ou
  WHERE ou.user_id = v_user_id
  LIMIT 1;

  -- ── 3. Читаем is_admin + is_sales_agent из admin_users ──────────────────
  SELECT
    COALESCE(au.is_admin, false),
    COALESCE(au.is_sales_agent, false)
  INTO v_is_admin, v_is_sales_agent
  FROM public.admin_users au
  WHERE au.user_id = v_user_id
  LIMIT 1;

  -- ── 4. Читаем org_type из organizations ─────────────────────────────────
  -- Один запрос — быстро, выполняется только при выдаче токена.
  -- После записи в JWT следующие проверки O(1) без запросов к БД.
  IF v_org_id IS NOT NULL THEN
    SELECT COALESCE(o.org_type::text, 'trinity')
    INTO v_org_type
    FROM public.organizations o
    WHERE o.id = v_org_id;
  END IF;

  -- ── 5. Записываем все claims в app_metadata ──────────────────────────────
  v_claims := jsonb_set(
    v_claims,
    '{app_metadata}',
    COALESCE(v_claims -> 'app_metadata', '{}'::jsonb)
      || jsonb_build_object(
           'org_id',         v_org_id,
           'org_role',       v_org_role,
           'org_type',       v_org_type,
           'is_admin',       v_is_admin,
           'is_sales_agent', v_is_sales_agent
         )
  );

  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'Supabase Auth Hook. Записывает org_id, org_role, org_type, is_admin в JWT app_metadata при каждой выдаче токена.';

-- ────────────────────────────────────────────────────────────
-- ВАЖНО: После применения миграции нужно убедиться что хук
-- активирован в Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token Hook
--   Function: public.custom_access_token_hook
-- ────────────────────────────────────────────────────────────
