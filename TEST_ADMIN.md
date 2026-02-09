# Временный обход для тестирования админки

## Если админка НЕ РАБОТАЕТ, сделайте это:

### 1. Проверьте что вы залогинены

Откройте консоль браузера (F12) и выполните:

```javascript
// Проверить есть ли сессия
localStorage.getItem('supabase.auth.token')
// Должно вернуть что-то длинное с токеном

// Или так:
document.cookie
// Должно содержать 'sb-' cookies
```

Если НЕТ — **залогиньтесь сначала!**

---

### 2. Создайте себя как админа в Supabase

**ВАЖНО:** Сделайте это БЕЗ Service Role Key (пока):

```sql
-- Шаг 1: Найдите свой user_id
SELECT id, email FROM auth.users;

-- Шаг 2: СКОПИРУЙТЕ свой UUID

-- Шаг 3: Вставьте СВОЙ UUID и EMAIL сюда:
INSERT INTO admin_users (user_id, email) 
VALUES ('ВСТАВЬТЕ_СЮДА_UUID', 'ВСТАВЬТЕ_СЮДА_EMAIL');

-- Шаг 4: Проверьте что запись создана:
SELECT * FROM admin_users;
```

---

### 3. Временно ОТКЛЮЧИТЕ проверку RLS

Если всё ещё не работает, временно отключите RLS на `admin_users`:

```sql
-- ВРЕМЕННО! Только для тестирования!
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
```

Обновите страницу — кнопка "אדמין" должна появиться.

---

### 4. После тестирования ВКЛЮЧИТЕ обратно:

```sql
-- Включить RLS обратно
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
```

---

### 5. Добавьте Service Role Key (для production)

1. Supabase Dashboard → Settings → API
2. Скопируйте **service_role** key (НЕ anon!)
3. Добавьте в `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Перезапустите сервер:
```bash
npm run dev
```

---

## Отладка в реальном времени

Откройте консоль браузера и выполните:

```javascript
// Проверить статус админа через API
fetch('/api/admin/check', { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log('Admin check:', d))

// Должно вернуть:
// { isAdmin: true, user: { id: '...', email: '...' } }
```

Если `isAdmin: false` — вы не в таблице `admin_users`.

Если `401 Unauthorized` — вы не залогинены.

---

## Быстрая диагностика

1. ✅ Залогинен? → Проверьте localStorage/cookies
2. ✅ Есть в admin_users? → SELECT * FROM admin_users
3. ✅ Service Role Key? → Проверьте .env.local
4. ✅ RLS включен? → Временно отключите для теста

---

**После того как всё заработает, ОБЯЗАТЕЛЬНО включите RLS обратно!**
