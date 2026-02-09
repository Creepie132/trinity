# 📋 КАК ВЫПОЛНИТЬ SQL МИГРАЦИИ
**Пошаговая инструкция для Supabase**

---

## 🎯 ЧТО НУЖНО СДЕЛАТЬ

После security audit нужно выполнить 2 SQL миграции:
1. **fix-organizations-rls.sql** — RLS политики для organizations
2. **fix-admin-org-users-rls.sql** — RLS политики для admin/org tables

---

## 📝 ПОШАГОВАЯ ИНСТРУКЦИЯ

### Шаг 1: Открой Supabase Dashboard

1. Перейди на [supabase.com](https://supabase.com)
2. Войди в аккаунт
3. Выбери проект **Trinity**

---

### Шаг 2: Открой SQL Editor

1. В левом меню найди **"SQL Editor"** 📊
2. Нажми на него
3. Нажми кнопку **"New query"** (справа вверху) ➕

---

### Шаг 3: Миграция #1 - Organizations RLS

#### 3.1 Скопируй SQL из файла

Открой файл `supabase/fix-organizations-rls.sql` и скопируй **весь** содержимое.

Или скопируй отсюда:

```sql
-- ========================================
-- FIX: RLS Policies for Organizations Table
-- Allows admins to create/manage organizations
-- ========================================

-- 1. DROP existing policies if any
DROP POLICY IF EXISTS "Admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Admins full access to organizations" ON organizations;

-- 2. Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 3. Allow admins to do everything with organizations
CREATE POLICY "Admins full access to organizations"
  ON organizations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Allow org users to view their own organization (read-only)
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid())
  );

-- 5. Allow org owners to update their own organization
CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ========================================
-- VERIFY POLICIES
-- ========================================
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
WHERE tablename = 'organizations'
ORDER BY policyname;
```

#### 3.2 Вставь SQL в редактор

1. Вставь скопированный SQL в окно редактора
2. Нажми **"Run"** (или нажми **F5** на клавиатуре)
3. Подожди 2-3 секунды

#### 3.3 Проверь результат

В нижней части должна появиться таблица с результатами:
- **Success** ✅ — всё ок, политики созданы
- Должны показаться 3 политики для `organizations`

**Ошибка?** Не страшно! Скорее всего политики уже существуют. Можно продолжать.

---

### Шаг 4: Миграция #2 - Admin/Org Users RLS

#### 4.1 Создай новый query

1. Снова нажми **"New query"** ➕
2. Или очисти текущий редактор

#### 4.2 Скопируй SQL из файла

Открой файл `supabase/fix-admin-org-users-rls.sql` или скопируй отсюда:

```sql
-- ========================================
-- FIX: RLS Policies for admin_users and org_users
-- Proper access control for user management tables
-- ========================================

-- =============================================
-- 1. ADMIN_USERS TABLE
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage admin_users" ON admin_users;
DROP POLICY IF EXISTS "Users can view themselves" ON admin_users;

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin_users table
CREATE POLICY "Admins can view all admin_users"
  ON admin_users FOR SELECT
  USING (is_admin());

-- Only admins can manage admin_users
CREATE POLICY "Admins can manage admin_users"
  ON admin_users FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can view themselves (for profile display)
CREATE POLICY "Users can view themselves"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid());

-- =============================================
-- 2. ORG_USERS TABLE
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all org_users" ON org_users;
DROP POLICY IF EXISTS "Admins can manage org_users" ON org_users;
DROP POLICY IF EXISTS "Users can view their own org" ON org_users;
DROP POLICY IF EXISTS "Owners can manage their org users" ON org_users;

-- Enable RLS
ALTER TABLE org_users ENABLE ROW LEVEL SECURITY;

-- Admins can view all org_users
CREATE POLICY "Admins can view all org_users"
  ON org_users FOR SELECT
  USING (is_admin());

-- Admins can manage all org_users
CREATE POLICY "Admins can manage org_users"
  ON org_users FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can view org_users from their organization
CREATE POLICY "Users can view their org members"
  ON org_users FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid())
  );

-- Org owners can manage users in their organization
CREATE POLICY "Owners can manage their org users"
  ON org_users FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ========================================
-- VERIFY POLICIES
-- ========================================

-- Check admin_users policies
SELECT 
  'admin_users' as table_name,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'admin_users'
ORDER BY policyname;

-- Check org_users policies
SELECT 
  'org_users' as table_name,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'org_users'
ORDER BY policyname;
```

#### 4.3 Выполни SQL

1. Вставь SQL в редактор
2. Нажми **"Run"** (F5)
3. Подожди 2-3 секунды

#### 4.4 Проверь результат

Должно показаться 2 таблицы:
- **admin_users** — 3 политики
- **org_users** — 4 политики

✅ Если видишь политики — всё отлично!

---

## ✅ ГОТОВО!

После выполнения обеих миграций:
1. Перезагрузи страницу Trinity (**Ctrl/Cmd + Shift + R**)
2. Теперь админы могут создавать организации через UI
3. Права доступа правильно настроены

---

## ❓ ЧТО ДЕЛАТЬ ЕСЛИ ОШИБКА?

### Ошибка: "policy already exists"
**Решение:** Это нормально! Политика уже создана. Продолжай дальше.

### Ошибка: "function is_admin() does not exist"
**Решение:** Нужно сначала создать функцию. Выполни:

```sql
-- Создай функцию is_admin() если её нет
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

Потом повтори миграции заново.

### Ошибка: "permission denied"
**Решение:** Убедись что:
1. Ты залогинен в правильный проект
2. У тебя права администратора проекта
3. Используется правильный Supabase project

### Другие ошибки
Скопируй текст ошибки и отправь мне — разберёмся!

---

## 🎓 ПОЛЕЗНЫЕ КОМАНДЫ

### Посмотреть все политики
```sql
SELECT * FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Удалить все политики с таблицы
```sql
-- Удалить все политики с organizations
DROP POLICY IF EXISTS "<имя_политики>" ON organizations;
```

### Проверить включён ли RLS
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'admin_users', 'org_users');
```

---

## 📚 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

### Что такое RLS (Row Level Security)?
Это защита на уровне БД. Каждая политика определяет:
- **Кто** может видеть/изменять данные
- **Какие** строки доступны пользователю

### Зачем это нужно?
1. **Безопасность:** Пользователи не видят данные других организаций
2. **Изоляция:** Каждая организация в своём "пузыре"
3. **Защита:** Даже если взломают API — БД защищена

### Как это работает?
```sql
-- Пример политики
CREATE POLICY "Users see own org clients" 
  ON clients FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()));
```

Эта политика означает:
- Применяется к таблице `clients`
- Только для операции `SELECT` (чтение)
- Условие: `org_id` клиента должен быть в списке организаций пользователя

---

**Вопросы?** Напиши мне — помогу разобраться! 🚀
