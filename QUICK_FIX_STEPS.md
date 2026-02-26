# 🚀 Быстрое исправление проблемы с планами

## Проблема
❌ Ошибка: `violates check constraint organizations_plan_check`
❌ Значение "custom" не разрешено в поле plan

## Решение за 2 минуты

### ШАГ 1: Выполнить SQL в Supabase (обязательно!)

1. Откройте **Supabase Dashboard** → ваш проект
2. Перейдите в **SQL Editor** (левое меню)
3. Скопируйте и выполните этот SQL:

```sql
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
```

4. Нажмите **RUN** или **Ctrl+Enter**

### ШАГ 2: Дождаться деплоя

Код уже запушен в `main`, Vercel автоматически задеплоит изменения.

**Статус:** 🚀 Коммит `a33ee1b` — запушен

**Проверить деплой:** Откройте Vercel Dashboard → ваш проект → вкладка Deployments

### ШАГ 3: Проверить что всё работает

1. Зайдите в админ-панель → **Подписки**
2. Нажмите **"Продлить"** на любой организации
3. Выберите план **"Кастом"** (Custom)
4. Настройте модули и цену
5. Нажмите **"Сохранить"**

✅ **Ожидаемый результат:** "Доступ продлён" (без ошибок)

---

## Что было исправлено в коде

### Изменения в TypeScript

**Файл:** `src/lib/subscription-plans.ts`

**Было:**
```typescript
export type PlanKey = 'demo' | 'basic' | 'professional' | 'corporate' | 'custom'
```

**Стало:**
```typescript
export type PlanKey = 'demo' | 'basic' | 'pro' | 'enterprise' | 'custom'
```

**Почему:**
- Унификация с тем что ожидается в базе данных
- Более короткие названия
- Соответствие существующему коду

---

## Допустимые значения поля plan

После исправления разрешены **только** эти значения:

- ✅ `demo` — Демо (14 дней пробный период)
- ✅ `basic` — Базовый (для малого бизнеса)
- ✅ `pro` — Профессиональный (для растущего бизнеса)
- ✅ `enterprise` — Корпоративный (все функции)
- ✅ `custom` — Кастом (выбор модулей вручную)

---

## Проверка после применения

### Проверить constraint в Supabase

```sql
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'organizations'::regclass
  AND conname = 'organizations_plan_check';
```

**Ожидаемый результат:**
```
organizations_plan_check | CHECK (plan IN ('demo', 'basic', 'pro', 'enterprise', 'custom'))
```

### Проверить значения plan в базе

```sql
SELECT DISTINCT plan, COUNT(*) as count
FROM organizations
GROUP BY plan
ORDER BY plan;
```

**Не должно быть:** `'professional'`, `'corporate'`

---

## Troubleshooting

### ❌ Ошибка: "constraint already exists"

**Решение:** Сначала удалите старый constraint:
```sql
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
```

### ❌ Ошибка: "violates check constraint"

**Причина:** В базе остались старые значения

**Решение:** Обновите их:
```sql
UPDATE organizations SET plan = 'pro' WHERE plan = 'professional';
UPDATE organizations SET plan = 'enterprise' WHERE plan = 'corporate';
```

### ❌ Всё ещё 401 Unauthorized

**Причина:** Деплой ещё не завершён

**Решение:** Подождите 2-3 минуты и обновите страницу

---

## Полезные файлы

- 📄 `FIX_PLAN_CONSTRAINT.sql` — SQL миграция
- 📄 `FIX_PLAN_CONSTRAINT_DOCS.md` — подробная документация
- 📄 `QUICK_FIX_STEPS.md` — этот файл (быстрые инструкции)

---

## Статус

- ✅ SQL миграция создана
- ✅ Код обновлён и запушен (коммит `a33ee1b`)
- 🔄 **НУЖНО ВЫПОЛНИТЬ:** Запустить SQL в Supabase
- 🚀 Vercel автоматически задеплоит код

**После выполнения ШАГ 1 всё должно заработать!**
