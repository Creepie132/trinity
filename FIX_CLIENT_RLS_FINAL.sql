-- =============================================
-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ RLS ДЛЯ ТАБЛИЦЫ CLIENTS
-- =============================================
-- Проблема: новые пользователи не могут добавлять/видеть клиентов
-- Решение: строгая привязка по org_id из org_users
-- =============================================

-- Шаг 1: Удалить все старые политики для clients
DROP POLICY IF EXISTS "Users can select clients for their org" ON clients;
DROP POLICY IF EXISTS "Users see own org clients" ON clients;
DROP POLICY IF EXISTS "Users insert own org clients" ON clients;
DROP POLICY IF EXISTS "Users update own org clients" ON clients;
DROP POLICY IF EXISTS "Users delete own org clients" ON clients;

-- Шаг 2: Создать новые строгие политики с прямым запросом org_id

-- SELECT: пользователь видит только клиентов своей организации
CREATE POLICY "clients_select_policy" 
ON clients 
FOR SELECT 
USING (
  org_id = (
    SELECT org_id 
    FROM org_users 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- INSERT: пользователь может добавлять клиентов только в свою организацию
CREATE POLICY "clients_insert_policy" 
ON clients 
FOR INSERT 
WITH CHECK (
  org_id = (
    SELECT org_id 
    FROM org_users 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- UPDATE: пользователь может обновлять только клиентов своей организации
CREATE POLICY "clients_update_policy" 
ON clients 
FOR UPDATE 
USING (
  org_id = (
    SELECT org_id 
    FROM org_users 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- DELETE: пользователь может удалять только клиентов своей организации
CREATE POLICY "clients_delete_policy" 
ON clients 
FOR DELETE 
USING (
  org_id = (
    SELECT org_id 
    FROM org_users 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- Шаг 3: Убедиться что RLS включён
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Шаг 4: Проверка политик
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'SELECT: org_id = (SELECT org_id FROM org_users WHERE user_id = auth.uid())'
    WHEN cmd = 'INSERT' THEN 'INSERT: WITH CHECK (org_id = (SELECT org_id FROM org_users WHERE user_id = auth.uid()))'
    WHEN cmd = 'UPDATE' THEN 'UPDATE: org_id = (SELECT org_id FROM org_users WHERE user_id = auth.uid())'
    WHEN cmd = 'DELETE' THEN 'DELETE: org_id = (SELECT org_id FROM org_users WHERE user_id = auth.uid())'
  END as expected_policy
FROM pg_policies
WHERE tablename = 'clients'
ORDER BY cmd;

-- Шаг 5: Проверка что текущий пользователь может работать с клиентами
DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  -- Получить текущего пользователя
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Пользователь не авторизован';
    RETURN;
  END IF;
  
  -- Получить org_id пользователя
  SELECT org_id INTO v_org_id 
  FROM org_users 
  WHERE user_id = v_user_id
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE '❌ Пользователь не привязан к организации!';
    RAISE NOTICE 'Добавьте пользователя в org_users:';
    RAISE NOTICE 'INSERT INTO org_users (org_id, user_id, email, role) VALUES (''ORG_ID'', auth.uid(), ''email@example.com'', ''owner'');';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Пользователь привязан к org_id: %', v_org_id;
  RAISE NOTICE '✅ RLS политики обновлены успешно';
END $$;
