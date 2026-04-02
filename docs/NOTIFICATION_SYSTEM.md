# Notification System 2.0 — Trinity CRM
> Архитектурный справочник · Amber Solutions · Апрель 2026

---

## Обзор

Trinity поддерживает **3 канала уведомлений**:
- **Push** — Web Push API (VAPID) прямо в браузер/телефон
- **Telegram** — сообщения в личный бот пользователя
- **Email** *(зарезервировано, флаг в JSONB, пока не активен)*

Каждый пользователь настраивает каналы **для каждого события отдельно** через `/settings/notifications`.

---

## Схема данных

### `notification_preferences`

```sql
CREATE TABLE notification_preferences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
```

**Структура JSONB:**
```json
{
  "new_visit":    { "push": true,  "telegram": false, "email": false },
  "new_payment":  { "push": true,  "telegram": true,  "email": false },
  "new_client":   { "push": false, "telegram": false, "email": false },
  "new_order":    { "push": true,  "telegram": true,  "email": false },
  "ai_fallback":  { "push": true,  "telegram": true,  "email": false },
  "stock_alerts": { "push": true,  "telegram": false, "email": false },
  "security_login":{"push": true,  "telegram": true,  "email": false }
}
```

**Дефолт** (если записи нет): `{ push: true, telegram: false, email: false }`

### `user_devices`

```sql
CREATE TABLE user_devices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_type  text NOT NULL DEFAULT 'web',  -- 'web' | 'fcm' | 'apns'
  endpoint     text NOT NULL UNIQUE,
  p256dh       text,
  auth_key     text,
  user_agent   text,
  is_active    boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ...
);
```

> **Примечание:** Web Push подписки хранятся в `push_subscriptions` (legacy).
> `user_devices` — расширенная таблица для будущей FCM/APNS интеграции.

---

## API Routes

### `GET /api/notifications/preferences`

Возвращает `{ preferences: NotificationPreferences }` для текущего user+org.
Если записи нет — возвращает `{}` (фронтенд использует дефолты).

### `PUT /api/notifications/preferences`

```typescript
// Body
{ eventKey: string, channel: 'push' | 'telegram' | 'email', value: boolean }

// Валидация
eventKey: /^[a-z_]{1,64}$/   // только строчные + underscore
channel: allowlist ['push', 'telegram', 'email']
value: boolean

// Ответ
{ ok: true, preferences: NotificationPreferences }
```

Использует **atomic upsert** `ON CONFLICT (org_id, user_id)` — идемпотентный.

---

## Хук: `useNotificationPreferences`

```typescript
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'

const { preferences, loading, toggleChannel, getChannels, isSaving } = useNotificationPreferences()

// Получить каналы события (с дефолтами)
const channels = getChannels('new_visit') // { push: true, telegram: false, email: false }

// Optimistic toggle
toggleChannel('new_visit', 'telegram', true)

// Проверить идёт ли сохранение
isSaving('new_visit', 'telegram') // boolean
```

---

## Edge Function: `send-notification`

**URL:** `{SUPABASE_URL}/functions/v1/send-notification`

**Auth:** `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}` — только internal вызовы.

**Request:**
```typescript
{
  event_type: string   // 'new_visit' | 'new_payment' | ...
  org_id:     string   // UUID
  payload: {
    title: string
    body:  string
    url?:  string      // deep-link в CRM
    icon?: string
  }
}
```

**Response:**
```json
{ "ok": true, "telegramSent": 1, "pushSent": 2, "pushExpired": 0, "errors": [] }
```

**Алгоритм:**
1. Читает `notification_preferences` для всего орга
2. Строит списки: `telegramUserIds`, `pushUserIds`
3. Telegram: читает `telegram_chat_id` из `organizations`, отправляет через Bot API
4. Push: читает `push_subscriptions` для `pushUserIds`, отправляет VAPID
5. Автоматически удаляет истёкшие push подписки (410/404)

**Env vars required:**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
VAPID_PRIVATE_KEY        # pkcs8 base64url
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_EMAIL              # mailto:admin@ambersol.co.il
```

---

## Хелпер: `dispatchNotification`

```typescript
// src/lib/dispatch-notification.ts
import { dispatchNotification } from '@/lib/dispatch-notification'

// Fire-and-forget — никогда не бросает, не блокирует caller
void dispatchNotification({
  event_type: 'new_visit',
  org_id: orgId,
  payload: {
    title: '📅 ביקור נוצר',
    body: `${time} — ${service}`,
    url: '/diary',
  },
})
```

Используется во всех API routes после успешного создания сущности.

---

## Добавить новое событие

### 1. Добавить в UI (`page.tsx`)

```typescript
// В массив EVENTS:
{
  key: 'my_event',
  icon: SomeIcon,
  group: 'visits',     // visits | shop | whatsapp_ai | security
  labelHe: 'אירוע חדש',
  labelRu: 'Новое событие',
  descHe: 'תיאור קצר',
  descRu: 'Краткое описание',
}
```

### 2. Добавить trigger в API route

```typescript
void dispatchNotification({
  event_type: 'my_event',
  org_id: orgId,
  payload: { title: '...', body: '...', url: '/...' },
})
```

### 3. Добавить в `usePushSettings` (если нужна legacy push-очередь)

```typescript
// В DEFAULT_PUSH_SETTINGS:
my_event: true,
```

---

## Текущие события

| event_type | Trigger | Канал по умолчанию |
|---|---|---|
| `new_visit` | POST /api/visits | Push |
| `new_payment` | POST /api/payments | Push |
| `new_client` | POST /api/clients | Push |
| `new_order` | POST /api/beautymania/order | Push + TG |
| `visit_reminder` | cron/push-events | Push |
| `stock_alerts` | cron | Push |
| `task_mentions` | tasks API | Push |
| `birthday` | cron/birthdays | Push |
| `ai_fallback` | wa-inbox | Push + TG |
| `security_login` | auth hook | Push + TG |

---

## Деплой Edge Function

```bash
# Первый деплой
npx supabase functions deploy send-notification \
  --project-ref tjryzcqvsavtllahjyrj

# После изменений
npx supabase functions deploy send-notification \
  --project-ref tjryzcqvsavtllahjyrj --no-verify-jwt
```

> Или через Supabase Dashboard → Edge Functions → Deploy → загрузить `index.ts`.

---

## Известные ограничения

1. **Telegram**: org-level конфиг (один `chat_id` на орг). Будущее: per-user chat_id в `user_profiles`.
2. **Edge Function деплой**: требует `SUPABASE_ACCESS_TOKEN` или ручной деплой через Dashboard.
3. **Email канал**: флаг в JSONB есть, обработчик в Edge Function не реализован — TODO.
4. **FCM/APNS**: `user_devices` таблица готова, но отправка через FCM не реализована — TODO.
