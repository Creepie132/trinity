# ✅ Авто-создание организации - Деплой завершён

## Что изменено

### Файл: `src/app/callback/route.ts`

**Новая логика:**

1. После авто-линка проверяется: **является ли пользователь owner хотя бы одной организации**
2. Если **НЕТ** → создаётся новая организация автоматически:
   - Имя: `{email_prefix}_{random}`
   - Email: из Google Auth
   - Subscription: `none`
   - Модули: только `clients: true`
   - Пользователь добавляется в `org_users` с `role = 'owner'`
3. Если создание успешно → редирект в `/dashboard`
4. Если ошибка → редирект в `/onboarding/business-info` (fallback)

### Сценарии работы

#### Сценарий 1: Новый пользователь
```
Пользователь логинится первый раз
    ↓
Нет записи в org_users
    ↓
Создаётся новая организация
    ↓
Пользователь → owner
    ↓
Редирект в dashboard
```

#### Сценарий 2: Приглашённый пользователь (не owner)
```
Пользователь логинится
    ↓
Есть запись в org_users с role='user' или 'manager'
    ↓
НЕТ записи с role='owner'
    ↓
Создаётся новая организация
    ↓
Пользователь → owner новой организации (старая связь сохраняется)
    ↓
Редирект в dashboard
```

#### Сценарий 3: Существующий owner
```
Пользователь логинится
    ↓
Есть запись в org_users с role='owner'
    ↓
Редирект в dashboard (ничего не создаётся)
```

---

## Исправление существующего пользователя

### Проблема
Пользователь `ambersolutions.systems@gmail.com` добавлен в `org_users` с `org_id = b98d2072` (организация Amber Solutions), но не как `owner`.

### Решение

#### Вариант 1: Удалить связь и создать новую организацию (рекомендуется)

1. Выполнить SQL:
```sql
DELETE FROM org_users
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ambersolutions.systems@gmail.com'
)
AND org_id = 'b98d2072-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; -- замените на полный UUID
```

2. Пользователь разлогинивается
3. Логинится снова
4. Система автоматически создаст новую организацию
5. Пользователь будет добавлен как `owner`

#### Вариант 2: Изменить роль на owner

Если организация `b98d2072` принадлежит этому пользователю:
```sql
UPDATE org_users
SET role = 'owner'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ambersolutions.systems@gmail.com'
)
AND org_id = 'b98d2072-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; -- замените на полный UUID
```

#### Вариант 3: Создать новую организацию вручную

См. файл `FIX_USER_ORGANIZATION.sql` → ВАРИАНТ 3

---

## Коммиты

```
commit 04480d1
Feat: Авто-создание организации при первом логине

- При логине проверяется: есть ли у пользователя организация с role='owner'
- Если нет owner организации → создаётся новая автоматически
- Пользователь добавляется в org_users как owner
```

```
commit efdfdec
Fix: Улучшение RLS для clients + проверка org_id в API
```

---

## Файлы

1. `src/app/callback/route.ts` - **изменён** (авто-создание организации)
2. `FIX_USER_ORGANIZATION.sql` - **новый** (SQL для исправления существующих пользователей)
3. `AUTO_ORG_CREATION_DONE.md` - **новый** (эта документация)

---

## Тестирование

### Тест 1: Новый пользователь
1. Открыть приложение в инкогнито
2. Login with Google (новый email)
3. После редиректа → должен быть в dashboard
4. Проверить в Supabase:
```sql
SELECT * FROM organizations WHERE email = 'test@example.com';
SELECT * FROM org_users WHERE email = 'test@example.com';
-- role должен быть 'owner'
```

### Тест 2: Существующий пользователь (не owner)
1. Создать пользователя вручную с role='user'
2. Залогиниться
3. Должна создаться новая организация
4. Пользователь должен стать owner новой организации
5. Старая связь сохраняется (мультитенантность)

### Тест 3: Существующий owner
1. Залогиниться как существующий owner
2. Должен сразу попасть в dashboard
3. Новая организация НЕ создаётся

---

## Важные детали

### Структура организации

