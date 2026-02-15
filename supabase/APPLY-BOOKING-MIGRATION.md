# 🚨 КРИТИЧЕСКАЯ МИГРАЦИЯ: Система онлайн записи

## Проблема
Ошибка "Failed to save settings" при попытке сохранить настройки онлайн записи.

## Root Cause
Таблица `organizations` не содержит колонок `slug` и `booking_settings`, которые необходимы для работы системы онлайн записи.

## Решение
Выполните SQL миграцию в Supabase SQL Editor:

### Шаги:

1. **Откройте Supabase Dashboard:**
   - https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Перейдите в SQL Editor:**
   - В левом меню: `SQL Editor`

3. **Создайте новый query:**
   - Кнопка `+ New query`

4. **Скопируйте и выполните следующий SQL:**

```sql
-- ========================================
-- MIGRATION: Add booking system support
-- ========================================

-- 1. Add slug column (unique URL for public booking)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Add booking_settings column (JSON settings)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS booking_settings JSONB;

-- 3. Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  service_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  price DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS bookings_org_scheduled ON bookings(org_id, scheduled_at);
CREATE INDEX IF NOT EXISTS bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS bookings_org_status_scheduled ON bookings(org_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS organizations_slug ON organizations(slug);

-- 5. Enable RLS on bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
DROP POLICY IF EXISTS "Org users can view their bookings" ON bookings;
DROP POLICY IF EXISTS "Org users can update their bookings" ON bookings;
DROP POLICY IF EXISTS "Org users can delete their bookings" ON bookings;

-- 7. Create RLS policies
-- Policy: Anyone can create bookings (public booking page)
CREATE POLICY "Anyone can create bookings" ON bookings
  FOR INSERT
  WITH CHECK (true);

-- Policy: Org users can view their bookings
CREATE POLICY "Org users can view their bookings" ON bookings
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Org users can update their bookings
CREATE POLICY "Org users can update their bookings" ON bookings
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Org users can delete their bookings
CREATE POLICY "Org users can delete their bookings" ON bookings
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

-- 8. Add comments
COMMENT ON TABLE bookings IS 'Public bookings made through /book/[slug] page';
COMMENT ON COLUMN organizations.slug IS 'Public URL slug for booking page (e.g. /book/my-salon)';
COMMENT ON COLUMN organizations.booking_settings IS 'JSON settings for public booking system';
```

5. **Нажмите `Run` или `Ctrl+Enter`**

6. **Проверьте результат:**
   - Должно появиться сообщение `Success. No rows returned`
   - Или количество затронутых строк

### Проверка успешности миграции:

Выполните следующий query для проверки:

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name IN ('slug', 'booking_settings');

-- Check if bookings table exists
SELECT * FROM bookings LIMIT 1;
```

Должны увидеть:
- `slug` | `text`
- `booking_settings` | `jsonb`

### Теперь можно:

1. ✅ Перейти в `/settings/booking`
2. ✅ Настроить онлайн запись
3. ✅ Сохранить настройки без ошибок
4. ✅ Скопировать ссылку для клиентов

---

## 🚀 После миграции:

Настройки онлайн записи будут работать корректно!

**Важно:** Эту миграцию нужно выполнить **только один раз**.
