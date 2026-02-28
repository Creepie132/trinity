-- =============================================
-- FIX CLIENT INSERT RLS ERROR
-- =============================================
-- Проблема: RLS ошибка при добавлении клиента
-- Решение: Проверка политик и функции get_user_org_ids()
-- =============================================

-- ШАГ 1: Проверить текущего пользователя
SELECT 
  auth.uid() as current_user_id,
  current_user as db_user;

-- ШАГ 2: Проверить есть ли пользователь в org_users
SELECT 
  id,
  org_id,
  user_id,
  email,
  role,
  joined_at
FROM org_users
WHERE user_id = auth.uid();

-- ШАГ 3: Проверить работу функции get_user_org_ids()
SELECT get_user_org_ids();

-- ШАГ 4: Проверить существующие политики для clients
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'clients';

-- ШАГ 5: Проверить включен ли RLS на clients
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'clients';

-- =============================================
-- ИСПРАВЛЕНИЕ (если нужно)
-- =============================================

-- Если политики отсутствуют, создать их заново
DO $$ 
BEGIN
  -- Удалить старые политики если есть
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
END $$;

-- =============================================
-- ПРОВЕРКА ПОСЛЕ ИСПРАВЛЕНИЯ
-- =============================================

-- Попытка вставить тестового клиента
DO $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Получить org_id текущего пользователя
  SELECT org_id INTO v_org_id 
  FROM org_users 
  WHERE user_id = auth.uid()
  LIMIT 1;

  RAISE NOTICE 'User org_id: %', v_org_id;

  -- Попытаться вставить клиента (затем удалить)
  IF v_org_id IS NOT NULL THEN
    INSERT INTO clients (org_id, first_name, last_name, phone)
    VALUES (v_org_id, 'Test', 'Client', '+972000000000');
    
    DELETE FROM clients 
    WHERE phone = '+972000000000' AND org_id = v_org_id;
    
    RAISE NOTICE 'RLS TEST PASSED: Insert и Delete работают корректно';
  ELSE
    RAISE EXCEPTION 'ERROR: org_id is NULL for current user';
  END IF;
END $$;

-- =============================================
-- ИТОГОВАЯ ПРОВЕРКА
-- =============================================

-- Проверить что все политики на месте
SELECT COUNT(*) as policies_count
FROM pg_policies
WHERE tablename = 'clients'
AND policyname IN (
  'Users see own org clients',
  'Users insert own org clients',
  'Users update own org clients',
  'Users delete own org clients'
);
-- Ожидается: policies_count = 4

-- Проверить что функция возвращает org_id
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM get_user_org_ids()) THEN '✅ get_user_org_ids() returns org_id'
    ELSE '❌ get_user_org_ids() returns EMPTY - USER NOT IN org_users!'
  END as function_status;
