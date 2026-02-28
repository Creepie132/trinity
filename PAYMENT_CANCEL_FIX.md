# Payment Cancel Fix

## Проблема
При отмене платежа возникает ошибка "Failed to cancel payment".

## Причина
В таблице `payments` есть CHECK constraint:
```sql
status text DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded'))
```

Значение `'cancelled'` НЕ входит в список допустимых значений!

## Решение

### 1. Структура таблицы payments (найдено)
```sql
CREATE TABLE payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  visit_id uuid REFERENCES visits(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'ILS' CHECK (currency IN ('ILS','USD','EUR')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  payment_method text,
  payment_link text,
  transaction_id text,
  provider text DEFAULT 'tranzilla',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### 2. RLS политика (проверено)
```sql
CREATE POLICY "Users manage own org payments" 
  ON payments FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());
```
✅ RLS политика разрешает UPDATE для пользователей своей организации

### 3. Миграция (создана)
Файл: `supabase/migrations/add-cancelled-status-to-payments.sql`

```sql
-- Add 'cancelled' status to payments table
-- Drop existing constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

-- Add new constraint with 'cancelled' status
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('pending','completed','failed','refunded','cancelled'));
```

## Инструкция по применению

### Вариант 1: Через Supabase Dashboard
1. Открой: https://supabase.com/dashboard
2. Выбери проект Trinity
3. Перейди в SQL Editor
4. Скопируй и выполни SQL из `supabase/migrations/add-cancelled-status-to-payments.sql`

### Вариант 2: Через Supabase CLI
```bash
supabase migration up
```

## Проверка после применения
После выполнения миграции проверь в консоли:
1. `console.log('Cancelling payment id:', paymentId)` - должен показать ID
2. `console.log('Cancel result:', { data, error })` - error должен быть null
3. Статус платежа должен измениться на 'cancelled'
