-- ========================================
-- ДИАГНОСТИКА: Проверка таблицы organizations
-- ========================================

-- 1️⃣ Проверяем структуру таблицы organizations
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

-- 2️⃣ Проверяем RLS политики на organizations
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'organizations';

-- 3️⃣ Проверяем включен ли RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'organizations';

-- 4️⃣ Проверяем существующие данные организаций
SELECT 
    id,
    name,
    email,
    plan,
    subscription_status,
    subscription_expires_at,
    features,
    is_active,
    created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 5;

-- 5️⃣ Проверяем constraint на subscription_status
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'organizations'::regclass
  AND contype = 'c'; -- check constraints
