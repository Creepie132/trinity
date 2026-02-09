-- ========================================
-- БЫСТРОЕ СОЗДАНИЕ ОРГАНИЗАЦИИ (ONE-LINER)
-- ========================================
-- Копируй и выполни весь блок целиком

DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Получаем user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'creepie1357@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Please login first.';
  END IF;

  -- Создаём организацию
  INSERT INTO organizations (
    id, name, email, phone, category, plan,
    is_active, features, billing_status, created_at
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
  RETURNING id INTO v_org_id;

  -- Привязываем пользователя к организации
  INSERT INTO org_users (id, org_id, user_id, email, role, joined_at)
  VALUES (
    gen_random_uuid(),
    v_org_id,
    v_user_id,
    'creepie1357@gmail.com',
    'owner',
    NOW()
  )
  ON CONFLICT (user_id, org_id) DO NOTHING;

  RAISE NOTICE 'Success! Organization created with ID: %', v_org_id;
END $$;

-- Проверяем результат
SELECT 
  o.id,
  o.name,
  o.email,
  o.category,
  o.plan,
  o.is_active,
  ou.role as user_role
FROM organizations o
JOIN org_users ou ON ou.org_id = o.id
WHERE ou.email = 'creepie1357@gmail.com';
