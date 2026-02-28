-- =============================================
-- ИСПРАВЛЕНИЕ ОРГАНИЗАЦИИ ДЛЯ ПОЛЬЗОВАТЕЛЯ
-- =============================================
-- Проблема: пользователь добавлен в чужую организацию,
-- но должен быть owner своей собственной организации
-- =============================================

-- Шаг 1: Проверка текущего состояния
-- =============================================

-- Найти пользователя по email
SELECT 
  au.id as user_id,
  au.email,
  ou.org_id,
  ou.role,
  o.name as org_name
FROM auth.users au
LEFT JOIN org_users ou ON ou.user_id = au.id
LEFT JOIN organizations o ON o.id = ou.org_id
WHERE au.email = 'ambersolutions.systems@gmail.com';

-- Проверить является ли пользователь owner какой-либо организации
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM auth.users au
      JOIN org_users ou ON ou.user_id = au.id
      WHERE au.email = 'ambersolutions.systems@gmail.com'
        AND ou.role = 'owner'
    )
    THEN '✅ Пользователь является owner организации'
    ELSE '❌ Пользователь НЕ является owner ни одной организации'
  END as status;

-- =============================================
-- ВАРИАНТ 1: Удалить связь и позволить создать новую организацию
-- =============================================
-- При следующем логине система автоматически создаст новую организацию
-- и добавит пользователя как owner

/*
DELETE FROM org_users
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ambersolutions.systems@gmail.com'
)
AND org_id = 'b98d2072-XXXX-XXXX-XXXX-XXXXXXXXXXXX'; -- замените на полный UUID!

-- После выполнения этого SQL:
-- 1. Пользователь должен разлогиниться
-- 2. Залогиниться снова
-- 3. Система автоматически создаст новую организацию
-- 4. Пользователь будет добавлен как owner
*/

-- =============================================
-- ВАРИАНТ 2: Изменить роль на owner в текущей организации
-- =============================================
-- Если организация b98d2072 принадлежит этому пользователю,
-- просто меняем роль на owner

/*
UPDATE org_users
SET role = 'owner'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ambersolutions.systems@gmail.com'
)
AND org_id = 'b98d2072-XXXX-XXXX-XXXX-XXXXXXXXXXXX'; -- замените на полный UUID!
*/

-- =============================================
-- ВАРИАНТ 3: Создать новую организацию вручную
-- =============================================
-- Если нужно создать новую организацию прямо сейчас,
-- без ожидания следующего логина

/*
DO $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_new_org_id uuid;
  v_org_name text;
BEGIN
  -- Получить user_id
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users 
  WHERE email = 'ambersolutions.systems@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Пользователь не найден';
  END IF;
  
  -- Проверить что пользователь не owner ни одной организации
  IF EXISTS (
    SELECT 1 FROM org_users 
    WHERE user_id = v_user_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Пользователь уже является owner организации';
  END IF;
  
  -- Сгенерировать имя организации
  v_org_name := 'ambersolutions_' || substring(md5(random()::text) from 1 for 4);
  
  -- Создать организацию
  INSERT INTO organizations (
    name,
    email,
    subscription_status,
    features
  ) VALUES (
    v_org_name,
    v_user_email,
    'none',
    jsonb_build_object(
      'business_info', jsonb_build_object(
        'display_name', 'Amber Solutions',
        'owner_name', 'Amber Solutions',
        'mobile', '',
        'email', v_user_email,
        'address', '',
        'city', '',
        'business_type', 'other',
        'description', 'Организация создана автоматически'
      ),
      'modules', jsonb_build_object(
        'clients', true,
        'visits', false,
        'booking', false,
        'inventory', false,
        'payments', false,
        'sms', false,
        'subscriptions', false,
        'statistics', false,
        'reports', false,
        'telegram', false,
        'loyalty', false,
        'birthday', false
      )
    )
  )
  RETURNING id INTO v_new_org_id;
  
  RAISE NOTICE 'Создана организация: % (ID: %)', v_org_name, v_new_org_id;
  
  -- Удалить старую связь (опционально - закомментируйте если хотите оставить)
  DELETE FROM org_users 
  WHERE user_id = v_user_id 
    AND org_id = 'b98d2072-XXXX-XXXX-XXXX-XXXXXXXXXXXX'; -- замените на полный UUID!
  
  -- Добавить пользователя как owner новой организации
  INSERT INTO org_users (
    user_id,
    org_id,
    email,
    role
  ) VALUES (
    v_user_id,
    v_new_org_id,
    v_user_email,
    'owner'
  );
  
  RAISE NOTICE '✅ Пользователь добавлен как owner новой организации';
  RAISE NOTICE 'Новая org_id: %', v_new_org_id;
END $$;
*/

-- =============================================
-- Проверка после изменений
-- =============================================

-- Проверить текущее состояние пользователя
SELECT 
  au.email,
  ou.org_id,
  ou.role,
  o.name as org_name,
  CASE 
    WHEN ou.role = 'owner' THEN '✅ Owner'
    ELSE '⚠️ ' || ou.role
  END as status
FROM auth.users au
LEFT JOIN org_users ou ON ou.user_id = au.id
LEFT JOIN organizations o ON o.id = ou.org_id
WHERE au.email = 'ambersolutions.systems@gmail.com';

-- =============================================
-- РЕКОМЕНДАЦИЯ
-- =============================================
-- Используйте ВАРИАНТ 1 (удалить связь)
-- Это самый безопасный вариант, система автоматически
-- создаст правильную организацию при следующем логине.
--
-- Шаги:
-- 1. Выполнить DELETE из ВАРИАНТА 1
-- 2. Пользователь разлогинивается
-- 3. Логинится снова
-- 4. Callback автоматически создаст новую организацию
-- =============================================