```json
{
  "name": "ambersolutions_a1b2",
  "email": "user@example.com",
  "subscription_status": "none",
  "features": {
    "business_info": {
      "display_name": "ambersolutions_a1b2",
      "owner_name": "User Name",
      "mobile": "",
      "email": "user@example.com",
      "address": "",
      "city": "",
      "business_type": "other",
      "description": "Автоматически созданная организация"
    },
    "modules": {
      "clients": true,
      "visits": false,
      "booking": false,
      // ... все остальные false
    }
  }
}
```

### Имя организации
Генерируется как: `{email_prefix}_{random_4_chars}`

Например:
- `ambersolutions.systems@gmail.com` → `ambersolutions_a1b2`
- `user@example.com` → `user_x9k3`

### Fallback
Если создание организации не удалось, пользователь перенаправляется на `/onboarding/business-info` — где может заполнить форму вручную.

---

## Следующие шаги

1. **Vercel**: Деплой произойдёт автоматически
2. **Supabase**: Выполнить SQL из `FIX_USER_ORGANIZATION.sql` для пользователя `ambersolutions.systems@gmail.com`
3. **Тест**: Пользователь должен разлогиниться и залогиниться снова

---

## Архитектура

```
┌─────────────────────────────────────────────────┐
│  Google Auth Callback                            │
│  src/app/callback/route.ts                       │
└───────────────┬─────────────────────────────────┘
                │
                ▼
      ┌─────────────────────┐
      │  Auto-link invited  │
      │  users (user_id=NULL)│
      └──────────┬───────────┘
                 │
                 ▼
      ┌─────────────────────┐
      │  Check if admin     │
      └──────────┬───────────┘
                 │ Yes → dashboard
                 │ No ↓
                 ▼
      ┌─────────────────────┐
      │  Check if owner     │
      │  (role='owner')     │
      └──────────┬───────────┘
                 │ Yes → dashboard
                 │ No ↓
                 ▼
      ┌─────────────────────────────┐
      │  Create new organization    │
      │  - Generate unique name      │
      │  - Set email from auth       │
      │  - Basic features            │
      │  - Link user as owner        │
      └──────────┬───────────────────┘
                 │ Success → dashboard
                 │ Error → onboarding/business-info
                 ▼
```

---

## Безопасность

### RLS Policies
Организации строго изолированы через `org_id`:
- Пользователь видит только клиентов своей организации
- При добавлении клиента `org_id` берётся из `org_users`
- Нельзя получить доступ к данным чужой организации

### Мультитенантность
Пользователь может быть в нескольких организациях:
- `org_users` содержит все связи
- `useAuth` загружает список всех организаций
- Можно переключаться через `setCurrentOrg()`

---

## Troubleshooting

### Организация не создалась
**Проверить:**
1. Логи Vercel: `vercel logs --follow | grep Callback`
2. Ошибки создания:
```sql
SELECT * FROM organizations WHERE email = 'user@example.com' ORDER BY created_at DESC LIMIT 1;
```

### Пользователь не owner
**Проверить:**
```sql
SELECT ou.role, o.name 
FROM org_users ou
JOIN organizations o ON o.id = ou.org_id
WHERE ou.email = 'user@example.com';
```

Если `role != 'owner'` — выполнить SQL из `FIX_USER_ORGANIZATION.sql`.

### Пользователь видит чужих клиентов
**Причина:** Неправильный `org_id` в RLS

**Решение:** Выполнить `FIX_CLIENT_RLS_FINAL.sql`

---

## Мониторинг

### Dashboard Supabase
1. **Table Editor** → `organizations` → проверить новые записи
2. **Table Editor** → `org_users` → проверить `role='owner'`
3. **Auth** → Users → проверить привязки

### Vercel Logs
```bash
vercel logs --follow
# Искать:
# [Callback] User has no owner organization, creating new org...
# [Callback] Organization created: xxx
# [Callback] User linked as owner to new organization
```

---

**Версия:** 1.0.0  
**Дата:** 2026-02-28  
**Автор:** Trinity Bot
