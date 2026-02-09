-- ========================================
-- ДИАГНОСТИКА: Проверка структуры таблиц
-- ========================================

-- 1️⃣ Проверяем структуру admin_users
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- 2️⃣ Проверяем индексы и constraints на admin_users
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'admin_users'::regclass;

-- 3️⃣ Проверяем текущих админов
SELECT 
    au.*,
    u.email as auth_email,
    u.created_at as auth_created
FROM admin_users au
LEFT JOIN auth.users u ON u.id = au.user_id
ORDER BY au.created_at DESC;

-- 4️⃣ Проверяем есть ли ты в auth.users
SELECT 
    id as user_id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
WHERE email ILIKE '%creepie%' OR email ILIKE '%vlad%'
ORDER BY created_at DESC;

-- 5️⃣ Проверяем есть ли ты в org_users
SELECT 
    ou.*,
    o.name as org_name,
    o.is_active
FROM org_users ou
LEFT JOIN organizations o ON o.id = ou.org_id
WHERE ou.email ILIKE '%creepie%'
ORDER BY ou.joined_at DESC;

-- 6️⃣ Проверяем все организации
SELECT 
    id,
    name,
    email,
    category,
    plan,
    is_active,
    features,
    billing_status,
    created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 5;
