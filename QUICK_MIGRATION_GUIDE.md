# ⚡ БЫСТРАЯ ИНСТРУКЦИЯ: SQL МИГРАЦИИ

**5 минут, 2 команды**

---

## 🎯 ЧТО СДЕЛАТЬ

1. Открой [supabase.com](https://supabase.com) → твой проект → **SQL Editor**
2. Скопируй и выполни **2 SQL скрипта** ниже
3. Готово!

---

## 📋 МИГРАЦИЯ #1: Organizations

**Что делает:** Разрешает админам создавать организации

**Как выполнить:**
1. SQL Editor → New query
2. Скопируй **всё** ниже
3. Вставь в редактор
4. Нажми **Run** (F5)

```sql
-- МИГРАЦИЯ #1: RLS для Organizations
DROP POLICY IF EXISTS "Admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Admins full access to organizations" ON organizations;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to organizations"
  ON organizations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid() AND role = 'owner'))
  WITH CHECK (id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid() AND role = 'owner'));

-- Проверка
SELECT policyname FROM pg_policies WHERE tablename = 'organizations';
```

✅ **Ожидаемый результат:** Список из 3 политик

---

## 📋 МИГРАЦИЯ #2: Admin & Org Users

**Что делает:** Правильные права для управления пользователями

**Как выполнить:**
1. SQL Editor → New query (или очисти редактор)
2. Скопируй **всё** ниже
3. Вставь в редактор
4. Нажми **Run** (F5)

```sql
-- МИГРАЦИЯ #2: RLS для admin_users и org_users

-- admin_users
DROP POLICY IF EXISTS "Admins can view all admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage admin_users" ON admin_users;
DROP POLICY IF EXISTS "Users can view themselves" ON admin_users;

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all admin_users"
  ON admin_users FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage admin_users"
  ON admin_users FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users can view themselves"
  ON admin_users FOR SELECT USING (user_id = auth.uid());

-- org_users
DROP POLICY IF EXISTS "Admins can view all org_users" ON org_users;
DROP POLICY IF EXISTS "Admins can manage org_users" ON org_users;
DROP POLICY IF EXISTS "Users can view their org members" ON org_users;
DROP POLICY IF EXISTS "Owners can manage their org users" ON org_users;

ALTER TABLE org_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all org_users"
  ON org_users FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage org_users"
  ON org_users FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users can view their org members"
  ON org_users FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid()));

CREATE POLICY "Owners can manage their org users"
  ON org_users FOR ALL
  USING (org_id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid() AND role = 'owner'))
  WITH CHECK (org_id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid() AND role = 'owner'));

-- Проверка
SELECT 'admin_users' as table_name, policyname FROM pg_policies WHERE tablename = 'admin_users'
UNION ALL
SELECT 'org_users', policyname FROM pg_policies WHERE tablename = 'org_users'
ORDER BY table_name, policyname;
```

✅ **Ожидаемый результат:** Список из 7 политик (3 для admin_users, 4 для org_users)

---

## ✅ ГОТОВО!

После выполнения:
1. Перезагрузи Trinity (**Ctrl+Shift+R**)
2. Админы теперь могут создавать организации
3. Права доступа настроены правильно

---

## ❌ ЕСЛИ ОШИБКА "is_admin() does not exist"

Сначала создай функцию:

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

Потом повтори миграции заново.

---

**Вопросы?** Открой `HOW_TO_RUN_SQL_MIGRATIONS.md` для подробной инструкции.
