
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
