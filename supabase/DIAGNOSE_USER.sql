-- =============================================
-- ДИАГНОСТИКА: Проверка пользователя creepie1357@gmail.com
-- =============================================
-- Запустите этот скрипт в Supabase SQL Editor (будучи залогиненным)
-- =============================================

-- ПРОВЕРКА 1: Существует ли пользователь в auth.users?
-- =============================================
SELECT 
  id as user_id,
  email,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN id IS NOT NULL THEN '✅ Пользователь существует в auth.users'
    ELSE '❌ Пользователя нет в auth.users'
  END as status
FROM auth.users
WHERE email = 'creepie1357@gmail.com';

-- ПРОВЕРКА 2: Есть ли запись в org_users?
-- =============================================
SELECT 
  ou.id,
  ou.org_id,
  ou.user_id,
  ou.email,
  ou.role,
  ou.invited_at,
  ou.joined_at,
  CASE 
    WHEN ou.user_id IS NULL THEN '❌ ПРОБЛЕМА: user_id = NULL'
    WHEN ou.user_id IS NOT NULL THEN '✅ user_id установлен'
  END as user_id_status,
  CASE 
    WHEN ou.org_id IS NULL THEN '❌ ПРОБЛЕМА: org_id = NULL'
    WHEN ou.org_id IS NOT NULL THEN '✅ org_id установлен'
  END as org_id_status
FROM org_users ou
WHERE ou.email = 'creepie1357@gmail.com';

-- ПРОВЕРКА 3: Соответствие user_id между auth.users и org_users
-- =============================================
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  ou.user_id as org_user_id,
  ou.email as org_email,
  ou.org_id,
  CASE 
    WHEN au.id = ou.user_id THEN '✅ user_id совпадают'
    WHEN au.id IS NOT NULL AND ou.user_id IS NULL THEN '⚠️ ПРОБЛЕМА: org_users.user_id = NULL (нужен UPDATE)'
    WHEN au.id != ou.user_id THEN '❌ ПРОБЛЕМА: user_id НЕ совпадают!'
    ELSE '❓ Неизвестная ситуация'
  END as match_status
FROM auth.users au
LEFT JOIN org_users ou ON ou.email = au.email
WHERE au.email = 'creepie1357@gmail.com';

-- ПРОВЕРКА 4: Существует ли организация?
-- =============================================
SELECT 
  o.id as org_id,
  o.name as org_name,
  o.is_active,
  o.plan,
  o.features,
  CASE 
    WHEN o.is_active = true THEN '✅ Организация активна'
    WHEN o.is_active = false THEN '❌ Организация заблокирована'
  END as status
FROM organizations o
WHERE o.id IN (
  SELECT org_id 
  FROM org_users 
  WHERE email = 'creepie1357@gmail.com'
);

-- ПРОВЕРКА 5: Проверка через auth.uid() (если вы залогинены)
-- =============================================
-- Это покажет что видит система когда вы залогинены
SELECT 
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_email,
  (SELECT COUNT(*) FROM org_users WHERE user_id = auth.uid()) as org_users_count,
  (SELECT org_id FROM org_users WHERE user_id = auth.uid() LIMIT 1) as org_id,
  CASE 
    WHEN (SELECT COUNT(*) FROM org_users WHERE user_id = auth.uid()) = 0 
    THEN '❌ ПРОБЛЕМА: Нет записи в org_users для текущего user_id'
    WHEN (SELECT COUNT(*) FROM org_users WHERE user_id = auth.uid()) > 0 
    THEN '✅ org_users запись найдена'
  END as status;

-- =============================================
-- АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ (если нужно)
-- =============================================
-- Запустите ТОЛЬКО если ПРОВЕРКА 3 показала:
-- "ПРОБЛЕМА: org_users.user_id = NULL (нужен UPDATE)"

-- UNCOMMENT BELOW TO FIX:
/*
UPDATE org_users
SET 
  user_id = (SELECT id FROM auth.users WHERE email = 'creepie1357@gmail.com'),
  joined_at = COALESCE(joined_at, NOW())
WHERE 
  email = 'creepie1357@gmail.com' 
  AND user_id IS NULL;

-- Проверка после исправления:
SELECT 
  ou.email,
  ou.user_id,
  ou.org_id,
  ou.role,
  '✅ FIXED' as status
FROM org_users ou
WHERE ou.email = 'creepie1357@gmail.com';
*/

-- =============================================
-- РЕЗУЛЬТАТЫ ИНТЕРПРЕТАЦИИ
-- =============================================
-- 
-- Если ПРОВЕРКА 1 вернула 0 строк:
--   → Вы не залогинены или email неправильный
--   → Решение: Проверьте email, попробуйте другой
--
-- Если ПРОВЕРКА 2 вернула 0 строк:
--   → У вас нет записи в org_users вообще
--   → Решение: Нужно добавить вручную (см. ниже)
--
-- Если ПРОВЕРКА 2 показала user_id = NULL:
--   → Запись есть, но user_id не установлен
--   → Решение: Запустить UPDATE выше
--
-- Если ПРОВЕРКА 3 показала "user_id НЕ совпадают":
--   → В org_users записан неправильный user_id
--   → Решение: UPDATE org_users SET user_id = (правильный id)
--
-- Если ПРОВЕРКА 4 вернула 0 строк:
--   → Организация не существует или org_id в org_users неправильный
--   → Решение: Проверить organizations таблицу
--
-- Если ПРОВЕРКА 5 показала org_users_count = 0:
--   → useAuth() не может найти org_id потому что нет записи
--   → Решение: Добавить запись в org_users с правильным user_id
--

-- =============================================
-- РУЧНОЕ ДОБАВЛЕНИЕ (если нет записи в org_users)
-- =============================================
/*
-- Сначала найдите ID вашей организации:
SELECT id, name FROM organizations;

-- Затем добавьте себя:
INSERT INTO org_users (org_id, user_id, email, role, joined_at)
VALUES (
  '<your-org-id>',  -- Замените на ID из запроса выше
  (SELECT id FROM auth.users WHERE email = 'creepie1357@gmail.com'),
  'creepie1357@gmail.com',
  'owner',
  NOW()
);
*/
