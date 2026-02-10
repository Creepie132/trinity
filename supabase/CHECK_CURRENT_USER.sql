-- =============================================
-- БЫСТРАЯ ПРОВЕРКА: Текущий пользователь
-- =============================================
-- Запустите будучи залогиненным в Supabase Dashboard
-- =============================================

-- Показывает всё о текущем пользователе
SELECT 
  '🔑 Current User' as info,
  auth.uid() as user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

-- Проверяет org_users для текущего пользователя
SELECT 
  '🏢 Organization Membership' as info,
  ou.org_id,
  ou.role,
  o.name as org_name,
  CASE 
    WHEN ou.org_id IS NULL THEN '❌ НЕТ ОРГАНИЗАЦИИ'
    ELSE '✅ Организация найдена'
  END as status
FROM org_users ou
LEFT JOIN organizations o ON o.id = ou.org_id
WHERE ou.user_id = auth.uid();

-- Проверяет admin статус
SELECT 
  '👑 Admin Status' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) 
    THEN '✅ Администратор'
    ELSE '❌ Не администратор'
  END as status;

-- Показывает количество клиентов в организации
SELECT 
  '👥 Clients Count' as info,
  COUNT(*) as total_clients,
  (SELECT org_id FROM org_users WHERE user_id = auth.uid()) as org_id
FROM clients
WHERE org_id = (SELECT org_id FROM org_users WHERE user_id = auth.uid());

-- =============================================
-- Если результаты показывают НЕТ ОРГАНИЗАЦИИ:
-- =============================================
-- 
-- Выполните этот INSERT (замените <org-id> на реальный):
/*
INSERT INTO org_users (org_id, user_id, email, role, joined_at)
VALUES (
  '<your-org-id>',  -- ID организации Amber Solutions
  auth.uid(),
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  'owner',
  NOW()
)
ON CONFLICT (org_id, email) 
DO UPDATE SET user_id = auth.uid(), joined_at = NOW();
*/
