-- JWT Custom Claims для Trinity CRM
-- Хук уже активирован в Supabase, теперь обновляем функции для чтения из JWT

-- Обновляем get_user_org_ids() для чтения org_id из JWT (быстрее чем запрос в таблицу)
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Сначала пробуем из JWT (быстро)
  SELECT ((auth.jwt()->'app_metadata'->>'org_id')::uuid)
  WHERE (auth.jwt()->'app_metadata'->>'org_id') IS NOT NULL
  
  UNION
  
  -- Fallback на таблицу (если токен старый или JWT недоступен)
  SELECT org_id 
  FROM public.org_users 
  WHERE user_id = (SELECT auth.uid())
    AND (auth.jwt()->'app_metadata'->>'org_id') IS NULL;
$$;

-- Обновляем is_admin() для чтения is_admin из JWT
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'is_admin')::boolean,
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid()))
  );
$$;

-- Добавляем функцию для получения org_role из JWT
CREATE OR REPLACE FUNCTION public.get_user_org_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'org_role'),
    (SELECT role FROM public.org_users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
  );
$$;

-- Комментарии для документации
COMMENT ON FUNCTION public.get_user_org_ids() IS 'Возвращает org_id пользователя. Сначала из JWT custom claims, fallback на таблицу org_users';
COMMENT ON FUNCTION public.is_admin() IS 'Проверяет админ ли пользователь. Сначала из JWT, fallback на таблицу admin_users';
COMMENT ON FUNCTION public.get_user_org_role() IS 'Возвращает роль пользователя в организации из JWT или таблицы org_users';
