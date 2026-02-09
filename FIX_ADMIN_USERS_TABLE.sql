-- ========================================
-- ИСПРАВЛЕНИЕ ТАБЛИЦЫ admin_users
-- Добавление всех недостающих колонок
-- ========================================

-- 1️⃣ Добавляем created_at (если нет)
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2️⃣ Добавляем full_name (если нет)
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 3️⃣ Добавляем role (если нет)
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';

-- 4️⃣ Добавляем CHECK constraint для role (если нет)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_users_role_check'
  ) THEN
    ALTER TABLE admin_users 
    ADD CONSTRAINT admin_users_role_check 
    CHECK (role IN ('admin', 'moderator'));
  END IF;
END $$;

-- 5️⃣ Добавляем комментарии
COMMENT ON COLUMN admin_users.full_name IS 'Full name of the admin user';
COMMENT ON COLUMN admin_users.role IS 'Admin role: admin (full access) or moderator (limited access)';
COMMENT ON COLUMN admin_users.created_at IS 'Date when admin was added';

-- 6️⃣ Проверяем текущую структуру
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- 7️⃣ ТЕПЕРЬ добавляем себя в админы
INSERT INTO admin_users (id, user_id, email, full_name, role, created_at)
SELECT 
  gen_random_uuid(),
  id,
  email,
  'Vlad Khalphin',
  'admin',
  NOW()
FROM auth.users 
WHERE email = 'creepie1357@gmail.com'
ON CONFLICT (user_id) DO UPDATE 
SET 
  full_name = 'Vlad Khalphin',
  role = 'admin',
  created_at = COALESCE(admin_users.created_at, NOW());

-- 8️⃣ Проверяем результат
SELECT * FROM admin_users WHERE email = 'creepie1357@gmail.com';

-- ========================================
-- ГОТОВО! Ты должен быть в админах
-- ========================================
