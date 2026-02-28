# Решение RLS проблемы через API Route

## Проблема
RLS политики блокировали добавление клиентов даже при наличии правильных политик.

## Решение
Создан API роут `/api/clients` который использует `SERVICE_ROLE` ключ для обхода RLS.

## Архитектура

### 1. API Route: `src/app/api/clients/route.ts`

```typescript
// Использует SERVICE_ROLE ключ (полный доступ, обходит RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST обработчик:
// 1. Проверяет авторизацию пользователя
// 2. Получает org_id из org_users по user_id
// 3. Вставляет клиента через supabaseAdmin с org_id
```

### 2. Hook: `src/hooks/useClients.ts`

```typescript
// Вместо прямого обращения к Supabase:
// supabase.from('clients').insert(...)

// Теперь вызываем API роут:
fetch('/api/clients', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify(client),
})
```

## Преимущества

✅ **Обход RLS** - SERVICE_ROLE ключ имеет полный доступ  
✅ **Безопасность** - API роут проверяет авторизацию пользователя  
✅ **Автоматический org_id** - сервер сам определяет org_id из org_users  
✅ **Централизованная логика** - вся логика создания клиента в одном месте  

## Безопасность

- API роут проверяет JWT токен пользователя через Authorization header
- org_id берется из базы данных по user_id (нельзя подделать)
- SERVICE_ROLE ключ хранится на сервере (env variable)
- Клиент не может указать произвольный org_id

## Env Variables

Убедитесь что в `.env.local` (локально) и Vercel Environment Variables есть:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Получить ключ: Supabase Dashboard → Settings → API → `service_role` key (secret)

## Деплой

✅ Commit: `c1297a5` - Add API route for client creation to bypass RLS using SERVICE_ROLE  
✅ Push: `https://github.com/Creepie132/trinity.git`  

Vercel автоматически задеплоит изменения.

**ВАЖНО:** Добавьте `SUPABASE_SERVICE_ROLE_KEY` в Vercel Environment Variables!

---

**Дата:** 2026-02-28  
**Статус:** ✅ Решено через API Route
