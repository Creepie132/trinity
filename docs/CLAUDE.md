
---

### 02.04.2026 — Система уведомлений о заказах Beautymania

**Commit 1fcf368** — Order notification system

#### Блок 1: WA-алерт владельцу (fire-and-forget)
- `order/route.ts` — функция `sendOwnerWaAlert()`:
  - Читает `notify_new_orders_wa` + `notification_phone` из organizations
  - AbortController таймаут 8 сек — Whapi не блокирует создание заказа
  - Вызывается через `.catch()` — полностью изолирован от основного потока
  - Формат: "🔔 Новый заказ с сайта! Товар: [..]. Сумма: ₪[..]. Клиент: [..]. Перейдите в CRM."

#### Блок 2: Настройки уведомлений (БД + UI)
- Миграция `add_order_notification_settings`:
  - `organizations.notify_new_orders_wa` (boolean, default false)
  - `organizations.notification_phone` (text)
- `settings/notifications/page.tsx` — новая карточка "WhatsApp-алерты — заказы с сайта":
  - Тумблер включения/выключения
  - Поле номера телефона (показывается при включённом тумблере)
  - Превью формата сообщения в UI
  - Сохраняется той же кнопкой что Telegram

#### Блок 3: In-App уведомления (Realtime + Audio)
- `public/sounds/notification.wav` — двойной тон 880+1100Hz, 0.3 сек, с огибающей
- `src/components/providers/SiteOrdersRealtimeProvider.tsx`:
  - Supabase Realtime `INSERT` на `site_orders` с фильтром `org_id=eq.{orgId}`
  - HTML5 Audio API — preload + autoplay при событии
  - `toast.custom()` через Sonner — оранжевая рамка, имя/товар/сумма
  - Кнопка "Перейти к заказу" → `router.push('/sales')` + dismiss
  - Инвалидация React Query `site-orders` и `new-orders-count`
  - Защита от дублей StrictMode — глобальный флаг `channelCreated`
- `DashboardShell.tsx` — провайдер монтируется глобально

#### Commit 21b08ab — Full site-orders UI cycle
- `SiteOrdersPanel.tsx` — обновлены статусы: new/confirmed/shipped/delivered/cancelled
- `OrderDetailModal.tsx` — кнопки смены статуса (Подтвердить/Отправлен/Доставлен/Отменить)
- `useSiteOrders.ts` — обновлены типы статусов
- `site-orders/[id]/route.ts` — WA клиенту при каждой смене статуса (4 шаблона)
- `webhooks/products-updated/route.ts` — инвалидация кэша при изменении products
- Supabase миграции: `extend_site_orders_statuses_and_stock_rpc`, `add_site_orders_idempotency`

---

### 02.04.2026 — Kira AI Agent: Level 1 + Level 2

---

#### Kira Level 1 — Базовый стриминговый чат (Vercel AI SDK)

**Commit `feat: Kira AI — Level 1 streaming chat`**

**Новые зависимости:**
- `ai@6.x` — Vercel AI SDK (стриминг, `streamText`, `useChat`)
- `@ai-sdk/openai` — провайдер OpenAI
- `@ai-sdk/react` — клиентский хук `useChat`
- `OPENAI_API_KEY` — добавлен в `.env.local`

**Новые файлы:**

`src/app/api/kira/route.ts` — потоковый POST-роут:
- `getAuthContext()` первым вызовом (org_id только из DB)
- `streamText` с моделью `gpt-4o-mini`
- Системный промпт: Кира, женский род, без markdown-заголовков, кратко и профессионально
- `tools: {}` — зарезервировано для Supabase-инструментов (Level 3)
- `toTextStreamResponse()` — отдача стрима клиенту

`src/components/kira/KiraChatPanel.tsx` — чат-компонент (заменил `KiraBlock`):
- `useChat` из `@ai-sdk/react` с `DefaultChatTransport({ api, body })`
- Волна `KiraWave` переключается в `'thinking'` во время стрима
- Сообщения пользователя (индиго, справа) и Киры (тёмный, слева) визуально различаются
- Bounce-индикатор ожидания, автоскролл, обработка ошибок
- Собственный `useState` для инпута (в `ai@6` нет `handleInputChange`)

`src/components/layout/RightPanel.tsx` — обновлён:
- Удалён `KiraBlock` (только волна без интерактива)
- Добавлен `KiraChatPanel` через `dynamic()` с `ssr: false`
- `orgId` из `useBranch()` — хук уже существовал в проекте

**Замечания по `ai@6` breaking changes (для будущего):**
- `api/body` передаются через `transport: new DefaultChatTransport({...})`, не напрямую
- `initialMessages` → `messages` в `useChat`
- `handleSubmit/input` → `sendMessage(message)` + собственный state
- `isLoading` → `status === 'streaming' | 'submitted'`
- `maxTokens` → `maxOutputTokens`
- `toDataStreamResponse()` → `toTextStreamResponse()`
- `sendMessage` требует `parts: [{ type: 'text', text }]`

---

#### Kira Level 2 — Долговременная память (Гиппокамп)

**Commit `feat: Kira Level 2 — долговременная память`**

**Миграция Supabase** (`supabase/migrations/20260402_kira_memory.sql`):
- `kira_sessions(id, org_id, created_at)` — сессии по org
- `kira_messages(id, session_id, org_id, role, content, created_at)` — история
- `org_id` денормализован в `kira_messages` для RLS без JOIN
- RLS-политики: пользователь читает/пишет только в сессии своего `org_id`
- Индексы: `(org_id, created_at desc)` на sessions, `(session_id, created_at asc)` на messages

**Архитектурные решения (отличие от стандартного подхода):**
- `org_id` никогда не берётся из `body` — только из `getAuthContext()` (Trinity security rule)
- Одна активная сессия на `org_id` (не по `localStorage`) — сервер сам находит последнюю
- `sessionId` верифицируется через `eq('org_id', orgId)` перед загрузкой истории — чужой sessionId не пройдёт
- Лимит истории: последние 20 сообщений (не вся история в контекст)

**Новый роут:** `src/app/api/kira/session/route.ts` (POST):
- Ищет последнюю сессию орга или создаёт новую
- Возвращает `{ sessionId, messages[] }` — один запрос вместо двух
- Используется при монтировании `KiraChatPanel`

**Обновлён:** `src/app/api/kira/route.ts`:
- Загружает историю по `sessionId` с проверкой `org_id`
- Берёт только последнее user-сообщение из `incomingMessages` (избегает дублирования с историей)
- `onFinish: async ({ text })` — фоновая запись в `kira_messages` после завершения стрима, не блокирует отдачу

**Обновлён:** `src/components/kira/KiraChatPanel.tsx`:
- `useEffect` при монтировании → `POST /api/kira/session` → получает `sessionId` + историю
- История загружается в `messages` хука `useChat` через `initialMessages`
- Скелетон-лоадер пока сессия инициализируется
- После перезагрузки страницы Кира помнит весь предыдущий разговор

---
