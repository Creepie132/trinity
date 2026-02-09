-- ========================================
-- ПОЛНАЯ НАСТРОЙКА ДОСТУПА К TRINITY
-- ========================================
-- Выполни ВСЁ по порядку в Supabase SQL Editor

-- 1️⃣ Проверяем что ты есть в auth.users
-- Если нет - сначала зайди на сайт и залогинься
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'creepie1357@gmail.com';
-- Скопируй свой user_id отсюда ↑

-- 2️⃣ Добавляем колонки в admin_users (если их нет)
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'moderator'));

-- 3️⃣ ВАРИАНТ А: Добавить себя как АДМИНА (рекомендуется)
-- Заменит или создаст запись
INSERT INTO admin_users (id, user_id, email, full_name, role, created_at)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'creepie1357@gmail.com' LIMIT 1),
  'creepie1357@gmail.com',
  'Vlad Khalphin',
  'admin',
  NOW()
)
ON CONFLICT (user_id) DO UPDATE 
SET 
  full_name = 'Vlad Khalphin',
  role = 'admin';

-- 4️⃣ Проверяем что ты добавлен в админы
SELECT * FROM admin_users WHERE email = 'creepie1357@gmail.com';
-- Должна быть 1 строка ↑

-- ========================================
-- ЕСЛИ НУЖНА ОРГАНИЗАЦИЯ (опционально)
-- ========================================
-- Это нужно ТОЛЬКО если хочешь тестировать функции обычного пользователя

-- 5️⃣ Проверяем есть ли организация
SELECT o.*, ou.user_id, ou.email as user_email
FROM organizations o
LEFT JOIN org_users ou ON ou.org_id = o.id
WHERE ou.email = 'creepie1357@gmail.com';

-- 6️⃣ Если организации НЕТ - создаём
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
  'Test Organization - Vlad',
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
-- СКОПИРУЙ ID ОРГАНИЗАЦИИ ИЗ RETURNING ↑

-- 7️⃣ Привязываем себя к организации
-- ЗАМЕНИ 'ORGANIZATION-ID-HERE' на ID из предыдущего шага
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
  'ORGANIZATION-ID-HERE', -- <-- ЗАМЕНИ ЭТО
  (SELECT id FROM auth.users WHERE email = 'creepie1357@gmail.com'),
  'creepie1357@gmail.com',
  'owner',
  NOW()
)
ON CONFLICT (user_id, org_id) DO NOTHING;

-- 8️⃣ ФИНАЛЬНАЯ ПРОВЕРКА
SELECT 'ADMIN STATUS' as check_type, email, role, full_name 
FROM admin_users 
WHERE email = 'creepie1357@gmail.com'

UNION ALL

SELECT 'ORG STATUS' as check_type, ou.email, ou.role, o.name
FROM org_users ou
JOIN organizations o ON o.id = ou.org_id
WHERE ou.email = 'creepie1357@gmail.com';

-- Должно показать минимум 1 строку (ADMIN STATUS) ↑

-- ========================================
-- ГОТОВО!
-- ========================================
-- Теперь перезагрузи страницу (Ctrl/Cmd + Shift + R)
-- Ты должен попасть на главную страницу
