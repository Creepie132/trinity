-- ========================================
-- FIX: Добавить 'custom' в constraint для поля plan
-- Обновить старые значения 'professional' → 'pro', 'corporate' → 'enterprise'
-- ========================================

-- 1️⃣ Проверить текущие значения plan в базе (ДО миграции)
SELECT DISTINCT plan, COUNT(*) as count
FROM organizations
GROUP BY plan
ORDER BY plan;

-- 2️⃣ Удалить старый constraint
ALTER TABLE organizations 
DROP CONSTRAINT IF EXISTS organizations_plan_check;

-- 3️⃣ Обновить старые значения (если есть)
UPDATE organizations 
SET plan = 'pro' 
WHERE plan = 'professional';

UPDATE organizations 
SET plan = 'enterprise' 
WHERE plan = 'corporate';

-- 4️⃣ Добавить новый constraint с поддержкой 'custom'
ALTER TABLE organizations 
ADD CONSTRAINT organizations_plan_check 
CHECK (plan IN ('demo', 'basic', 'pro', 'enterprise', 'custom'));

-- 5️⃣ Проверить результат constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'organizations'::regclass
  AND contype = 'c'
  AND conname = 'organizations_plan_check';

-- 6️⃣ Проверить текущие значения plan в базе (ПОСЛЕ миграции)
SELECT DISTINCT plan, COUNT(*) as count
FROM organizations
GROUP BY plan
ORDER BY plan;
