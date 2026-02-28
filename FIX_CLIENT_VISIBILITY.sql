-- =============================================
-- FIX: Клиенты не отображаются после добавления
-- =============================================

-- ПРОВЕРКА 1: Существует ли клиент в таблице clients?
SELECT 
  id,
  org_id,
  first_name,
  last_name,
  phone,
  created_at
FROM clients
ORDER BY created_at DESC
LIMIT 5;

-- ПРОВЕРКА 2: Существует ли view client_summary?
SELECT 
  id,
  org_id,
  first_name,
  last_name,
  phone,
  created_at
FROM client_summary
ORDER BY created_at DESC
LIMIT 5;

-- ПРОВЕРКА 3: RLS политики на clients
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'clients'
ORDER BY cmd;

-- ПРОВЕРКА 4: Включен ли RLS на clients?
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'clients';

-- ПРОВЕРКА 5: org_id текущего пользователя
SELECT 
  ou.org_id,
  ou.user_id,
  ou.email,
  o.name as org_name
FROM org_users ou
LEFT JOIN organizations o ON o.id = ou.org_id
WHERE ou.user_id = auth.uid();

-- ПРОВЕРКА 6: get_user_org_ids() функция
SELECT get_user_org_ids() as my_org_ids;

-- =============================================
-- ИСПРАВЛЕНИЕ: Пересоздать view с RLS
-- =============================================

-- Удалить старую view
DROP VIEW IF EXISTS client_summary;

-- Создать новую view client_summary
CREATE OR REPLACE VIEW client_summary AS
SELECT 
  c.id,
  c.org_id,
  c.first_name,
  c.last_name,
  c.phone,
  c.email,
  c.date_of_birth,
  c.address,
  c.notes,
  c.created_at,
  MAX(v.visit_date) AS last_visit,
  COUNT(DISTINCT v.id) AS total_visits,
  COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS total_paid
FROM clients c
LEFT JOIN visits v ON v.client_id = c.id
LEFT JOIN payments p ON p.client_id = c.id
GROUP BY c.id;

-- Включить RLS на view (если возможно)
-- Примечание: В PostgreSQL views не поддерживают RLS напрямую
-- RLS применяется к базовым таблицам (clients, visits, payments)

-- Убедимся что SELECT политика есть на clients
DO $$ 
BEGIN
  -- Удалить старую политику если есть
  DROP POLICY IF EXISTS "Users see own org clients" ON clients;

  -- Создать новую политику SELECT
  CREATE POLICY "Users see own org clients" 
    ON clients FOR SELECT 
    USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());
    
  RAISE NOTICE '✅ SELECT политика для clients пересоздана';
END $$;

-- =============================================
-- ТЕСТ: Проверка видимости клиентов
-- =============================================

-- Проверка 1: Прямой SELECT из clients
SELECT 
  id,
  org_id,
  first_name,
  last_name
FROM clients
WHERE org_id IN (SELECT get_user_org_ids())
ORDER BY created_at DESC
LIMIT 5;

-- Проверка 2: SELECT из client_summary
SELECT 
  id,
  org_id,
  first_name,
  last_name,
  total_visits,
  total_paid
FROM client_summary
WHERE org_id IN (SELECT get_user_org_ids())
ORDER BY created_at DESC
LIMIT 5;

-- Если оба запроса возвращают данные - RLS работает правильно
-- Если первый работает, а второй нет - проблема в view

-- =============================================
-- АЛЬТЕРНАТИВА: Создать security definer функцию
-- =============================================

-- Если view не работает с RLS, создайте функцию:
CREATE OR REPLACE FUNCTION get_client_summary(p_org_id uuid)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  first_name text,
  last_name text,
  phone text,
  email text,
  date_of_birth date,
  address text,
  notes text,
  created_at timestamptz,
  last_visit timestamptz,
  total_visits bigint,
  total_paid numeric
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    c.id,
    c.org_id,
    c.first_name,
    c.last_name,
    c.phone,
    c.email,
    c.date_of_birth,
    c.address,
    c.notes,
    c.created_at,
    MAX(v.visit_date) AS last_visit,
    COUNT(DISTINCT v.id) AS total_visits,
    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS total_paid
  FROM clients c
  LEFT JOIN visits v ON v.client_id = c.id
  LEFT JOIN payments p ON p.client_id = c.id
  WHERE c.org_id = p_org_id
  GROUP BY c.id
  ORDER BY c.created_at DESC;
$$;

-- Использовать в коде:
-- SELECT * FROM get_client_summary('your-org-id-here');

-- =============================================
-- ИТОГОВАЯ ПРОВЕРКА
-- =============================================

-- Должны совпадать:
WITH check_data AS (
  SELECT 
    (SELECT COUNT(*) FROM clients WHERE org_id IN (SELECT get_user_org_ids())) as clients_count,
    (SELECT COUNT(*) FROM client_summary WHERE org_id IN (SELECT get_user_org_ids())) as summary_count
)
SELECT 
  clients_count,
  summary_count,
  CASE 
    WHEN clients_count = summary_count THEN '✅ Counts match - RLS working correctly'
    ELSE '❌ Counts DO NOT match - view RLS issue'
  END as status
FROM check_data;
