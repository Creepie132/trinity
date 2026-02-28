-- =============================================
-- БЫСТРОЕ ИСПРАВЛЕНИЕ RLS ДЛЯ ТАБЛИЦЫ CLIENTS
-- =============================================
-- Выполните этот SQL в Supabase SQL Editor
-- =============================================

-- ШАГ 1: ДИАГНОСТИКА
-- =============================================

-- Проверить текущего пользователя
SELECT 
  auth.uid() as user_id,
  current_user as db_user;

-- Проверить есть ли пользователь в org_users
SELECT 
  ou.id,
  ou.org_id,
  ou.user_id,
  ou.email,
  ou.role,
  o.name as org_name
FROM org_users ou
LEFT JOIN organizations o ON o.id = ou.org_id
WHERE ou.user_id = auth.uid();

-- Если результат ПУСТОЙ - пользователь НЕ добавлен в организацию!
-- Смотрите ШАГ 2 ниже


-- Проверить функцию get_user_org_ids()
SELECT get_user_org_ids() as my_org_ids;
-- Если результат ПУСТОЙ - пользователь не в org_users!


-- Проверить политики для clients
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'clients'
ORDER BY cmd;


-- ШАГ 2: ДОБАВИТЬ ПОЛЬЗОВАТЕЛЯ В ОРГАНИЗАЦИЮ (если нужно)
-- =============================================

-- Список организаций
SELECT id, name, email, is_active FROM organizations;

-- ВАЖНО: Замените 'YOUR_ORG_ID' на реальный UUID организации из SELECT выше!
-- ВАЖНО: Замените 'your-email@example.com' на ваш реальный email!

/*
INSERT INTO org_users (org_id, user_id, email, role, joined_at)
VALUES (
  'YOUR_ORG_ID',  -- ← ЗАМЕНИТЕ НА РЕАЛЬНЫЙ UUID
  auth.uid(),
  'your-email@example.com',  -- ← ЗАМЕНИТЕ НА ВАШ EMAIL
  'owner',
  now()
)
ON CONFLICT (org_id, email) DO NOTHING;
*/


-- ШАГ 3: ПЕРЕСОЗДАТЬ ПОЛИТИКИ RLS (если нужно)
-- =============================================

DO $$ 
BEGIN
  -- Удалить старые политики
  DROP POLICY IF EXISTS "Users see own org clients" ON clients;
  DROP POLICY IF EXISTS "Users insert own org clients" ON clients;
  DROP POLICY IF EXISTS "Users update own org clients" ON clients;
  DROP POLICY IF EXISTS "Users delete own org clients" ON clients;

  -- Создать новые политики
  CREATE POLICY "Users see own org clients" 
    ON clients FOR SELECT 
    USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

  CREATE POLICY "Users insert own org clients" 
    ON clients FOR INSERT 
    WITH CHECK (org_id IN (SELECT get_user_org_ids()) OR is_admin());

  CREATE POLICY "Users update own org clients" 
    ON clients FOR UPDATE 
    USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

  CREATE POLICY "Users delete own org clients" 
    ON clients FOR DELETE 
    USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

  RAISE NOTICE '✅ RLS политики для clients пересозданы';
END $$;


-- ШАГ 4: ИТОГОВАЯ ПРОВЕРКА
-- =============================================

-- Проверка 1: Пользователь в org_users?
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM org_users WHERE user_id = auth.uid())
    THEN '✅ Пользователь найден в org_users'
    ELSE '❌ Пользователь НЕ найден в org_users - добавьте его в ШАГ 2!'
  END as status_org_users;

-- Проверка 2: Функция возвращает org_id?
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM get_user_org_ids())
    THEN '✅ get_user_org_ids() возвращает org_id'
    ELSE '❌ get_user_org_ids() возвращает ПУСТО'
  END as status_function;

-- Проверка 3: Все 4 политики существуют?
SELECT 
  CASE 
    WHEN COUNT(*) = 4 
    THEN '✅ Все 4 политики (SELECT, INSERT, UPDATE, DELETE) существуют'
    ELSE '⚠️ Найдено политик: ' || COUNT(*) || ' (ожидается 4)'
  END as status_policies
FROM pg_policies
WHERE tablename = 'clients';

-- Проверка 4: Тест добавления клиента
DO $$
DECLARE
  v_org_id uuid;
  v_client_id uuid;
BEGIN
  -- Получить org_id пользователя
  SELECT org_id INTO v_org_id 
  FROM org_users 
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION '❌ org_id is NULL - пользователь не в org_users!';
  END IF;

  -- Попытка вставить тестового клиента
  INSERT INTO clients (org_id, first_name, last_name, phone)
  VALUES (v_org_id, 'Test', 'RLS-Check', '+972999999999')
  RETURNING id INTO v_client_id;

  -- Удалить тестового клиента
  DELETE FROM clients WHERE id = v_client_id;

  RAISE NOTICE '✅ RLS TEST PASSED: можно добавлять клиентов';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ RLS TEST FAILED: %', SQLERRM;
END $$;


-- =============================================
-- ИТОГ
-- =============================================
-- Если все 4 проверки прошли успешно (✅), проблема решена!
-- Если есть ошибки (❌), смотрите CLIENT_INSERT_SOLUTION.md
-- =============================================
