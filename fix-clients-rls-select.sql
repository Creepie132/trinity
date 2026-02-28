-- Fix RLS policy for clients table - allow SELECT for org members
-- Проблема: RLS блокирует чтение клиентов
-- Решение: политика SELECT для членов организации

-- 1. Удаляем старую политику если есть
DROP POLICY IF EXISTS "Users can select clients for their org" ON clients;

-- 2. Создаём новую политику SELECT
CREATE POLICY "Users can select clients for their org" 
ON clients 
FOR SELECT 
USING (
  org_id IN (
    SELECT org_id 
    FROM org_users 
    WHERE user_id = auth.uid()
  )
);

-- 3. Проверяем что RLS включён
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 4. Проверим политики
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'clients';
