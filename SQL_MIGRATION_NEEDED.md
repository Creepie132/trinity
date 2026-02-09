# ⚠️ ТРЕБУЕТСЯ SQL МИГРАЦИЯ

## Миграция 1: Добавление full_name (v2.3.1)
Имя и email админа не отображаются в sidebar, потому что в таблице `admin_users` отсутствует поле `full_name`.

## Миграция 2: Добавление role (v2.4.0)
Добавлена система ролей для админов (admin/moderator).

---

## Решение - выполни ОБА SQL запроса:

### 1️⃣ Добавление created_at, full_name
Выполни следующий SQL запрос в **Supabase Dashboard → SQL Editor**:

```sql
-- Add created_at field to admin_users table
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add full_name field to admin_users table
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update existing admin user with a default name
UPDATE admin_users
SET full_name = 'Vlad Khalphin'
WHERE email = 'creepie1357@gmail.com';

-- Add comments to the columns
COMMENT ON COLUMN admin_users.created_at IS 'Date when admin was added';
COMMENT ON COLUMN admin_users.full_name IS 'Full name of the admin user';
```

## После выполнения SQL
1. Обнови страницу админ-панели (Ctrl/Cmd + Shift + R)
2. В нижнем правом углу sidebar должно появиться:
   - **Vlad Khalphin** (крупный белый текст)
   - **creepie1357@gmail.com** (мелкий серый текст под ним)

---

### 2️⃣ Добавление role (система ролей)
Выполни следующий SQL запрос:

```sql
-- Add role column to admin_users table
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'moderator'));

-- Add comment
COMMENT ON COLUMN admin_users.role IS 'Admin role: admin (full access) or moderator (limited access)';

-- Set all existing admins to 'admin' role
UPDATE admin_users
SET role = 'admin'
WHERE role IS NULL;
```

---

## После выполнения ОБЕИХ миграций
1. Обнови страницу админ-панели (Ctrl/Cmd + Shift + R)
2. В sidebar должно появиться твоё имя и email
3. В карточке клиента (ClientSheet) появится кнопка "מנה כמנהל" (если у клиента есть email)

---

## Как изменить своё имя в будущем
```sql
UPDATE admin_users
SET full_name = 'Новое Имя'
WHERE email = 'creepie1357@gmail.com';
```

---

**Файлы миграций:** 
- `supabase/add-admin-name.sql`
- `supabase/add-admin-roles.sql`
