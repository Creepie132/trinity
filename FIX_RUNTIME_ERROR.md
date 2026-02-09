# Исправление Runtime Error [object Object]

## Проблема

```
Runtime Error [object Object]
```

Это означает что не выполнена миграция базы данных — таблица `ad_campaigns` не существует.

---

## Решение: Выполнить миграцию

### Шаг 1: Проверьте что таблица существует

В Supabase SQL Editor выполните:

```sql
SELECT COUNT(*) FROM ad_campaigns;
```

**Если ошибка "relation does not exist"** → таблица не создана, переходите к Шагу 2.

**Если вернуло число** → таблица есть, проблема в другом.

---

### Шаг 2: Выполните миграцию

Откройте файл `supabase/schema-v2.sql` и выполните весь SQL в Supabase SQL Editor.

**Или создайте только таблицу ad_campaigns:**

```sql
-- Create ad_campaigns table
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  advertiser_name text NOT NULL,
  banner_url text NOT NULL,
  link_url text NOT NULL,
  target_categories text[] DEFAULT '{}',
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active 
ON ad_campaigns(is_active, start_date, end_date);

-- Enable RLS
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can see active ads
CREATE POLICY "All see active ads" 
ON ad_campaigns FOR SELECT 
USING (is_active = true OR is_admin());

-- Policy: Admins manage ads
CREATE POLICY "Admin manage ads" 
ON ad_campaigns FOR ALL 
USING (is_admin());
```

---

### Шаг 3: Проверьте что таблица создана

```sql
-- Должно вернуть 0 (пустая таблица)
SELECT COUNT(*) FROM ad_campaigns;

-- Посмотреть структуру
\d ad_campaigns
```

---

### Шаг 4: Обновите страницу

1. Обновите страницу `/admin/ads` (F5)
2. Ошибка должна исчезнуть
3. Увидите пустую таблицу и сможете создать кампанию

---

## Если ошибка осталась

### Проверка 1: Посмотрите консоль браузера

Откройте DevTools (F12) → Console

Ищите ошибки красным цветом. Скопируйте полный текст ошибки.

### Проверка 2: Посмотрите консоль сервера (терминал)

В терминале где запущен `npm run dev` ищите ошибки.

### Проверка 3: Проверьте что функция is_admin() существует

```sql
SELECT is_admin();
```

Если ошибка "function does not exist" → выполните миграцию `schema-v2.sql` полностью.

---

## Быстрая проверка всех таблиц v2.0

```sql
-- Проверить все новые таблицы
SELECT 
  'organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'org_users', COUNT(*) FROM org_users
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users
UNION ALL
SELECT 'ad_campaigns', COUNT(*) FROM ad_campaigns;
```

Должно вернуть 4 строки без ошибок.

Если какая-то таблица не существует — выполните `supabase/schema-v2.sql`.

---

## После исправления

1. ✅ Таблица `ad_campaigns` создана
2. ✅ Функция `is_admin()` существует
3. ✅ RLS политики настроены
4. ✅ Страница `/admin/ads` загружается без ошибок

**Теперь можно создавать рекламные кампании!** 🎉
