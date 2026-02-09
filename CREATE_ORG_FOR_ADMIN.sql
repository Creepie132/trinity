-- ========================================
-- СОЗДАНИЕ ОРГАНИЗАЦИИ ДЛЯ АДМИНА
-- (обходит RLS через Service Role)
-- ========================================

-- ВАЖНО: Выполняй этот SQL в Supabase SQL Editor
-- Он использует права Service Role и обходит RLS

-- 1️⃣ Проверяем что ты есть в auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'creepie1357@gmail.com';
-- Скопируй свой user_id ↑

-- 2️⃣ Создаём организацию (обходит RLS автоматически через SQL Editor)
INSERT INTO organizations (
  id,
  name,
  email,
  phone,
  category,
  plan,
  is_active,
  features,
  billing_status,
  created_at
)
VALUES (
  gen_random_uuid(),
  'Vlad Organization',
  'creepie1357@gmail.com',
  '+972501234567',
  'salon',
  'pro',
  true,
  '{"sms": true, "payments": true, "analytics": true}'::jsonb,
  'trial',
  NOW()
)
RETURNING id;
-- ⬆️ СКОПИРУЙ ID ОРГАНИЗАЦИИ ИЗ РЕЗУЛЬТАТА

-- 3️⃣ Привязываем себя к организации
-- ЗАМЕНИ 'ORGANIZATION-ID-HERE' на ID из шага 2 ⬆️
INSERT INTO org_users (
  id,
  org_id,
  user_id,
  email,
  role,
  joined_at
)
VALUES (
  gen_random_uuid(),
  'ORGANIZATION-ID-HERE', -- ⬅️ ЗАМЕНИ ЭТО
  (SELECT id FROM auth.users WHERE email = 'creepie1357@gmail.com'),
  'creepie1357@gmail.com',
  'owner',
  NOW()
)
ON CONFLICT (user_id, org_id) DO NOTHING;

-- 4️⃣ ФИНАЛЬНАЯ ПРОВЕРКА
SELECT 
  'ADMIN STATUS' as check_type,
  au.email,
  au.role,
  au.full_name
FROM admin_users au
WHERE au.email = 'creepie1357@gmail.com'

UNION ALL

SELECT 
  'ORG STATUS' as check_type,
  ou.email,
  ou.role,
  o.name
FROM org_users ou
JOIN organizations o ON o.id = ou.org_id
WHERE ou.email = 'creepie1357@gmail.com';

-- Должно показать 2 строки:
-- 1. ADMIN STATUS - admin - Vlad Khalphin
-- 2. ORG STATUS - owner - Vlad Organization

-- ========================================
-- ГОТОВО!
-- ========================================
-- Теперь перезагрузи страницу (Ctrl+Shift+R)
-- Ты можешь:
-- ✅ Заходить в админ-панель
-- ✅ Добавлять клиентов
-- ✅ Создавать платежи и SMS кампании
