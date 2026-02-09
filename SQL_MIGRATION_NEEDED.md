# ⚠️ ТРЕБУЕТСЯ SQL МИГРАЦИЯ

## Проблема
Имя и email админа не отображаются в sidebar, потому что в таблице `admin_users` отсутствует поле `full_name`.

## Решение
Выполни следующий SQL запрос в **Supabase Dashboard → SQL Editor**:

```sql
-- Add full_name field to admin_users table
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update existing admin user with a default name
UPDATE admin_users
SET full_name = 'Vlad Khalphin'
WHERE email = 'creepie1357@gmail.com';

-- Add comment to the column
COMMENT ON COLUMN admin_users.full_name IS 'Full name of the admin user';
```

## После выполнения SQL
1. Обнови страницу админ-панели (Ctrl/Cmd + Shift + R)
2. В нижнем правом углу sidebar должно появиться:
   - **Vlad Khalphin** (крупный белый текст)
   - **creepie1357@gmail.com** (мелкий серый текст под ним)

## Как изменить своё имя в будущем
```sql
UPDATE admin_users
SET full_name = 'Новое Имя'
WHERE email = 'creepie1357@gmail.com';
```

---

**Файл миграции:** `supabase/add-admin-name.sql`
