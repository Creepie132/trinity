-- ========================================
-- ФИКС: RLS политики для таблицы organizations
-- Админы должны иметь полный доступ
-- ========================================

-- 1️⃣ Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Admin full access to organizations" ON organizations;
DROP POLICY IF EXISTS "Users can read own organization" ON organizations;
DROP POLICY IF EXISTS "Users can update own organization" ON organizations;

-- 2️⃣ Создаём политику для админов (полный доступ)
CREATE POLICY "Admin full access to organizations"
ON organizations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

-- 3️⃣ Создаём политику для обычных пользователей (чтение своей организации)
CREATE POLICY "Users can read own organization"
ON organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT org_id FROM org_users
    WHERE org_users.user_id = auth.uid()
  )
);

-- 4️⃣ Создаём политику для обновления (только владельцы организации)
CREATE POLICY "Users can update own organization"
ON organizations
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT org_id FROM org_users
    WHERE org_users.user_id = auth.uid()
    AND org_users.role = 'owner'
  )
)
WITH CHECK (
  id IN (
    SELECT org_id FROM org_users
    WHERE org_users.user_id = auth.uid()
    AND org_users.role = 'owner'
  )
);

-- 5️⃣ Включаем RLS на таблице (если ещё не включен)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 6️⃣ Проверяем результат
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY policyname;
