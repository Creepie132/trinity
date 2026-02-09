# 📋 О таблице auth.users

## Где находится?

`auth.users` — это **системная таблица Supabase** в схеме `auth` (не в `public`).

### Как посмотреть:

#### 1️⃣ Через SQL Editor:
```sql
-- Полная схема
SELECT * FROM auth.users WHERE email = 'creepie1357@gmail.com';

-- Только нужные поля
SELECT id, email, created_at, raw_user_meta_data 
FROM auth.users 
WHERE email = 'creepie1357@gmail.com';
```

#### 2️⃣ Через Dashboard:
1. Открой **Supabase Dashboard**
2. **Authentication** → **Users**
3. Видишь список всех пользователей

---

## Структура auth.users

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный ID пользователя |
| `email` | TEXT | Email |
| `encrypted_password` | TEXT | Зашифрованный пароль |
| `email_confirmed_at` | TIMESTAMPTZ | Когда подтвердил email |
| `last_sign_in_at` | TIMESTAMPTZ | Последний вход |
| `raw_user_meta_data` | JSONB | Метаданные (full_name, avatar, etc) |
| `raw_app_meta_data` | JSONB | Служебные данные |
| `created_at` | TIMESTAMPTZ | Дата регистрации |

---

## Как работает в Trinity:

### 1. Регистрация/Логин
```typescript
supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: 'John Doe'  // → попадет в raw_user_meta_data
    }
  }
})
```

### 2. Получение текущего пользователя
```typescript
const { data: { user } } = await supabase.auth.getUser()

// user.id → auth.users.id
// user.email → auth.users.email
// user.user_metadata.full_name → auth.users.raw_user_meta_data->>'full_name'
```

### 3. Связь с другими таблицами

#### admin_users
```sql
-- user_id ссылается на auth.users.id
CREATE TABLE admin_users (
  user_id UUID REFERENCES auth.users(id),
  -- ...
);
```

#### org_users
```sql
-- user_id ссылается на auth.users.id
CREATE TABLE org_users (
  user_id UUID REFERENCES auth.users(id),
  -- ...
);
```

---

## ⚠️ Важно:

### RLS на auth.users
- У тебя **НЕТ прямого доступа** к `auth.users` из браузера
- Только через **SQL Editor** (с Service Role)
- Или через `supabase.auth.getUser()` (получишь только себя)

### Обновление метаданных
```sql
-- Добавить/изменить full_name
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{full_name}',
  '"Vlad Khalphin"'
)
WHERE email = 'creepie1357@gmail.com';
```

---

## 🔧 Типичные запросы:

### Найти пользователя по email
```sql
SELECT id, email FROM auth.users WHERE email = 'user@example.com';
```

### Посмотреть метаданные
```sql
SELECT 
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'creepie1357@gmail.com';
```

### Найти всех пользователей организации
```sql
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  ou.role
FROM auth.users u
JOIN org_users ou ON ou.user_id = u.id
WHERE ou.org_id = 'your-org-id';
```

---

**Файлы:**
- `CREATE_ORG_FOR_ADMIN.sql` — создание организации с ручной заменой ID
- `QUICK_CREATE_ORG.sql` — создание организации одной командой (DO блок)
