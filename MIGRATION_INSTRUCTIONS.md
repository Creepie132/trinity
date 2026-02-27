# 🚀 Инструкция по применению миграции: Demo Plan

## ✅ Что было сделано

1. **SQL миграция создана**: `sql/change-default-plan-to-demo.sql`
2. **TypeScript типы обновлены**: `src/types/database.ts`
3. **Frontend обновлён**: `src/app/admin/organizations/page.tsx`
4. **Изменения закоммичены и запушены в main**

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ СЕЙЧАС

### Шаг 1: Применить SQL миграцию

1. Открой [Supabase Dashboard](https://supabase.com)
2. Выбери проект Trinity
3. Перейди в **SQL Editor**
4. Создай новый query
5. Скопируй содержимое файла `sql/change-default-plan-to-demo.sql`
6. Вставь в редактор и нажми **Run**

**Содержимое миграции:**
```sql
-- Change default plan from 'basic' to 'demo'
-- This affects new invitations when users are approved

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;

-- Step 2: Add new CHECK constraint that includes 'demo'
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check 
  CHECK (plan IN ('demo', 'basic', 'pro', 'enterprise', 'custom'));

-- Step 3: Change the default value from 'basic' to 'demo'
ALTER TABLE organizations ALTER COLUMN plan SET DEFAULT 'demo';
```

---

### Шаг 2: Проверка деплоя на Vercel

Если проект подключен к Vercel:
- Деплой должен начаться автоматически после пуша в main
- Проверь статус на [vercel.com/dashboard](https://vercel.com/dashboard)

Если деплой не запустился автоматически:
```bash
vercel --prod
```

---

## 🎯 Что изменилось

### До:
- Новые приглашения → план **"basic"** (100 клиентов, все модули)
- Дефолтное значение в БД: `'basic'`
- CHECK constraint: `('basic', 'pro', 'enterprise')`

### После:
- Новые приглашения → план **"demo"** (10 клиентов, только клиенты)
- Дефолтное значение в БД: `'demo'`
- CHECK constraint: `('demo', 'basic', 'pro', 'enterprise', 'custom')`

---

## 🧪 Как протестировать

1. Создай новую организацию через админ-панель
2. Выбери существующего клиента или создай нового
3. План по умолчанию должен быть **"demo"**
4. После создания проверь в базе:
   ```sql
   SELECT id, name, plan, created_at 
   FROM organizations 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

---

## 📝 Дополнительная информация

**Demo план (subscription-plans.ts):**
- Название: "Демо" / "דמו"
- Срок: 14 дней
- Лимит клиентов: 10
- Модули: только clients
- Цена: 0 ₪

**Файлы изменены:**
- `sql/change-default-plan-to-demo.sql` (новый)
- `src/types/database.ts`
- `src/app/admin/organizations/page.tsx`
- `src/components/admin/CreateOrgSubscriptionDialog.tsx`

**Коммит:** `Change default plan from 'basic' to 'demo' for new invitations`
