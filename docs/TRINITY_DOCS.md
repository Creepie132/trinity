# Trinity CRM — Полная документация
> Amber Solutions · ambersol.co.il · Последнее обновление: 04.04.2026

---

## 📋 Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Инфраструктура](#2-инфраструктура)
3. [Архитектура](#3-архитектура)
4. [База данных — таблицы и схема](#4-база-данных)
5. [RLS и безопасность](#5-rls-и-безопасность)
6. [Аутентификация и роли](#6-аутентификация-и-роли)
7. [Ветки (филиалы)](#7-ветки-филиалы)
8. [Платежи и Tranzila](#8-платежи-и-tranzila)
9. [WhatsApp (Whapi)](#9-whatsapp-whapi)
10. [Лендинг /landing](#10-лендинг-landing)
11. [UI-компоненты](#11-ui-компоненты)
12. [Демо-режим](#13-демо-режим)
13. [Beautymania интеграция](#14-beautymania-интеграция)
14. [Kira AI агент](#15-kira-ai-агент)
15. [Правила разработки](#16-правила-разработки)
16. [Changelog — апрель 2026](#17-changelog)

---

## 1. Обзор проекта

**Trinity CRM** — SaaS CRM-платформа для малого бизнеса в Израиле: салоны, барбершопы, клиники, автомастерские, юристы, риелторы.

| Параметр | Значение |
|---|---|
| Продукт | Trinity CRM |
| Домен | https://ambersol.co.il |
| GitHub | github.com/Creepie132/trinity |
| Локальный путь | `F:\Amber_solutions_Kira\Trinity` |
| Stack | Next.js App Router, Supabase, TypeScript, Tailwind CSS |
| Деплой | Vercel |
| Текущие клиенты | Beautymania (Анета), Hair Rehab (Ксения) |

### Тарифные планы

| План | Цена | Назначение |
|---|---|---|
| Base | ₪199/мес | Старт, клиенты, визиты, склад |
| Pro | ₪249/мес | + онлайн-запись, статистика, SMS |
| Enterprise | ₪499/мес | + филиалы, лояльность, до 5 сотрудников |
| Custom | по выбору | Индивидуальные модули |
| Настройка | ₪500 разово | Выезд + настройка + обучение |

---

## 2. Инфраструктура

### Vercel
| Параметр | Значение |
|---|---|
| Team ID | `team_LMjQcFhJbvsscDS6v1qU2If9` |
| Project ID | `prj_4LI8wdySl50XqA52ymhhC4IcY8JI` |
| Build Machine | Basic |
| Preview URL | push в `main` |
| Production | `git push origin main:production` |

### Supabase
| Параметр | Значение |
|---|---|
| Project ID | `tjryzcqvsavtllahjyrj` |
| Region | eu-central-1 |
| Realtime | включён для `wa_conversations`, `wa_messages`, `site_orders` |

### Переменные окружения (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TRANZILA_TERMINAL_ID=ambersolt
TRANZILA_TERMINAL_PASSWORD=
TRANZILA_TOKEN_TERMINAL=ambersolttok
TRANZILA_TOKEN_PASSWORD=
TRANZILA_PUBLIC_KEY=
TRANZILA_PRIVATE_KEY=
WHAPI_API_KEY=
WHAPI_INSTANCE_ID=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=https://www.ambersol.co.il
```

### Деплой-процедура (ОБЯЗАТЕЛЬНО)
```powershell
# 1. Чистый билд
npm run build     # должен завершиться без ошибок

# 2. Коммит и пуш (preview)
git add -A
git commit -m "feat: описание"
git push origin main

# 3. Выход в production
git push origin main:production
```
**Никогда не деплоить вслепую без чистого билда.**

---

## 3. Архитектура

### Стек
- **Frontend**: Next.js 16 App Router, React 18, TypeScript
- **Стили**: Tailwind CSS, shadcn/ui, Lucide React
- **Состояние**: React Query (TanStack Query v5), Zustand (минимально)
- **Backend**: Next.js API Routes (serverless)
- **БД**: Supabase (PostgreSQL 15 + RLS + Realtime)
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **Storage**: Supabase Storage (фото клиентов, документы)
- **Деплой**: Vercel

### Структура директорий
```
src/
├── app/
│   ├── (dashboard)/          # Основные страницы приложения
│   │   ├── clients/          # База клиентов
│   │   ├── diary/            # Дневник записей
│   │   ├── payments/         # Платежи
│   │   ├── inventory/        # Склад
│   │   ├── sales/            # Продажи
│   │   ├── finances/         # Финансы
│   │   ├── inbox/            # WhatsApp inbox
│   │   ├── office/           # Кабинет руководителя
│   │   └── settings/         # Настройки
│   ├── (worker)/             # Изолированный раздел для сотрудников
│   │   ├── worker/           # Дашборд сотрудника
│   │   ├── worker/pipeline/  # Kanban пайплайн
│   │   └── worker/meetings/  # Встречи
│   ├── admin/                # Панель суперадмина
│   ├── api/                  # API маршруты
│   ├── landing/              # Лендинг (публичный)
│   ├── demo/                 # Демо-режим
│   └── login/                # Аутентификация
├── components/
│   ├── ui/                   # Базовые UI (Modal, WizardModal, etc.)
│   ├── modals/               # Модальные окна фич
│   ├── payments/             # PaymentDetailsDrawer, etc.
│   ├── visits/               # CompleteVisitPaymentDialog
│   └── providers/            # React провайдеры
├── hooks/                    # Custom hooks
├── lib/                      # Утилиты и сервисы
│   ├── auth-helpers.ts       # getAuthContext()
│   ├── supabase/             # Supabase clients
│   ├── tranzila.ts           # Tranzila payment links
│   ├── tranzila-invoices.ts  # Tranzila Invoices API
│   └── tranzila-webhook.ts   # Webhook security
├── contexts/                 # React Contexts
└── types/                    # TypeScript типы
```


---

## 4. База данных

### Ключевые таблицы

| Таблица | Назначение | Ключевые колонки |
|---|---|---|
| `organizations` | Одна запись = один клиент Trinity | id, name, features(jsonb), plan, subscription_status |
| `org_users` | Членство пользователей в org | user_id, org_id, role |
| `branches` | Филиал → родительская org | id, parent_org_id, child_org_id |
| `user_active_branch` | Активная ветка пользователя | user_id, active_org_id |
| `clients` | CRM-клиенты бизнеса | id, org_id, first_name, last_name, phone, email |
| `visits` | Записи/визиты | id, org_id, client_id, staff_id, started_at, status |
| `payments` | Платежи | id, org_id, client_id, amount, status, tranzila_document_id |
| `products` | Товары/материалы | id, org_id, name, price, stock_quantity |
| `inventory_transactions` | Движение склада | id, org_id, product_id, type, quantity |
| `sales` | Продажи | id, org_id, client_id, total_amount, status |
| `sale_items` | Позиции продажи | id, sale_id, org_id, product_id, quantity, price |
| `site_orders` | Заказы с сайта Beautymania | id, org_id, client_id, sale_id, status |
| `wa_conversations` | WhatsApp чаты | id, org_id, client_id, phone, status |
| `wa_messages` | Сообщения WA | id, conversation_id, org_id, body, direction |
| `wa_integrations` | Настройки WA | id, org_id, provider_type, instance_id |
| `wa_send_log` | Лог отправок WA | id, org_id, client_id, status |
| `deals` | Сделки (CRM) | id, org_id, client_id, assigned_to, stage_id |
| `deal_stages` | Этапы воронки | id, org_id, name, position |
| `work_shifts` | Смены сотрудников | id, org_id, user_id, started_at |
| `audit_log` | Аудит действий | id, org_id, action, entity_type, entity_id |
| `staff_permissions` | Права сотрудников | id, org_id, user_id, permissions(jsonb) |
| `push_subscriptions` | Web push подписки | id, org_id, user_id, subscription(jsonb) |
| `revenue_logs` | Доходы сотрудников | id, org_id, worker_id, amount |
| `expenses` | Расходы | id, org_id, amount, category |
| `impersonation_sessions` | Сессии impersonation | id, admin_id, target_org_id, token |
| `org_receipt_settings` | Настройки квитанций | id, org_id, provider, document_type, is_enabled |

### FK-индексы (добавлены 01.04.2026)
После аудита Supabase advisories добавлены 15 недостающих индексов на FK-колонки:
- `client_photos(visit_id)`, `deals(org_id, stage_id)`
- `outbound_queue(org_id, client_id)`, `product_relations(org_id, product_id, related_id)`
- `sale_items(product_id)`, `sales(payment_id)`
- `site_orders(org_id, client_id, sale_id)`, `wa_conversations(client_id)`
- `wa_messages(conversation_id)`, `work_shifts(org_id)`

---

## 5. RLS и безопасность

### Принцип

**Каждая таблица имеет RLS.** Данные одного клиента никогда не попадают к другому. Авторизация только через `auth.uid()` внутри политик — никаких client-side заголовков.

### RLS initplan оптимизация (01.04.2026)

Во всех RLS-политиках (34 политики на 30+ таблицах) заменены вызовы:
- `auth.uid()` → `(SELECT auth.uid())`
- `auth.role()` → `(SELECT auth.role())`

**Причина**: PostgreSQL вычисляет `auth.uid()` на каждую строку (O(n)). С `SELECT` — один раз на запрос (O(1)). Эффект заметен на больших таблицах.

### Паттерн политики (правильный)

```sql
-- ✅ Правильно — один вызов на запрос
CREATE POLICY "org_isolation" ON public.payments
  AS PERMISSIVE FOR ALL
  USING (org_id IN (
    SELECT org_users.org_id FROM org_users
    WHERE org_users.user_id = (SELECT auth.uid())
  ));

-- ❌ Неправильно — вызов на каждую строку
USING (org_id IN (
  SELECT org_id FROM org_users
  WHERE user_id = auth.uid()
));
```

### Таблицы с `service_role_only`
- `payment_attempts` — только сервер
- `impersonation_sessions` — только сервер

### Multiple permissive policies (исправлено 01.04.2026)

Устранены overlapping политики на таблицах:
- **`staff_permissions`**: удалены дубли `staff_view_own_permissions`, `owner_manages_permissions`
- **`inventory_transactions`**: удалены старые `inventory_select`, `inventory_insert` (через `get_user_org_ids()`)
- **`branches`, `deal_stages`, `deal_tags`, `product_relations`, `sales_plans`**: ALL-политики разбиты на INSERT/UPDATE/DELETE чтобы не перекрываться с SELECT

### Удалённые дублирующие индексы (01.04.2026)

```sql
-- Дубли audit_log
idx_audit_date  → дубль idx_audit_log_created_at
idx_audit_org   → дубль idx_audit_log_org_id

-- 43 неиспользуемых индекса из Supabase advisories
-- (idx_deals_assigned_last_contact, idx_products_name_trgm, и др.)
```

---

## 6. Аутентификация и роли

### Основной хелпер

```typescript
// src/lib/auth-helpers.ts
const auth = await getAuthContext()
// Возвращает: { user, orgId, activeOrgId, role, isAdmin }
```

- `orgId` — основная org пользователя
- `activeOrgId` — активная ветка (читается из `user_active_branch`, НЕ из заголовков)
- `isAdmin` — суперадмин Amber Solutions (проверяется через JWT, `useIsAdminFast`)
- `role` — роль в org: `owner` | `admin` | `staff`

### Клиенты Supabase

| Файл | Использование |
|---|---|
| `src/lib/supabase/server.ts` | Cookie-based client (для обычных запросов с RLS) |
| `src/lib/supabase-service.ts` | Service role (обходит RLS, только после проверки auth) |

### Роли пользователей

| Роль | Доступ |
|---|---|
| `owner` | Полный доступ к org, управление настройками, staff |
| `admin` | Управление клиентами, платежами, данными |
| `staff` | Ограниченный доступ через `staff_permissions` |
| `worker` | Изолированный раздел `/worker` — только свои данные |
| superadmin | Через `admin_users` таблицу — полный доступ ко всем org |

### Impersonation (суперадмин)

```
admin_users.is_admin = true → может работать от имени любой org
Логируется в impersonation_sessions + audit_log
```

### Worker раздел (изолированный)
- Route group: `src/app/(worker)/`
- Layout: JWT-only, без RLS
- Хук: `useIsAdminFast` — проверка JWT без сетевого запроса
- Особенность: hardware back button поддержка (LIFO стек навигации)

---

## 7. Ветки (филиалы)

### Архитектура

```
organizations (parent)
    └── branches
            └── organizations (child — отдельный org_id)
```

| Компонент | Назначение |
|---|---|
| `branches` таблица | Связь parent_org_id → child_org_id |
| `user_active_branch` | Активная ветка пользователя (server truth) |
| `BranchContext.tsx` | Client-side кэш в localStorage |
| `POST /api/set-active-branch` | Сохранение выбора в БД |

### Данные по контексту

| Тип данных | Скоп | Механизм |
|---|---|---|
| Clients | Shared (mainOrgId) | Без branch-контекста |
| Visits | Per activeOrgId | Service role + user_active_branch |
| Payments | Per activeOrgId | Service role + user_active_branch |
| Products | Per activeOrgId | Service role + user_active_branch |
| Dashboard | Per activeOrgId | useBranch() hook |

---

## 8. Платежи и Tranzila

### Tranzila — библиотеки

| Файл | Назначение |
|---|---|
| `src/lib/tranzila.ts` | Создание платёжных ссылок (DirectNG iframe) |
| `src/lib/tranzila-invoices.ts` | Генерация документов (Invoices API) |
| `src/lib/tranzila-webhook.ts` | Безопасность вебхуков (подпись, IP) |

### Типы документов Tranzila

| Код API | Тип в коде | Иврит |
|---|---|---|
| `IR` | `receipt_invoice` | חשבונית מס קבלה (default) |
| `RE` | `receipt` | קבלה |
| `IN` | `invoice` | חשבונית מס |

**Default везде**: `receipt_invoice` (חשבונית מס קבלה). Меняется через `org_receipt_settings.document_type`.

### Терминалы

| Переменная | Назначение |
|---|---|
| `TRANZILA_TERMINAL_ID` | Основной платёжный терминал (`ambersolt`) |
| `TRANZILA_TOKEN_TERMINAL` | Token-терминал для рекуррентных платежей |
| `tranzila_invoice_terminal` | Отдельный терминал для документов (на уровне org) |

**Приоритет терминала для документов**: `org.tranzila_invoice_terminal` → `org.tranzila_terminal` → `env.TRANZILA_TERMINAL_ID`

### Точки генерации документов

#### 1. `/api/payments/[id]/send-receipt` — ручная отправка
- **Триггер**: кнопка "Отправить квитанцию" в PaymentDetailsDrawer
- **Функции**: `createReceipt()` → `getReceiptPdf()`
- **Канал**: WhatsApp (Meta Cloud API) + email
- **Идемпотентность**: проверяет `payment.tranzila_document_id`

#### 2. `/api/payments/[id]/auto-send-receipt` — автоматическая (cron)
- **Триггер**: автоматически после оплаты (Bearer CRON_SECRET)
- **Поддерживает**: Tranzila и Morning (Green Invoice)
- **Канал**: WhatsApp (Whapi)

#### 3. `/api/payments/tranzila-notify` — рекуррентные платежи
- **Триггер**: callback от Tranzila My Billing (ежемесячное списание)
- **Тип документа**: жёстко `receipt_invoice`
- **Назначение**: подписки клиентов Trinity

#### 4. `/api/payments/tranzila-success` (функция `sendSubscriptionEmail`)
- **Триггер**: redirect после успешной оплаты через iframe
- **Назначение**: онбординг нового клиента Trinity
- **Функция**: `createTranzilaInvoice()` (deprecated → `createReceipt()`)

#### 5. `/api/payments/tranzila/webhook` — старый webhook
- **Триггер**: POST от Tranzila (form-urlencoded)
- **Безопасность**: IP whitelist (62.219.85.140/141/148), идемпотентность
- **Функция**: `createTranzilaInvoice()` (deprecated)

#### 6. `/api/payments/[id]/tranzila-pdf` — скачивание PDF
- **Триггер**: кнопка "Скачать PDF" в PaymentDetailsDrawer
- **Функция**: только `getReceiptPdf()`, документ не создаётся

#### 7. `/api/payments/[id]/receipt` — локальная HTML-квитанция
- **Независимая система**, не использует Tranzila Invoices API
- **Функция**: `generateReceipt()` из `src/lib/generate-receipt.ts`

### ⚠️ Важные замечания
1. `createTranzilaInvoice()` помечена `@deprecated`. Два места ещё используют её: `tranzila/webhook` и `tranzila-success`. Нужно мигрировать на `createReceipt()`.
2. В `/api/payments/tranzila-notify` терминал не передаётся — используется глобальный `TRANZILA_TERMINAL_ID`. Gap если у клиента отдельный `tranzila_invoice_terminal`.
3. Morning (Green Invoice) подключён в `auto-send-receipt` как альтернатива (тип 400 = קבלה).

---

## 9. WhatsApp (Whapi)

### Архитектура

```
Whapi.cloud → POST /api/webhooks/whapi
                        ↓
               wa_conversations + wa_messages
                        ↓
               /inbox (UI с Realtime)
```

### Таблицы
- `wa_conversations` — один чат = одна запись
- `wa_messages` — сообщения (direction: `in` / `out`)
- `wa_integrations` — настройки интеграции (vault_secret_id для API key)
- `wa_send_log` — лог всех отправок
- `wa_trigger_settings` — настройки авто-триггеров
- `outbound_queue` — очередь исходящих

### Ключевые особенности
- **Realtime sync**: Supabase Realtime + polling fallback (5 сек)
- **Оптимистичные обновления**: сообщение появляется сразу, до подтверждения
- **Звуковые уведомления**: `public/sounds/notification.wav`
- **GlobalRealtimeSync**: предотвращает дублирование WS-каналов
- **Webhook**: `POST /api/webhooks/whapi?token=trinity_whapi_secret_2026`
- **Два направления**: входящие (webhook) + исходящие (API)

### API маршруты
| Маршрут | Назначение |
|---|---|
| `GET /api/wa-inbox/conversations` | Список чатов |
| `POST /api/wa-inbox/send` | Отправить сообщение |
| `GET /api/wa-inbox/[id]` | Сообщения чата |
| `POST /api/wa-inbox/[id]/create-client` | Создать клиента из чата |
| `POST /api/wa-inbox/[id]/create-visit` | Создать визит из чата |
| `POST /api/webhooks/whapi` | Входящие сообщения от Whapi |

### WA-напоминания о визитах
- Cron: `GET /api/cron/reminders`
- Шаблоны: `wa_trigger_settings` (время, текст)
- Отправка через Whapi API

---

## 10. Лендинг /landing

### Расположение
`src/app/landing/page.tsx` — Next.js страница (статическая)

### Языки
| Язык | Направление | Цикл переключения |
|---|---|---|
| RU (русский) | LTR | → HE |
| HE (иврит) | RTL | → EN |
| EN (английский) | LTR | → RU |

**Переключатель**: кнопка `btn-lang` в nav. Цикл: RU → HE → EN → RU.

### Компоненты страницы
1. **Nav** — логотип, ссылки, `btn-lang`, кнопка входа, бургер (мобильный)
2. **Mobile menu** — открывается по бургеру, включает переключатель языка (добавлен 01.04.2026)
3. **Hero** — заголовок, CTA, статистика (90% WhatsApp, 5 мин запуск, 0₪ комиссий)
4. **Marquee** — бегущая строка с типами бизнесов
5. **Problem** — три боли клиента
6. **Features** — 6 ключевых возможностей
7. **Trust** — безопасность (SSL, backup, соответствие закону)
8. **How it works** — 4 шага запуска
9. **Pricing** — 4 тарифных плана (из БД через `usePricingPlans`)
10. **Testimonials** — отзывы Анеты и Ксении
11. **CTA** — финальный призыв к действию
12. **Footer**

### Планы из БД
Цены берутся из Supabase через хук `usePricingPlans`. Fallback на хардкод если API недоступен.

### Мобильная адаптация
- `@media (max-width: 900px)` — tablet: скрывается nav-links, показывается бургер
- `@media (max-width: 480px)` — mobile: центрирование, вертикальные кнопки
- `@media (max-height: 800px/650px)` — короткие экраны (ноутбуки)

---

## 11. UI-компоненты

### GoldTabBar — мобильная навигация
`src/components/layout/GoldTabBar.tsx`

Liquid gold bottom tab bar для мобильных устройств (<1024px). Рендерится через `DashboardShell` поверх всего контента.

**Характеристики:**
- Squircle-индикатор активного таба с золотой градиентной рамкой (9-стоп градиент, `#fffbe0` → `#3a1e00` → `#fffbe0`)
- Внешнее свечение через `box-shadow` amber-glow
- Shimmer-анимация внутри пилюли через `@keyframes goldShimmer`
- Spring-физика переключения: JS RAF-анимация, lead/trail грани с разными `stiffness`/`damping`
- Фильтрация табов по feature flags (`useFeatures`)
- `safe-area-inset-bottom` для iPhone с notch
- Spacer `h-[90px]` предотвращает перекрытие контента
- Скрыт на `lg:` и выше (`lg:hidden`)

**Табы:** Dashboard → Clients → Visits → Payments → Analytics

**Интеграция:** Подключён в `DashboardShell.tsx` рядом с `PinnedModalsTray`.



### Modal.tsx — базовый движок
`src/components/ui/Modal.tsx`
- Перетаскиваемый + закрепляемый
- Поддержка RTL/LTR
- Размеры: sm/md/lg/xl/full через `clamp()`
- **Не импортировать напрямую** в компонентах фич — использовать через TrinityModalShell или WizardModal

### TrinityModalShell — стандарт для обычных модалок
`src/components/ui/TrinityModalShell.tsx`

```tsx
<Modal open={open} onClose={onClose} darkHeader width="680px">
  <TrinityModalShell icon={<UserPlus/>} title="Новый клиент" subtitle="Заполните данные">
    {formContent}
  </TrinityModalShell>
</Modal>
```

### WizardModal — многошаговые диалоги
`src/components/ui/WizardModal.tsx`

**Всегда используй для любого многошагового диалога.**

```tsx
<WizardModal
  open={open} onClose={onClose}
  title="Заголовок" steps={steps} currentStep={step}
  onNext={() => setStep(n => n+1)} onBack={() => setStep(n => n-1)}
  canProceed={isValid} onSubmit={handleSubmit}
  dir="rtl" size="lg"
>
  {step === 1 && <StepOne />}
  {step === 2 && <StepTwo />}
</WizardModal>
```

Визуальный стиль: тёмно-синий градиент хедер, hex-логотип, шаговые индикаторы.

### ModalBottomSheet — мобильный паттерн
Для мобильных устройств (<768px) — bottom sheet вместо центрированного модала.

### Размеры модалок

| size | max-width |
|---|---|
| sm | clamp(320px, 90vw, 384px) |
| md | clamp(320px, 90vw, 448px) |
| lg | clamp(320px, 85vw, 512px) |
| xl | clamp(320px, 85vw, 576px) |
| full | clamp(320px, 80vw, 896px) |

### Адаптивность (правило)
**Все страницы Trinity обязаны поддерживать:**
- Mobile: < 768px
- Tablet: 768–1024px
- Desktop: > 1024px

---

## 12. Демо-режим

### Архитектура

Демо-режим даёт потенциальным клиентам ограниченный доступ к Trinity без оплаты.

- **Триггер**: `/demo/try` → Google OAuth → автоматическая активация
- **Признак**: `organizations.features.is_demo = true`
- **Лимиты**: `client_limit`, `visit_limit`, `product_limit`, `task_limit` в features(jsonb)
- **Отслеживание**: `demo_sessions` таблица (expires_at, is_active)
- **Seed-данные**: автоматически генерируются тестовые записи

### Защита лимитов
```typescript
// Типизированный error class
class LimitExceededError extends Error { ... }

// Перехват в MutationCache.subscribe()
// Показывает UI с предложением обновить план
```

### Снятие лимитов
При успешном платеже через Tranzila webhook — `is_demo: false`, все лимиты → `null`.

---

## 13. Beautymania интеграция

### Сайт
- **Репозиторий**: `Creepie132/bm-site`
- **Локальный путь**: `F:\Amber_solutions_Kira\bm_site`
- **Stack**: HTML/CSS/JS (статический)
- **Дизайн**: чёрный + золото
- **URL**: beautymania.co.il

### API маршруты (в Trinity)
| Маршрут | Назначение |
|---|---|
| `GET /api/beautymania/products` | Каталог товаров для сайта |
| `GET /api/beautymania/related` | Связанные товары |
| `POST /api/beautymania/order` | Создание заказа → Trinity CRM |
| `POST /api/beautymania/contact` | Форма обратной связи |

### Цикл заказа
```
Клиент на beautymania.co.il → POST /api/beautymania/order
  → создаётся site_orders запись
  → WA-алерт владельцу (Анете) через Whapi
  → In-App push уведомление в Trinity
  → Realtime обновление /sales страницы
```

### Уведомления о заказах (02.04.2026)
- **WA-алерт**: настраивается в Trinity → Настройки → Уведомления
  - `organizations.notify_new_orders_wa` (boolean)
  - `organizations.notification_phone` (номер получателя)
- **In-App**: Supabase Realtime на `site_orders`, toast + звук
- **Провайдер**: `SiteOrdersRealtimeProvider.tsx` в DashboardShell

### Статусы заказов
`new` → `confirmed` → `shipped` → `delivered` | `cancelled`

При каждой смене статуса → WA клиенту (4 шаблона).

---

## 14. Kira AI агент

### Концепция
- **Что**: AI-ассистент для клиентов Trinity (в приложении + WhatsApp бот)
- **LLM**: OpenAI GPT-4o (не Claude — бан Anthropic из-за OpenClaw)
- **OCR**: Gemini уже используется
- **Домен**: kira.ambersol.co.il (планируется)

### Архитектура (планируется)
```
WhatsApp (Whapi) → incoming webhook
  → Trinity backend → OpenAI GPT-4o
  → ответ клиенту через Whapi
```

### Требования к ToS
- Бот должен представляться как AI: "Я Кира, AI-ассистент Trinity"
- Нельзя общаться с людьми без раскрытия что это AI
- Причина бана OpenClaw: бот говорил с Анетой без уведомления

---

## 15. Правила разработки

### Engineering Protocol (ОБЯЗАТЕЛЕН)

**Фаза 1 — Сканирование (Zero-Assumption)**
- Перед любым кодом — читать реальные файлы
- Не дублировать существующий функционал

**Фаза 2 — Проектирование**
- Валидация входящих данных
- Обработка ошибок
- Оценка регрессии

**Фаза 3 — Валидация**
- Ошибка устранена?
- TypeScript/БД/UI целы?
- Нет костылей?

**Фаза 4 — Отчёт**
```
Проверено: [файлы/модули]
Регрессия: [нет/описание]
Безопасность: [защищено]
```

### Правила кода
```
ЗАПРЕЩЕНО:
- monkey-patching глобалов
- temp-скрипты (_push.js, _patch.js)
- костыли вместо архитектуры

ОБЯЗАТЕЛЬНО:
- нативные механизмы (MutationCache, Context, React Query)
- типизированные error-классы
- стандартный git
```

### Commit формат
```
feat: новая функция
fix: исправление бага
refactor: рефакторинг
chore: конфиг, зависимости
```

### Правила UI
- TrinityModalShell — стандарт для всех модалок (кроме явно кастомных)
- При изменении UI — только добавление/исправление, никогда не удалять элементы без явной просьбы

### Checklist перед каждым API route
- [ ] `getAuthContext()` вызван первым
- [ ] Пользователь аутентифицирован (401 если нет)
- [ ] `activeOrgId` из БД, не из заголовков
- [ ] Все запросы фильтруются по `org_id`
- [ ] Service role только после проверки auth
- [ ] Нет sensitive данных в логах

### Checklist перед деплоем
```
1. npm run build  — должен быть ЧИСТЫМ (0 ошибок, 0 warnings TypeScript)
2. Перечитать изменённый файл — проверить корректность кода
3. git commit + push
4. Мониторить Vercel dashboard
```

---

## 16. Changelog

---

### 01.04.2026 — Оптимизация БД (RLS + индексы + политики)

#### Задача 1: RLS initplan оптимизация
**Миграция**: `rls_initplan_optimization`

Заменены все голые вызовы `auth.uid()` → `(SELECT auth.uid())` и `auth.role()` → `(SELECT auth.role())` в **34 политиках** на **30+ таблицах**:

`inventory_transactions`, `branches`, `user_active_branch`, `payment_attempts`, `transfer_requests`, `work_shifts`, `audit_log`, `impersonation_sessions`, `staff_permissions`, `push_subscriptions`, `revenue_logs`, `client_subscriptions`, `worker_notes`, `subscription_charges`, `organizations`, `sales`, `sale_items`, `wa_integrations`, `outbound_queue`, `wa_send_log`, `wa_trigger_settings`, `expenses`, `wa_conversations`, `wa_messages`, `deal_stages`, `deals`, `deal_tags`, `sales_plans`, `call_records`, `communication_log`, `worker_dashboard_settings`, `client_photos`, `site_orders`, `product_relations`

#### Задача 2: Дублирующие индексы audit_log
**Миграция**: `drop_duplicate_audit_log_indexes`

Удалены: `idx_audit_date`, `idx_audit_org`

#### Задача 3: Неиспользуемые индексы
**Миграция**: `drop_unused_indexes`

Удалены 43 индекса по Supabase performance advisories.

#### Задача 4: Missing FK индексы
**Миграция**: `add_missing_fk_indexes`

Добавлены 15 индексов для FK-колонок без покрытия (см. раздел 4).

#### Задача 5: Multiple permissive policies
**Миграция**: `fix_multiple_permissive_policies`

- `staff_permissions`: удалены дубли SELECT и ALL
- `inventory_transactions`: удалены старые политики через `get_user_org_ids()`
- `branches`, `deal_stages`, `deal_tags`, `product_relations`, `sales_plans`: ALL → INSERT/UPDATE/DELETE

#### Задача 6: Лендинг — переключатель языка в мобильном меню
**Коммит**: `7ae040b` — `feat: lang-switcher in mobile menu landing`

Добавлена кнопка `btn-lang` в `mobile-menu`. Теперь переключение языка доступно как на desktop, так и на мобильных устройствах.

Страница `/landing` уже содержала: три языка (RU/HE/EN), цикл переключения, бургер-меню.

#### Задача 7: Tranzila audit
Проведён полный аудит всех точек вызова Tranzila. Выявлено:
- 7 точек генерации документов (6 через Tranzila + 1 локальная HTML)
- Функция `createTranzilaInvoice()` помечена `@deprecated` — использована ещё в 2 местах
- Gap: в `/tranzila-notify` не передаётся `tranzila_invoice_terminal`
- Рекомендация: мигрировать `tranzila/webhook` и `tranzila-success` на `createReceipt()` напрямую

---

### 02.04.2026 — Уведомления о заказах Beautymania
(см. `docs/CLAUDE.md` для деталей)

- WA-алерт владельцу при новом заказе
- In-App Realtime уведомления
- Настройки уведомлений в Trinity
- Полный UI-цикл заказов (статусы + WA клиенту)

---

### Ранние изменения (краткая история)

| Период | Что сделано |
|---|---|
| 2025 Q1 | Основа: multi-tenant Supabase, RLS, org_id изоляция |
| 2025 Q2 | Tranzila интеграция, WhatsApp напоминания, Green Invoice |
| 2025 Q3 | Демо-режим, admin панель, impersonation |
| 2025 Q4 | Мобильный UI (TrinityMob, ModalBottomSheet), Worker раздел |
| 2026 Q1 | WhatsApp Inbox (Whapi), Кабинет руководителя, Beautymania сайт |
| 2026 Q1 | Sales plans, Deal stages, Auth-First onboarding, Push уведомления |

---

## 📎 Связанные файлы

| Файл | Назначение |
|---|---|
| `docs/TRINITY_DOCS.md` | **Этот файл** — полная документация |
| `docs/CLAUDE.md` | Changelog последних сессий |
| `docs/SKILL.md` | Skill для AI-ассистента (Modal, WizardModal) |
| `docs/INVITATION_SYSTEM.md` | Система приглашений |
| `supabase/RELATIONSHIPS.md` | Связи таблиц |
| `supabase/SCHEMA_EXPORT.sql` | Экспорт схемы |
| `KNOWLEDGE_BASE.md` | Исторические заметки |

---

*Документация обновлена: 01.04.2026*
*Версия Next.js: 16.1.6 (Turbopack)*
*Supabase project: tjryzcqvsavtllahjyrj*

---

### Дополнение 01.04.2026 (вечер) — Модуль блога + security fixes

#### Модуль блога Beautymania

**Таблица `blog_posts`** (миграция `create_blog_posts`):
- Поля: `id`, `org_id`, `title`, `slug`, `cover_image`, `content_html`, `excerpt`, `published`, `published_at`, `created_at`, `updated_at`
- Уникальный constraint: `(org_id, slug)` — slug уникален в рамках org
- Триггер `blog_posts_set_updated_at`: автообновление `updated_at` + автозаполнение `published_at` при первой публикации
- RLS: read для членов org (включая черновики), write только owner/admin, anon видит только `published=true`

**Публичный API:**
- `GET /api/beautymania/blog?limit=10&offset=0` — список опубликованных статей (без `content_html`), пагинация, кэш 60с
- `GET /api/beautymania/blog/[slug]` — одна статья с полным HTML, валидация slug, кэш 120с
- Оба роута: жёсткий `BM_ORG_ID`, rate limit, CORS `*`, только `published=true`

**Страница `/admin/blog`:**
- TipTap rich-text редактор (Bold, Italic, H2, H3, BulletList, OrderedList, Link, Undo/Redo)
- Автогенерация slug из заголовка (транслитерация кириллицы)
- Поле обложки с превью, excerpt, toggle publish/draft
- Список статей: inline toggle публикации, редактирование, удаление
- Пункт "Блог Beautymania" в AdminSidebar (иконка BookOpen)

**vercel.json:** добавлен `"installCommand": "npm install --legacy-peer-deps"` для корректной установки devDependencies на Vercel.

#### Security fixes (миграции)

**`fix_rls_demo_sessions_pricing_config`:**
- `demo_sessions`: включён RLS, политика `service_role` only
- `pricing_config`: включён RLS, публичное чтение + `service_role` для записи

**`fix_function_search_path`:**
- Установлен `SET search_path = ''` для 27 функций — защита от search_path injection
- Затронуты: все `updated_at` триггеры, `get_user_org_ids`, `get_wa_api_key`, `custom_access_token_hook`, `delete_organization_completely` и другие

**Оставшиеся warnings (не требуют действий):**
- `pg_net`, `pg_trgm` в public schema — системные расширения Supabase, нельзя перенести
- `auth_leaked_password_protection` — включить в Supabase Dashboard → Auth → Password Protection


---

## Notification System 2.0 — Апрель 2026

### Архитектура

```
Событие (visit/payment/client/order)
  └─► dispatchNotification() [fire-and-forget, src/lib/dispatch-notification.ts]
        └─► Edge Function: send-notification [supabase/functions/send-notification/]
              ├─► notification_preferences → кто и в какой канал
              ├─► Telegram Bot API (если канал включён)
              └─► Web Push / VAPID (если канал включён)

Настройки пользователя: /settings/notifications
  └─► API: GET/PUT /api/notifications/preferences
        └─► Таблица: notification_preferences (org_id, user_id, preferences JSONB)
```

### Новые таблицы БД

| Таблица | Назначение | RLS |
|---|---|---|
| `notification_preferences` | Настройки каналов per user per org. JSONB: `{event_key: {push, telegram, email}}` | ✅ `auth.uid() = user_id` |
| `user_devices` | Push-токены устройств (Web Push endpoint / FCM) | ✅ `auth.uid() = user_id` |

### Файлы

| Файл | Описание |
|---|---|
| `src/lib/dispatch-notification.ts` | Server helper: POST к Edge Function, fire-and-forget |
| `src/hooks/useNotificationPreferences.ts` | React hook: load + optimistic toggle per channel |
| `src/app/api/notifications/preferences/route.ts` | GET + PUT, sanitized eventKey regex, atomic upsert |
| `src/app/(dashboard)/settings/notifications/page.tsx` | UI: 4 группы событий × 2 канала (Push+TG), фикс Rules of Hooks crash |
| `supabase/functions/send-notification/index.ts` | Edge Function: Telegram + Web Push VAPID (без npm deps) |

### Точки отправки (event triggers)

| Event | Файл | Payload |
|---|---|---|
| `new_visit` | `api/visits/route.ts` | 📅 Визит создан |
| `new_payment` | `api/payments/route.ts` | 💳 Новый платёж |
| `new_client` | `api/clients/route.ts` | 👤 Новый клиент |
| `new_order` | `api/beautymania/order/route.ts` | 🛒 Заказ с сайта Beautymania |

### Edge Function деплой (один раз вручную)

```bash
npx supabase functions deploy send-notification --project-ref tjryzcqvsavtllahjyrj
```

Secrets в Supabase Dashboard → Edge Functions → send-notification:
- `TELEGRAM_BOT_TOKEN`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL` = `mailto:admin@ambersol.co.il`

### UI — группы событий

| Группа | События |
|---|---|
| Визиты | new_visit, visit_reminder, birthday, new_client |
| Продажи и склад | new_payment, stock_alerts, new_order |
| WhatsApp / AI | ai_fallback, task_mentions |
| Безопасность | security_login |

### Фикс критического бага

`useDemoMode()` вызывался после условного `return loading` → нарушение Rules of Hooks → crash страницы.
Исправлено: все хуки подняты в верх компонента до любых условных return.

### Коммиты

| SHA | Описание |
|---|---|
| `15f9f19` | feat: notification system 2.0 — preferences table, UI, edge function, dispatch helper |
| `8686d63` | feat: wire dispatchNotification into visits+payments routes |
| `d31a49d` | feat: dispatch notifications on new_client and new_order events |


---

## Kira AI Agent

### Уровень 1 — Базовый стриминговый чат

**Дата:** 02.04.2026

#### Зависимости
| Пакет | Версия | Назначение |
|---|---|---|
| `ai` | ^6.x | Vercel AI SDK (streamText, useChat) |
| `@ai-sdk/openai` | ^3.x | Провайдер OpenAI |
| `@ai-sdk/react` | latest | Клиентский хук useChat |

`OPENAI_API_KEY` — добавлен в `.env.local`.

#### Файлы

| Файл | Описание |
|---|---|
| `src/app/api/kira/route.ts` | Потоковый POST-роут. Auth → streamText → toTextStreamResponse |
| `src/components/kira/KiraChatPanel.tsx` | Чат-компонент. Волна KiraWave + история + инпут |
| `src/components/layout/RightPanel.tsx` | KiraBlock удалён → KiraChatPanel через dynamic() ssr:false |

#### API роут (`/api/kira`)
- `getAuthContext()` первым — `org_id` только из DB
- Модель: `gpt-4o-mini`
- Системный промпт: Кира, женский род, без markdown-заголовков
- `tools: {}` — зарезервировано для Supabase-инструментов (Level 3)

#### Особенности `ai@6` (breaking changes vs v3)
| Старый API | Новый API (`ai@6`) |
|---|---|
| `useChat({ api, body })` | `useChat({ transport: new DefaultChatTransport({ api, body }) })` |
| `initialMessages` | `messages` |
| `handleSubmit` / `input` | `sendMessage()` + собственный `useState` |
| `isLoading` | `status === 'streaming' \| 'submitted'` |
| `maxTokens` | `maxOutputTokens` |
| `toDataStreamResponse()` | `toTextStreamResponse()` |
| `sendMessage({ role, content })` | `sendMessage({ role, content, parts: [{ type:'text', text }] })` |

---

### Уровень 2 — Долговременная память (Гиппокамп)

**Дата:** 02.04.2026

#### Схема БД
```sql
kira_sessions  (id uuid PK, org_id uuid FK, created_at)
kira_messages  (id uuid PK, session_id uuid FK, org_id uuid, role varchar, content text, created_at)
```
`org_id` денормализован в `kira_messages` для RLS без JOIN.
Миграция: `supabase/migrations/20260402_kira_memory.sql`

#### RLS
Оба стола: пользователь читает/пишет только записи своего `org_id` через `org_users`.

#### Файлы

| Файл | Описание |
|---|---|
| `src/app/api/kira/session/route.ts` | POST: найти/создать сессию орга + вернуть последние 20 сообщений |
| `src/app/api/kira/route.ts` | Обновлён: загрузка истории + onFinish → запись в kira_messages |
| `src/components/kira/KiraChatPanel.tsx` | Обновлён: init сессии при mount, initialMessages из истории |

#### Архитектурные решения
- `org_id` никогда не берётся из `body` — только из `getAuthContext()` (Trinity security rule)
- Одна активная сессия на `org_id` — сервер сам находит последнюю по `(org_id, created_at desc)`
- `sessionId` верифицируется через `.eq('org_id', orgId)` — чужой sessionId не пройдёт
- Лимит контекста: последние **20 сообщений** (не вся история)
- `onFinish` — фоновая запись после завершения стрима, не блокирует отдачу клиенту
- Скелетон-лоадер в UI пока сессия инициализируется

#### Коммиты

| SHA | Описание |
|---|---|
| `b05aab4` | feat: Kira Level 1 + Level 2 — стриминг + долговременная память |
| `1bf4c3e` | docs: Kira AI Level 1 + Level 2 — журнал работ |

### Уровень 3 — Function Calling (Инструменты)

**Дата:** 02.04.2026  
**Коммит:** `188a419`

#### Суть
Кира теперь сама ходит в Supabase за данными перед ответом. `stopWhen: stepCountIs(3)` позволяет цикл: вызов tool → получение данных → финальный текстовый ответ — всё в одном стриме.

#### `ai@6` breaking changes для tools
| Старый API | Новый API (`ai@6`) |
|---|---|
| `tool({ parameters: zodSchema(...) })` | объект напрямую с `inputSchema: zodSchema(...)` |
| `maxSteps: 3` | `stopWhen: stepCountIs(3)` + импорт `stepCountIs` из `'ai'` |
| `tool()` хелпер с `execute` | plain object `{ description, inputSchema, execute }` |

#### Инструменты (`src/app/api/kira/route.ts`)

**`getClientSummary`**
- Поиск по `first_name`, `last_name`, `phone` через `ilike` с экранированием
- Фильтр: `eq('org_id', orgId)` — чужие клиенты недоступны
- LTV считается отдельным запросом: сумма `completed`-платежей по найденным `client_id`
- Возвращает: name, phone, email, loyalty_points, ltv_ils, notes

**`getRevenueStats`**
- Период: `today` / `week` / `month`
- `week` считает от понедельника (с учётом воскресенья как дня 0)
- Фильтр: `status = 'completed'`, `paid_at` в диапазоне
- Возвращает: revenue_ils, payments_count, average_check_ils

#### Системный промпт (дополнение)
Добавлена инструкция: «Если пользователь спрашивает о конкретном клиенте или выручке — обязательно используй инструменты. Никогда не выдумывай цифры.»

#### Пример диалога
```
Влад: Сколько мы заработали сегодня?
Кира: [вызывает getRevenueStats(today)] → Сегодня пришло ₪4,230 — 12 платежей, средний чек ₪352.
Влад: Найди клиента Анну Петрову
Кира: [вызывает getClientSummary("Анна Петрова")] → Анна Петрова, +972-50-..., LTV ₪8,450, 120 бонусных баллов.
```

### Уровень 4 — Автономные триггеры (Morning Brief)

**Дата:** 02.04.2026  
**Коммит:** `b5078c8`

#### Архитектура

```
Vercel Cron 06:30 UTC (08:30 IL)
  → GET /api/kira/cron
    → for...of по активным оргам (is_active=true, не demo)
      → collectOrgData(orgId)        — визиты, выручка, долги, ДР
      → generateBrief(orgName, data) — generateText gpt-4o-mini
      → deliverBrief(orgId, text)    — INSERT kira_messages (is_proactive=true)
        → Supabase Realtime          — автоматически рассылает INSERT-событие
          → KiraChatPanel            — слушает через postgres_changes
            → красный бейдж + баннер с текстом
```

#### Файлы

| Файл | Описание |
|---|---|
| `src/app/api/kira/cron/route.ts` | GET-роут (Vercel Cron). Обходит все орги, генерирует бриф, пишет в БД |
| `src/components/kira/KiraChatPanel.tsx` | Добавлена Realtime-подписка + UI баннера + красный бейдж |
| `vercel.json` | Добавлен cron `/api/kira/cron` schedule `30 6 * * *` (UTC) + maxDuration 300 |

#### Безопасность

- Защита: `Authorization: Bearer CRON_SECRET` — только Vercel или ручной вызов
- Строгий `for...of` — данные каждого орга изолированы, никогда не смешиваются в одном промпте
- Ошибка одного орга не ломает весь цикл (try/catch на каждую итерацию)
- Фильтр: `is_active=true` + не `subscription_status='demo'`

#### Realtime доставка

- `ALTER PUBLICATION supabase_realtime ADD TABLE public.kira_messages` — применена миграция
- Клиент подписывается на `INSERT` в `kira_messages` с фильтром `session_id=eq.{sessionId}`
- При получении события с `is_proactive=true`: показывается баннер + красный бейдж в заголовке
- Баннер закрывается крестиком или автоматически при отправке следующего сообщения

#### generateText vs streamText

Cron использует `generateText` (не `streamText`) — нам не нужен стрим, нужен финальный текст для записи в БД.

#### Данные в брифе

| Метрика | Источник | Период |
|---|---|---|
| Визиты сегодня | `visits.scheduled_at` | [00:00, 23:59] сегодня |
| Выручка | `payments` (status=completed) | вчера |
| Долги | `sales` (status unpaid/partial) | все активные |
| Дни рождения | `clients.date_of_birth` LIKE `%-MM-DD` | сегодня |

### Уровень 5 — Generative UI (Исполнитель)

**Дата:** 02.04.2026
**Коммит:** `640c3d3`

#### Суть
Кира переходит из режима советника в режим исполнителя. Вместо текстового ответа она рендерит интерактивные React-компоненты прямо в чате.

#### Ключевое изменение протокола
`toTextStreamResponse()` → `toUIMessageStreamResponse()` — без этого `message.parts` с tool invocations не доходят до клиента.

#### Новый инструмент: `getDebts`
Запрашивает `sales` с `status IN ('unpaid','partial')`, JOIN с `clients`. Возвращает `{ found, debts: [{ id, name, phone, amount }] }`.

#### Generative UI: `DebtWidget.tsx`
`src/components/kira/ui/DebtWidget.tsx` — клиентский компонент.
- Карточка с красной рамкой, заголовок с общей суммой долга
- Список должников: имя, телефон, сумма
- Кнопка "Напомнить" (WhatsApp иконка) → `toast.success()` — заглушка
- После нажатия кнопка переключается в "Отправлено" (зелёный CheckCircle)

#### Рендер в `KiraChatPanel`
`message.parts` вместо `message.content`. Логика по типу части:
- `part.type === 'text'` → обычный текстовый пузырь
- `part.type === 'tool-getDebts'` + `state === 'output-available'` → `<DebtWidget result={part.output} />`
- `part.type?.startsWith('tool-')` + `state === 'input-available'` → пульсирующий индикатор "Анализирую данные..."

#### `ai@6` — типы tool parts
| Состояние | Значение |
|---|---|
| `input-streaming` | Модель генерирует аргументы |
| `input-available` | Аргументы готовы, execute запущен |
| `output-available` | execute вернул результат |

#### Следующий шаг (заглушка → реальный WA)
`DebtWidget` → кнопка "Напомнить" → `POST /api/sms/send` или `POST /api/wa-inbox/send` с `phone` клиента.

#### Кнопка "Напомнить" — реальный WhatsApp (не заглушка)

**Коммит:** `9cb2998`

**Новый роут:** `src/app/api/kira/remind/route.ts` (POST)
- Auth + проверка роли (`owner` / `moderator`)
- Верификация: `sale.org_id === orgId` — чужие продажи недоступны
- Вызывает `sendWhatsAppMessage({ orgId, to: phone, message })` — тот же Fallback-паттерн что и в wa-inbox
- Сообщение на иврите: `שלום {clientName}! נשמח אם תסדיר את יתרת החוב בסך ₪{amount}. תודה!`
- При `provider === 'none'` → 400 с понятным сообщением "WhatsApp не настроен"

**`DebtWidget.tsx`** — обновлён:
- `loading` state на каждую кнопку отдельно (spinner во время запроса)
- `disabled` если нет телефона (подпись "нет телефона")
- После успеха: кнопка переключается в "Отправлено" (зелёный, `disabled`)
- `toast.error` с читаемым сообщением при ошибке


---

## [03.04.2025] Kira — фикс жизненного цикла сессий + автоскролл

**Задача:** При нажатии кнопки очистки чата и последующем F5 — история восстанавливалась из БД. Автоскролл не работал (race condition).

**Результат:** Архитектурный фикс — бэкенд закрывает сессию, фронтенд ждёт DOM.

**Файлы:**
- `src/app/api/kira/session/route.ts`
- `src/components/kira/KiraChatPanel.tsx`
- Supabase migration: `add_status_to_kira_sessions`

### Детали

**Supabase — новая колонка:**
```sql
ALTER TABLE kira_sessions
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed'));
CREATE INDEX idx_kira_sessions_org_status ON kira_sessions(org_id, status);
```

**`session/route.ts`:**
- `POST` теперь фильтрует `.eq('status', 'active')` — закрытые сессии игнорируются
- Добавлен `DELETE`-хэндлер: принимает `?sessionId=`, проверяет `org_id` из `getAuthContext()`, делает `UPDATE status = 'closed'`

**`KiraChatPanel.tsx`:**
- `handleNewSession` стал `async`: сначала `DELETE /api/kira/session?sessionId=...`, потом `setMessages([]) + setSessionId(null)`
- Автоскролл: заменён `messagesEndRef.current?.scrollIntoView()` на `scrollRef.current.scrollTop = scrollRef.current.scrollHeight` внутри `setTimeout(100)` — правильный способ скролла внутри `div` с `overflow-y-auto`

**Коммит:** `70f233a`


---

### [03.04.2026] Fix: Устранение FOULC (Flash of Unlocalized Content)
**Задача:** При загрузке мерцал иврит перед переключением на русский.
**Решение:** SSR читает `trinity_locale` cookie → отдаёт HTML с правильными `lang`/`dir` с первого байта.
**Файлы:**
- `src/app/layout.tsx` — `RootLayout` async, читает cookie, устанавливает `lang`+`dir` на сервере
- `src/contexts/LanguageContext.tsx` — принимает `initialLocale` prop, исключает SSR/CSR mismatch
- `src/actions/user-preferences.ts` — `setLocaleCookie()` server action (1 год, sameSite=lax)

**Коммит:** `79afb09`

---

## 05.04.2026 — Mobile Download Page & Landing Updates

### Страница /mobile (скачивание APK)
- Создан файл: `src/app/mobile/page.tsx`
- Маршрут публичный — добавлен в `PUBLIC_PATH_SET` в `middleware.ts`
- APK раздаётся через Vercel Blob: `https://xltydzjvervudvn6.public.blob.vercel-storage.com/trinity-mobile-v1.0.apk`
- Страница содержит: версию (v1.0.0), размер (53.7 MB), кнопку скачивания, инструкцию по установке, changelog
- APK не хранится в git — `public/releases/` добавлен в `.gitignore`
- Пакет `@vercel/blob` добавлен в зависимости
- Создан API route: `src/app/api/upload-apk/route.ts` (PUT — для загрузки будущих версий APK)

### Лендинг (/landing)
- Добавлен пункт меню «Скачать» / «הורדות» / «Download» → `/mobile` (в десктопном и мобильном nav)
- Добавлено поле `navDownload: string` в тип `LangData`
- Кнопка «Войти» в хедере: `padding 7px 14px`, `border-radius 8px`, `font-size 13px`, фон `#1a237e`, hover `#283593`, через `Link href="/login"`
- Кнопка «Войти» в мобильном сайдбаре: `w-full rounded-lg py-3 font-bold text-white`, тот же фон, через `Link href="/login"`
- Убраны `animate-pulse`, `shadow`, свечения — стиль чистый и строгий
- Стили заданы через inline `style={}` из-за ограничения Turbopack с arbitrary Tailwind классами

---

## 06.04.2026 — Mobile Profile API & Theme System

### /api/mobile/profile

Новый endpoint для синхронизации темы оформления между устройствами.

**Файл:** `src/app/api/mobile/profile/route.ts`

| Метод  | Описание                              |
|--------|---------------------------------------|
| `GET`  | Получить текущую тему пользователя    |
| `PATCH`| Обновить тему пользователя            |

**Auth:** Bearer токен (mobile) или cookie (web). Использует `getAuthContext(req)`.

**GET response:**
```json
{ "theme": "command_center" }
```

**PATCH body / response:**
```json
// body:
{ "theme": "warm_organic" }
// response:
{ "ok": true }
```

**Допустимые значения theme:** `command_center`, `editorial_luxury`, `neon_industrial`, `warm_organic`

**Ошибки:**
- `400 Invalid theme value` — неизвестное значение темы
- `500 DB error` — ошибка Supabase

### Supabase: migration

Добавить колонку `theme` в таблицу `profiles`:
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme TEXT
DEFAULT 'command_center'
CHECK (theme IN ('command_center','editorial_luxury','neon_industrial','warm_organic'));
```
Файл миграции: `supabase/migrations/20260406_add_theme_to_profiles.sql`

**ВАЖНО:** Выполнить вручную в Supabase SQL Editor или через `supabase db push`.



---

## 07.04.2026 — Fix: SellProductModal фильтрует методы по настройкам орга

**Файл:** `src/components/modals/products/SellProductModal.tsx`
**Коммит:** `9ee1d98`

### Проблема:
`SellProductModal` имел захардкоженный статический массив `PAYMENT_METHODS` без фильтрации по `enabled_payment_methods` орга. `'credit'` заменён на `'card'` (canonical), добавлен `'check'`.

### Исправление:
- Массив переименован в `ALL_PAYMENT_METHODS`, расширен (`card`, `check`)
- Подключён `usePaymentMethodConfig()` — `PAYMENT_METHODS` вычисляется динамически через `.filter(m => enabledMethods.some(e => e.key === m.value))`
- `'credit'` исправлен на `'card'` для совпадения с canonical DB-ключом

---

## 07.04.2026 — Fix: Bit добавлен в PaymentMethodModal и UnifiedPaymentDialog

**Файлы:** `src/components/payments/PaymentMethodModal.tsx`, `src/components/payments/UnifiedPaymentDialog.tsx`, `src/lib/payment-methods.ts`
**Коммит:** `855746f`

### Проблема:
`PaymentMethodModal` (диалог "Новый платёж" из карточки клиента) и `UnifiedPaymentDialog` — оба имели захардкоженные статические списки методов без `bit`. `PaymentMethodModal` использовал `PAYMENT_METHODS_FOR_MODAL` без фильтрации по настройкам орга. `UnifiedPaymentDialog` имел `PaymentMethod` тип без `bit`.

### Исправление `payment-methods.ts`:
- Добавлен `'bit'` в `TrinityPaymentMethodId`
- Добавлен `'bit'` в `PAYMENT_METHOD_API_MAP` → `'bit'`
- Добавлена запись `bit` в `TRINITY_PAYMENT_METHODS` (оранжевый, иконка Smartphone)

### Исправление `PaymentMethodModal.tsx`:
- Подключён `usePaymentMethodConfig()` — динамическая фильтрация по `enabledMethods` орга
- Заменён статический `PAYMENT_METHODS_FOR_MODAL` на `visibleMethods` (фильтр: `card` и `link` исключены, остальные — по настройкам)
- Skeleton loading пока грузятся настройки

### Исправление `UnifiedPaymentDialog.tsx`:
- `PaymentMethod` тип расширен: добавлен `'bit'`
- `Step` расширен: добавлен `'bit-form'`
- `METHODS` + `METHOD_ICONS` — добавлен `bit` (оранжевый, Smartphone)
- `handleSelectMethod` — `stepMap` дополнен `bit → 'bit-form'`
- `currentMethod` — определение `bit-form → 'bit'`
- `handleSubmit` — блок `bit-form`: POST `/api/payments` с `payment_method: 'bit'`
- `renderStep` — добавлен `bit-form` (форма клиент + сумма + подсказка подтвердить Bit)
- i18n (`he` и `ru`) — добавлены `bit`, `bitDesc`, `successBit`

---

## 07.04.2026 — Fix: Диалог оплаты визита теперь уважает настройки enabled_payment_methods

**Файл:** `src/components/visits/CompleteVisitPaymentDialog.tsx`
**Коммит:** `3e214cd`

### Проблема:
Список способов оплаты в диалоге завершения визита (`CompleteVisitPaymentDialog`) был захардкожен статически — Bit, Наличные, Карта и т.д. отображались всегда, независимо от настроек организации. Включение/отключение методов в `/settings/payments` не влияло на диалог.

### Исправление:
- Убран статический массив `paymentMethods`
- Подключён хук `usePaymentMethodConfig()` — возвращает `enabledMethods` (отфильтрованные по настройкам орга + бизнес-логике терминала)
- Select в диалоге рендерит только разрешённые методы из `enabledMethods`
- Добавлен `useEffect`: если текущий выбранный метод после загрузки настроек оказывается недоступен — автоматически переключается на первый доступный
- Skeleton-заглушка на время загрузки настроек (`paymentSettingsLoading`)
- `paymentMethodMap` обновлён на canonical-ключи (`bank_transfer`, `bit`, `check`) — совпадают с DB напрямую
- Проверка `paymentMethod === 'credit'` исправлена на `=== 'card'` (canonical)
- Убраны неиспользуемые импорты: `useRouter`, иконки lucide (`Banknote`, `Smartphone`, `CreditCard`, `Building2`, `Phone`, `Zap`, `ChevronDown`)

### Затронутые файлы:
- `src/components/visits/CompleteVisitPaymentDialog.tsx`

---

## 06.04.2026 — Mobile Landing: Desktop Layout + Back Button + v2.2.0 Changelog

**Файл:** `src/app/mobile/page.tsx`
**Коммит:** `675a4a2`

### Что изменено:
- **Версия обновлена:** `2.1.0` → `2.2.0`
- **Desktop layout:** `max-w-6xl` → `max-w-7xl` + `lg:px-12`; колонки hero/download переключаются на `lg:flex-row` (1024px+), было `md:`
- **Кнопка "На главную"** добавлена в трёх местах:
  1. Sticky nav (BackButton, виден всегда)
  2. Hero-блок, под описанием (только `lg:`, styled с border)
  3. Footer (styled кнопка с border, для мобайл и десктоп)
- **Changelog:** добавлена запись v2.2.0 (Create Visit Sheet с выбором типа), карточки получили `hover:border-amber-400/20`
- **Build:** чистый, 0 ошибок, `/mobile` в роутах присутствует



---

## 07.04.2026 — Лендинг /mobile: полный changelog (v0.1.0–v1.0.0)

- Добавлены все недостающие версии: v0.1.0 → v1.0.0 (14 записей)
- Охватывает: инициализацию, Google Auth, GoldTabBar, тёмную тему, все модули (финансы/склад/продажи/задачи/аналитика/клиенты/визиты), сайдбар, аппаратную кнопку назад, edge-to-edge, систему тем
- Файл: `src/app/mobile/page.tsx`
- Коммит: `19c256c`


---

## 07.04.2026 — Четыре UI-фикса по задаче клиента

**Коммит:** `9488b90`

### 1. Бургер и стрелка "назад" поменяны местами — все мобильные хедеры
- `MobileHeader.tsx`: бургер (☰) перемещён **влево**, стрелка (←) перемещена **вправо**
- `MobileAdminHeader.tsx`: аналогично
- Иконка: `ArrowRight` → `ArrowLeft` (стрелка смотрит влево = назад)
- Работает во всех языках (ru / he)

### 2. Календарь визитов — скролл к 08:00 при открытии
- `src/components/visits/CalendarView.tsx`
- Было: открывалось на текущем часе. Стало: всегда 08:00

### 3. POST /api/visits теперь возвращает clients join
- `src/app/api/visits/route.ts`
- `.select()` → `.select(\`*, clients(first_name,last_name,phone,email), services(...)\`)`
- Устраняет пустое имя клиента в блоке календаря сразу после создания визита

### 4. ServicePicker — поиск + пагинация услуг (7/стр) при создании визита
- `src/components/visits/UnifiedVisitDialog.tsx`
- Новый компонент `ServicePicker` вместо `<Select>` для поля "Услуга"
- Поиск по символам, пагинация ‹/›, цена и длительность в строке, z-index 9999


---

## 07.04.2026 — Фикс обрезки bottom sheet в PWA/мобильном браузере

**Коммит:** `e2e602a`

### Проблема
На Android (Samsung, Chrome < 108) и в PWA нижняя часть модального окна обрезалась — кнопки "Сохранить" / "Отмена" уходили за границу экрана. Корневая причина: `height: 'Xdvh'` без fallback — единица `dvh` не поддерживается в Chrome < 108 и некоторых WebView.

### Исправление
Добавлен CSS-fallback во всех мобильных bottom-sheet компонентах:
- `height: '92vh'` — fallback для старых браузеров
- `maxHeight: 'calc(100dvh - env(safe-area-inset-bottom, 0px))'` — правильное ограничение для новых

Footer во всех листах теперь `position: sticky; bottom: 0`, что гарантирует видимость кнопок при любом поведении viewport.

### Затронутые файлы (9 компонентов)
| Файл | Изменение |
|---|---|
| `src/components/ui/ModalBottomSheet.tsx` | vh fallback + sticky footer + убран `paddingBottom: 80px` |
| `src/components/ui/WizardModal.tsx` | vh fallback |
| `src/components/ui/TrinityMob.tsx` | vh fallback |
| `src/components/ui/TrinityMobDetailShell.tsx` | vh fallback |
| `src/components/ui/TrinityBottomDrawer.tsx` | vh fallback |
| `src/components/diary/TaskMob.tsx` | vh fallback |
| `src/components/sales/OrderDetailModal.tsx` | vh fallback |
| `src/components/sales/UnifiedSalesDialog.tsx` | vh fallback |
| `src/components/visits/VisitDetailMob.tsx` | vh fallback (2 места: основная шторка + sub-drawer добавления услуг) |

### Не затронуто
- Десктопные Split Layout страницы (payments, sales, diary) — там `dvh` используется для layout, не для bottom sheet, footer-обрезки нет
- Лендинг (landing/page.tsx, landing/layout.tsx) — не затронут, там `dvh` в CSS строках без inline style

---

## 08.04.2026 — feat: VisitActionButtons — глобальный стандарт кнопок на карточках визитов

**Коммит:** 2a00933

**Задача:** На узких экранах кнопки (WhatsApp, Маршрут, Начать и др.) налазили друг на друга и обрезались.

**Решение:** Новый компонент `VisitActionButtons` — глобальный стандарт для всех карточек визитов:
- Иконки без текста (WA, Маршрут, Google Meet) — всегда видны, не занимают много места
- Кнопка Начать/Завершить — `min-width: 80px`, `max-width: 160px`, занимает свободное место (`flex:1`)
- `•••` меню — Редактировать + Отменить визит, закрывается по клику вне
- Возвращает `null` для статусов `completed` и `cancelled` — лишнего не рендерит
- `stopPropagation` — клики по кнопкам не открывают карточку

**Затронутые файлы:**
- `src/components/visits/VisitActionButtons.tsx` — новый компонент
- `src/components/visits/VisitCard.tsx` — старые inline-кнопки заменены на `<VisitActionButtons />`
- `src/app/(dashboard)/visits/page.tsx` — `group-hover` блок в десктопной таблице заменён на `<VisitActionButtons />`

---

## 08.04.2026 — feat: Quick Mode — Быстрый режим мастера

**Коммит:** `260ff9d`

### Концепция

"Быстрый режим мастера" — альтернативный способ работы с визитами для мастеров-одиночек (типа Ксении), которым неудобна стандартная административная концепция визита. Вместо планирования и отметки прихода — постфактум-создание через карточку клиента.

### Флаг включения

`organizations.features.quick_mode: true` — включается из `/admin/organizations` тумблером "Быстрый режим мастера" (фиолетовый, иконка Play).

### Статус `open`

Новый статус для постфактум-визитов:

| Статус | Лента визитов | Календарь |
|---|---|---|
| `open` (постфактум, не завершён) | ✅ | ❌ |
| `scheduled` | ✅ | ✅ |
| `in_progress` | ✅ | ✅ |
| `completed` | ✅ | ✅ |

Цвет в UI: фиолетовый (violet). Колонка `is_postfactum boolean` — помогает cron отличать постфактум от плановых.

### pg_cron автостатусы (каждые 5 минут)

- `visit_auto_in_progress` (jobid 8): `scheduled → in_progress` когда `scheduled_at <= now()` и `is_postfactum = false`
- `visit_auto_completed` (jobid 9): `in_progress → completed` когда `scheduled_at + duration <= now()` и `is_postfactum = false`

Постфактум-визиты (`is_postfactum = true`) cron **не трогает** — их статус управляется только вручную.

### Файлы

| Файл | Описание |
|---|---|
| `src/hooks/useQuickMode.ts` | Хук — возвращает `true` если `features.quick_mode === true` |
| `src/components/modals/visits/QuickVisitModal.tsx` | WizardModal, 2 шага: выбор позиций + итог/действия |
| `src/app/api/visits/quick/route.ts` | `POST /api/visits/quick` — создаёт постфактум-визит |
| `src/app/admin/organizations/page.tsx` | + `QuickModeToggle` компонент + тумблер в `renderOrgDetail` |
| `src/components/modals/ClientDetailsModal.tsx` | + кнопка "Быстрый визит" (только если `isQuickMode`, десктоп) |
| `src/components/clients/ClientBottomSheet.tsx` | + `useQuickMode` + `QuickVisitModal` + `onQuickVisit` → TrinityMob |
| `src/components/ui/TrinityMob.tsx` | + пропс `onQuickVisit?` + кнопка "Быстрый визит" в action-шторке |
| `src/app/(dashboard)/visits/page.tsx` | + статус `open` в `statusBadge`, `avatarColor`, `activeVisits` |

### Суть QuickVisitModal

**Шаг 1 — Позиции:** несколько услуг + несколько товаров, у каждой позиции `QuantityControl` (+/-). Picker с поиском открывается по кнопке.

**Шаг 2 — Итог + действия:**
- "Сохранить" → `status: 'open'`, `is_postfactum: true` (визит сохранён, не завершён)
- "Завершить и оплатить" → `status: 'completed'` → открывает `sale-unified` диалог оплаты

### API `/api/visits/quick`

Поля body: `clientId`, `service`, `date`, `time`, `quick_items[]`, `status_override`.
- Первая услуга из `quick_items` → основной `service_id` визита
- Остальные услуги → `visit_services`
- Товары → `sales` + `sale_items`

### Миграция БД

`quick_mode_visits_open_status`:
- `visits.status` CHECK расширен: добавлен `'open'`
- `visits.is_postfactum boolean NOT NULL DEFAULT false`
- Индекс `idx_visits_cron_transition`
- pg_cron jobs: `visit_auto_in_progress`, `visit_auto_completed`

---

## 07.04.2026 — fix: Реальное удаление услуг

**Коммит:** 8729c7f

**Проблема:** `DELETE /api/services/[id]` делал `is_active=false` вместо реального удаления. Услуги "удалённые" на вебе оставались в базе и появлялись в мобильном приложении.

**Решение:**
1. Миграция БД: `visits.service_id` и `bookings.service_id` FK изменены с `NO ACTION` на `ON DELETE SET NULL`
2. Endpoint теперь делает реальный `DELETE` из таблицы
3. Почищены тестовые данные в org Amber Solutions

**Затронутые файлы:** `src/app/api/services/[id]/route.ts`, migration `fix_service_delete_fk_set_null`


### Апрель 2026 — fix: dateFilter=day для точной проверки пересечений визитов (коммит c4693f6)

**Файлы:** `src/lib/validations.ts`, `src/app/api/visits/list/route.ts`

**Проблема:** Flutter-приложение не могло точно загрузить визиты за конкретный день.
При создании визита на дату в будущем использовался `dateFilter=month`, который ограничен
текущим месяцем — даты следующего месяца возвращали 0 визитов, проверка пересечений молча не срабатывала.

**Решение:**
- `listVisitsSchema` — добавлен `'day'` в enum `dateFilter` + опциональный параметр `date: YYYY-MM-DD`
- `GET /api/visits/list?dateFilter=day&date=YYYY-MM-DD` — возвращает строго визиты одного дня
- Реализован с учётом Israel timezone (UTC+3): `00:00 IST = 21:00 UTC предыдущего дня`
- Ранний return до общего блока пагинации — не ломает существующие `today/week/month/all`


### Апрель 2026 — Расширение /api/mobile/dashboard (коммит 8f96c3f)

**Файл:** src/app/api/mobile/dashboard/route.ts

**Добавлено:** 5 новых блоков данных для мобильного дашборда.
12 параллельных запросов вместо 7 (Promise.all).

Новые поля ответа:
- 	op_services — топ-3 услуги за текущий месяц (name, revenue, count, bar_pct)
- 
ew_clients — последние 5 клиентов (id, name, phone, source, created_at)
- debtors — клиенты с незакрытыми долгами, сгруппированные по client_id (max 5)
- irthdays — клиенты с ДР на этой неделе (days_left, birthday)
- whatsapp — { total_unread, conversations[] } из wa_conversations

Все запросы фильтрованы по org_id. Bearer auth сохранён.


### 10 апреля 2026 — feat: PaymentReportModal — методы из настроек платежей (коммит 0b31cb0)

**Задача:** Список методов в "Сводке платежей" должен отражать только те методы, которые включены в `/settings/payments`, а не хардкоженный список из 5 кнопок.

**Решение:**
- Убраны хардкоженные `PAYMENT_METHODS` и `METHOD_LABEL_HE` из `PaymentReportModal.tsx`
- Добавлен `usePaymentMethodConfig()` hook — уже кеширован React Query (`payment-settings`), лишних запросов нет
- `enabledMethods` из хука — только методы с `enabled: true && !forcedOff`
- `enabledKeys` (useMemo) → инициализация `selectedMethods` через useEffect при загрузке
- При синхронизации: если метод отключили в настройках — он автоматически исчезает из выбора в Сводке
- `methodLabelHe` (useMemo) — строится из `enabledMethods` для корректных лейблов в PDF
- Показывается лоадер пока `methodsLoading`
- Кнопка "Создать PDF" заблокирована пока методы грузятся или ни один не выбран

**Поведение:**
- Методы в Сводке ≡ методам в `/settings/payments`
- `forcedOff` методы (Bit при наличии Tranzila терминала, Card без терминала) не показываются совсем
- Никакого лишнего fetch — React Query кеш `payment-settings` уже есть на странице

**Файл:** `src/components/payments/PaymentReportModal.tsx`
**Регрессия:** нет

---

### 10 апреля 2026 — fix: PaymentReportModal — добавлен Bit в фильтры Сводки (коммит 7df61af)

**Проблема:** В модалке "Сводка платежей" (`PaymentReportModal`) метод оплаты **Bit** отсутствовал в списке методов — ни как кнопка выбора, ни в `selectedMethods` по умолчанию, ни в `METHOD_LABEL_HE`. Платежи через Bit вылетали из фильтрации при расчёте суммы и генерации PDF.

**Второй баг:** Фильтрация шла через `p.payment_method` напрямую, без нормализатора — ключ `'credit_card'` из БД не совпадал с каноническим `'card'`, аналогично другие алиасы.

**Решение:**
- `PAYMENT_METHODS` — добавлен Bit (`value: 'bit'`), карта переименована в `'card'` (canonical key)
- `METHOD_LABEL_HE` — добавлен `bit: 'ביט'`, карта `card: 'כרטיס'`
- `selectedMethods` default — теперь включает все 5 методов включая `'bit'` и `'card'`
- Импортирован `normalizePaymentMethod` из `@/lib/payment-method-normalizer`
- Фильтрация в `useEffect` (расчёт суммы) и `handleGenerate` (генерация PDF) — переведена на `normalizePaymentMethod(p.payment_method)` вместо raw значения из БД
- В `items.map` метка метода тоже берётся через normalizer: `METHOD_LABEL_HE[normalizePaymentMethod(...)]`

**Файл:** `src/components/payments/PaymentReportModal.tsx`
**Регрессия:** нет — только расширение, логика других методов не затронута

---

### 10 апреля 2026 — fix: demo/boris — устранение 404 (коммит dcfb47b)

**Проблема:** Борис получал 404 при открытии `/demo/boris`. Причина — огромный HTML (>1000 строк) внутри serverless route.ts вызывал проблемы при cold start на Vercel Edge.

**Решение:**
- `public/demo-boris.html` — уже существовал, актуальный
- `public/demo-boris-portal.html` — создан, HTML извлечён из portal/route.ts
- `src/app/demo/boris/route.ts` → теперь делает 301 redirect на `/demo-boris.html` (статика CDN)
- `src/app/demo/boris/portal/route.ts` → теперь делает 301 redirect на `/demo-boris-portal.html`

**Результат:** Демо раздаётся Vercel CDN как статика — никаких serverless функций, никогда не падает.

**Файлы:** public/demo-boris.html, public/demo-boris-portal.html, src/app/demo/boris/route.ts, src/app/demo/boris/portal/route.ts


---

### 10 апреля 2026 — fix: удаление дубля Tranzila из методов оплаты (коммит 3549f65)

**Проблема:** В списке методов оплаты существовали два идентичных с пользовательской точки зрения метода: `card` ("Кредитная карта") и `tranzila` ("Tranzila"). Оба использовали Tranzila как шлюз. На экране настроек отображались оба — путаница.

**Решение:**
- `src/lib/payment-method-normalizer.ts` — добавлен маппинг `tranzila` → `card` в `normalizePaymentMethod()`
- `src/app/api/mobile/payments/settings/route.ts` — убран `'tranzila'` из `VALID_METHODS`; в GET и PUT добавлена нормализация `tranzila → card` + дедупликация
- `src/app/api/payments/settings/route.ts` — аналогично: нормализация + дедупликация в GET и PUT
- Старые данные в БД (если там был `'tranzila'`) автоматически конвертируются в `'card'` при следующем чтении/сохранении

**Правило:** `'card'` — единственный канонический ключ для кредитной карты через Tranzila.


---

### 10 апреля 2026 — feat: mobile_sessions — детекция параллельных сессий (коммит f6a08df)

**Задача:** При входе с нового устройства в уже залогиненный аккаунт — старое устройство должно получить сообщение и автоматически выйти.

**Архитектура:**
- Один `user_id` = одна запись в `mobile_sessions` (unique index)
- При новом логине — upsert обновляет `token_hash`, Supabase Realtime шлёт UPDATE
- Flutter подписывается на свою строку, сравнивает `token_hash` — если изменился, показывает диалог и делает logout
- При refresh — тоже upsert, но Flutter распознаёт что это его собственный токен (hash совпадёт) и не выходит

**Новые файлы:**
- `sql/mobile-sessions.sql` — миграция: таблица, RLS, unique index, Realtime publication

**Изменённые файлы:**
- `src/app/api/mobile/auth/route.ts` — POST и PUT теперь вызывают `upsertMobileSession()`
- `src/app/api/mobile/auth/google/route.ts` — POST вызывает `upsertMobileSession()`

**Безопасность:** Токен не хранится — только SHA-256 хеш. RLS: пользователь видит только свою строку. Запись только через service role.

**Следующий шаг:** Flutter часть — `SessionWatcherService` + диалог выброса (часть 2).


---

### 11 апреля 2026 — feat: канонический список модулей (коммит f1618fb)

**Задача:** Привести все модули к единому стандарту — один источник истины, железная логика тумблеров в админке.

**Канонические ключи (14 штук, хранятся в organizations.features.modules):**
clients, visits, booking, registration, whatsapp, branches, loyalty, analytics, inventory, tasks, payments, sales, finances, processing, kira

**Новые ключи (добавлены):** registration, loyalty, tasks, finances, processing
**Переименованы в UI:** diary → tasks, analytics расширена, whatsapp уточнена
**Устаревшие ключи** (diary, subscriptions, sms, statistics, reports, telegram, birthday) — сохранены в БД, не удалены, но не отображаются в UI

**Логика clients+visits:** один тумблер в UI переключает оба ключа одновременно через `linkedKeys` и `applyLinkedKeys()`. `visits.hiddenInUI = true`.

**Новые функции в modules-config.ts:**
- `initModulesState(saved)` — инициализирует полный объект, новые ключи = false
- `applyLinkedKeys(state, key, value)` — применяет linked-ключи при переключении
- `ALL_MODULE_KEYS` — массив всех ключей для итерации

**Изменённые файлы:**
- `src/lib/modules-config.ts` — полная перезапись
- `src/lib/subscription-plans.ts` — планы обновлены под новые ключи, цены: basic ₪199, pro ₪249, enterprise ₪499
- `src/components/ModuleGuard.tsx` — `alwaysVisible` → `alwaysOn`
- `src/app/admin/organizations/page.tsx` — openModules использует initModulesState, Modal использует applyLinkedKeys и hiddenInUI

**БД:** module_pricing обновлена — добавлены 5 новых ключей, названия приведены к стандарту

**Следующий шаг:** Flutter admin — тумблеры модулей в trinity-mobile AdminScreen


---

### Апрель 2026 — fix: tranzila-success webhook — верификация платежа перед обновлением статуса (commit 6f49a5b)

**Дата:** 11.04.2026

#### Что изменено

**Файл:** `src/app/api/payments/tranzila-success/route.ts`

**Проблема (аудит безопасности):**
Webhook `/api/payments/tranzila-success` обновлял `payments.status = 'completed'` только по `paymentId` (`cField1` из query params Tranzila), без проверки существования записи и суммы. Теоретически — подделанный callback URL с чужим `payment_id` мог пометить платёж как оплаченный без реальной оплаты.

**Исправлено (GET + POST):**
1. **Проверка существования** — `SELECT id, amount, status FROM payments WHERE id = paymentId`. Если не найден → redirect на `/payment-failed`
2. **Верификация суммы** — сумма из Tranzila callback (`sum` param) сравнивается с суммой из БД (допуск ±0.01). Расхождение → redirect на `/payment-failed` + лог ошибки
3. **Идемпотентность** — если `status = 'completed'` уже → пропускаем без повторного обновления

**Что изолировано правильно (подтверждено аудитом):**
- Ссылки на оплату изолированы по организации — терминал Tranzila грузится из БД по `orgId` авторизованного пользователя
- `POST /api/mobile/payments/create-link` проверяет клиента через `.eq('org_id', orgId)` → 403 при попытке использовать чужого клиента
- Ксения (ks.hair.lab) использует только свой терминал, Amber Solutions — только свой

**Коммит:** `6f49a5b`

---

### Апрель 2026 — feat: WhatsApp автоматические сообщения — триггеры, cron, UI (commit 17c9e51)

**Дата:** 12.04.2026

**Что сделано:**

**БД — миграция `add_wa_trigger_types_v2`:**
- Расширен check constraint `wa_trigger_settings_trigger_type_check` — добавлены 5 новых типов: `after_visit`, `after_sale`, `birthday`, `win_back`, `debt_reminder`
- Добавлены поля: `delay_hours integer DEFAULT 1`, `win_back_days integer DEFAULT 60`
- Вставлены дефолтные строки для всех существующих org по каждому новому типу

**API `/api/wa-triggers` (GET/POST):**
- Поддерживает все 10 типов триггеров
- POST сохраняет `delay_hours`, `win_back_days` вместе с остальными полями

**UI `/settings/whatsapp/triggers`:**
- Новая страница: карточки для каждого триггера (9 штук)
- Каждая карточка: иконка/цвет, название, описание, toggle вкл/выкл
- При раскрытии карточки: поле времени (hours_before / delay_hours / win_back_days в зависимости от типа), textarea шаблона сообщения, кнопки-подсказки переменных (`{{client_name}}`, `{{date}}` и т.д.)
- Кнопка "Сохранить" sticky внизу
- Ссылка на страницу добавлена в `/settings/whatsapp`
- Двуязычная (иврит / русский)

**Cron `/api/cron/reminders` — переписан:**
- Теперь бегает каждый час (`"0 * * * *"` в vercel.json)
- Загружает активные триггеры `visit_reminder` из `wa_trigger_settings`
- Для каждой org с активным триггером — ищет визиты в часовом окне `(now + hours_before ± 30мин)`
- Отправляет через `sendWhatsAppMessage` с шаблоном из БД
- Fallback: org без WA триггера — SMS + Email как раньше

**Cron `/api/cron/birthdays` — обновлён:**
- Проверяет триггер `birthday` в `wa_trigger_settings`
- Если включён — отправляет через WhatsApp с шаблоном из БД
- Fallback на SMS если триггер выключен но `birthday_sms_enabled` в features

**Новый cron `/api/cron/wa-triggers` (каждый час):**
- `after_visit` — через `delay_hours` после завершения визита (`status = completed`)
- `after_sale` — через `delay_hours` после оплаты (`paid_at`)
- `win_back` — клиентам без завершённых визитов за `win_back_days` дней и без будущих записей
- `debt_reminder` — клиентам с платежами в статусе `partial` или `unpaid`, сумма долга агрегируется

**`src/lib/audit.ts`:** добавлен тип `send_wa` в `AuditAction`

**`vercel.json`:** добавлен `/api/cron/wa-triggers` (каждый час), `/api/cron/reminders` переведён на каждый час

**Затронутые файлы:**
- `src/app/(dashboard)/settings/whatsapp/page.tsx` — ссылка на триггеры
- `src/app/(dashboard)/settings/whatsapp/triggers/page.tsx` (новый)
- `src/app/api/wa-triggers/route.ts`
- `src/app/api/cron/reminders/route.ts`
- `src/app/api/cron/birthdays/route.ts`
- `src/app/api/cron/wa-triggers/route.ts` (новый)
- `src/lib/audit.ts`
- `vercel.json`

**Коммит:** `17c9e51`


---

### Апрель 2026 — fix: BiDi RTL для ивритских WhatsApp автосообщений (commit 54246e2)

**Дата:** 12.04.2026

**Проблема:** При отправке ивритских шаблонов с латинскими/кириллическими переменными
({{client_name}}, {{org_name}}) WhatsApp ломал порядок слов в строке — BiDi-алгоритм
переключал направление на LTR для каждого не-ивритского слова.

**Решение:** RLM (Right-to-Left Mark, `\u200F`) вокруг каждого подставляемого значения
+ RLM в начале сообщения. Стратегия `\u202B/\u202C` (RTL Embedding) не работает в WhatsApp.
Определение языка по исходному шаблону — до замены переменных.

**Затронутые файлы:**
- `src/app/api/cron/wa-triggers/route.ts` — `applyTemplate()` переписана
- `src/app/api/cron/birthdays/route.ts` — то же
- `src/app/api/cron/reminders/route.ts` — то же

**Коммит:** `54246e2`

---

### Апрель 2026 — feat: WA рассылка, виджет сделок, sidebar (commit 5426ebb)

**Дата:** 12.04.2026

**Что сделано:**

**БД:** таблица `wa_broadcast_log` — лог рассылок с RLS, индекс по org_id+sent_at

**API `/api/wa/broadcast`:**
- GET — статус лимита (used/remaining/limit=30 за 24ч)
- POST — отправка рассылки с BiDi-фиксом, батч-логирование, лимит 30/24ч

**UI `/broadcast`:** двухколоночный layout
- Слева: список клиентов с поиском, фильтры по давности (30/60/90+ дней), чекбоксы, выбрать всех/очистить
- Справа: textarea сообщения, кнопка отправки, результат
- LimitBar: прогресс-бар лимита + красивое предупреждение при исчерпании

**`RecentDealsWidget`:** виджет последних 5 сделок для дашборда (статус, сумма, дата)

**`DashboardContent`:** заменён `IncomeExpensesWidget` → `RecentDealsWidget`

**`Sidebar.tsx` + `MobileSidebar.tsx`:** `/inbox` → `/broadcast` (WhatsApp рассылка)

**Затронутые файлы:**
- `src/app/(dashboard)/broadcast/page.tsx` (новый)
- `src/app/api/wa/broadcast/route.ts` (новый)
- `src/components/dashboard/RecentDealsWidget.tsx` (новый)
- `src/components/dashboard/DashboardContent.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileSidebar.tsx`

**Коммит:** `5426ebb`

---

### Апрель 2026 — feat: Onboarding API — 7 endpoint'ов для мобильного онбординга (commit feddfc2)

**Дата:** 12.04.2026

#### Новые файлы

**`src/app/api/mobile/onboarding/profile/route.ts`** — PATCH  
Обновляет `organizations.name`, `organizations.phone`, расширяет `features.onboarding{}` JSONB (owner_first, owner_last, phone_fixed, company_id, logo_url, category_id). Валидация: израильский мобильный `^0(5[0-9])\d{7}$`, стационарный `^0[2-4679]\d{7}$`, ת.ז./ח.פ. `^\d{9}$`. Не требует ALTER TABLE.

**`src/app/api/mobile/onboarding/logo/route.ts`** — POST multipart  
Загружает логотип в Supabase Storage bucket `organization-logos` (upsert, путь `{orgId}/logo.{ext}`). Лимит 5MB, допустимые типы: JPEG/PNG/WebP/GIF. Сохраняет публичный URL в `organizations.logo_url`. Возвращает `{url}`.

**`src/app/api/mobile/onboarding/categories/route.ts`** — GET + POST  
GET: читает из `business_categories`, graceful fallback на хардкод (15 категорий) если таблицы ещё нет. POST: INSERT новой категории с `org_id` (кастомная). RLS: глобальные видны всем, кастомные — только своей орге.

**`src/app/api/mobile/onboarding/services/route.ts`** — POST  
Пакетный INSERT до 10 услуг в таблицу `services` (поля: `name`, `name_ru`, `price`, `duration_minutes`, `is_active=true`, `org_id`). Полная валидация каждой строки.

**`src/app/api/mobile/onboarding/products/route.ts`** — POST  
Пакетный INSERT до 10 товаров в `products` + `inventory_transactions(type='initial')` для начального остатка. Поля: `name`, `sell_price`, `quantity`, `stock_quantity`, `unit='יחידה'`, `is_active=true`.

**`src/app/api/mobile/onboarding/hours/route.ts`** — POST  
Сохраняет рабочее расписание в `features.working_hours` JSONB. Формат: `[{day_of_week:0-6, is_working, open_time:'HH:MM', close_time:'HH:MM', breaks:[{from,to}]}]`. Валидация формата времени regex `^\d{2}:\d{2}$`.

**`src/app/api/mobile/onboarding/complete/route.ts`** — POST  
Записывает `features.onboarding_completed_at = now()`. Финальная точка флоу.

#### Миграция БД

**`supabase/migrations/20260412_create_business_categories.sql`**  
Таблица `business_categories`: `id uuid PK`, `name text`, `org_id uuid nullable` (NULL = глобальная, uuid = кастомная орга). Вычисляемое поле `is_global GENERATED ALWAYS AS (org_id IS NULL) STORED`. RLS: глобальные — read all; кастомные — INSERT только owner/admin своей орги. 15 дефолтных категорий (INSERT).

**Запуск миграции:** Supabase Dashboard → SQL Editor → выполнить файл.  
**Bucket:** Storage → New bucket → `organization-logos` → Public.

#### Безопасность

- Каждый endpoint: `getAuthContext(req)` первым, `orgId` только из БД
- Service role используется только после проверки auth
- Все операции scope по `org_id` — cross-org невозможен
- Размер файла логотипа лимитирован (5MB), тип проверяется

#### Схема хранения (без ALTER TABLE)

```jsonc
// organizations.features (JSONB)
{
  "onboarding": {
    "owner_first":  "Ирина",
    "owner_last":   "Коэн",
    "phone_fixed":  "031234567",
    "company_id":   "123456789",
    "logo_url":     "https://...",
    "category_id":  "uuid"
  },
  "working_hours": [
    { "day_of_week": 0, "is_working": true, "open_time": "09:00", "close_time": "18:00", "breaks": [] },
    { "day_of_week": 6, "is_working": false }
  ],
  "onboarding_completed_at": "2026-04-12T14:00:00.000Z"
}
```

**Затронутые файлы:**
- `src/app/api/mobile/onboarding/profile/route.ts` (новый)
- `src/app/api/mobile/onboarding/logo/route.ts` (новый)
- `src/app/api/mobile/onboarding/categories/route.ts` (новый)
- `src/app/api/mobile/onboarding/services/route.ts` (новый)
- `src/app/api/mobile/onboarding/products/route.ts` (новый)
- `src/app/api/mobile/onboarding/hours/route.ts` (новый)
- `src/app/api/mobile/onboarding/complete/route.ts` (новый)
- `supabase/migrations/20260412_create_business_categories.sql` (новый)


---

## Стандарты UI — Шрифты

### Hebrew Font Standard (12.04.2026)

**Шрифт:** Rubik (Google Fonts)  
**Веса:** 400 (Regular), 500 (Medium), 700 (Bold), 800 (ExtraBold)  
**Применение:** все Hebrew-facing интерфейсы — email templates, мобильные экраны, любой контент на иврите  
**Fallback:** `'Segoe UI', Arial, sans-serif`

**Подключение в HTML/email:**
```html
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap" rel="stylesheet" />
```

**CSS:**
```css
font-family: 'Rubik', 'Segoe UI', Arial, sans-serif;
```

**Обоснование:** Rubik — геометрический sans-serif, поддерживает иврит, используется в Israeli tech продуктах (Monday.com, Wix, Fiverr). Технологичный характер, хорошо читается на тёмных фонах Trinity.

**Затронутые файлы:**
- `supabase_invite_email_template.html` — первый шаблон на Rubik
  
---  
  
### 13.04.2026 — feat: страница долгов — таблица + detail panel (коммит 5f00ff3)

**Дизайн:** Таблица + sticky detail panel справа при нажатии на строку (ПК). Мобиль — заглушка (следующий этап).

**API `/api/dashboard/debts`** переписан:
- Авторизация через `getAuthContext(request)` + legacy fallback на `?org_id=`
- Новый источник: `visits WHERE status='completed' AND payment_status='unpaid'` (новый механизм)
- Второй источник: `sales WHERE status IN ('unpaid','partial')` (существующий)
- Возвращает `items[]` с деталями по каждой задолженности + `days_ago`

**UI `/debts/page.tsx`** переписан:
- Шапка: кол-во клиентов + общая сумма
- Фильтры: поиск по имени/телефону + давность (все / 7+ / 30+ / 90+ дней)
- Таблица: аватар-инициалы с цветом срочности, позиций, давность-бейдж, сумма, стрелка
- При клике на строку — таблица сужается до 55%, справа появляется detail panel
- Detail panel: шапка клиента, список позиций (тип визит/продажа, дата, сумма), 3 кнопки: WA-напоминание / Принять оплату / Изменить
- "Изменить" → открывает `client-details` модал через `useModalStore`

**Коммит:** `5f00ff3`

**Задача:** При завершении визита "в долг" — отображать как завершённый но не оплаченный.

**Архитектура:** новое поле `payment_status` на таблице `visits`, без дублирования данных из `payments`.

**Миграция БД:** `20260413_add_payment_status_to_visits`
```sql
visits.payment_status TEXT NOT NULL DEFAULT 'paid'
  CHECK (payment_status IN ('paid', 'unpaid', 'partial'))
```
Индекс: `idx_visits_payment_status ON visits(org_id, payment_status) WHERE status = 'completed'`

**Изменённые файлы:**
- `src/types/visits.ts` — добавлен `payment_status?: 'paid' | 'unpaid' | 'partial'`
- `src/app/api/visits/[id]/status/route.ts` — принимает опциональный `payment_status`, валидирует и пишет в БД
- `src/app/(dashboard)/visits/page.tsx` — `updateVisitStatus()` принимает `paymentStatus`; `handleCompleteWithoutPayment` передаёт `payment_status: 'unpaid'`; десктопная таблица завершённых визитов показывает amber бейдж "Не оплачен"
- `src/components/visits/VisitCard.tsx` — мобильные карточки: бейдж рядом со StatusBadge
- `src/components/visits/VisitDetailModal.tsx` — sidebar: бейдж amber/orange рядом со статусом

**Поведение:**
- Завершить с оплатой → `status: completed, payment_status: paid` (по умолчанию)
- Завершить без оплаты (в долг) → `status: completed, payment_status: unpaid` → amber бейдж во всех UI
- Существующие визиты не затронуты (DEFAULT 'paid')

**Коммит:** `f6a15a6`  
  
**??????:** ??? ??????? ????????? ?? ?????? ?????????? ?????: ? ??????? ??? ??? ?????? (? ????).  
  
**??????????:**  
- ???????? state completeMenuVisit ? visits/page.tsx  
- handleCompleteVisit ?????? ?????? ????????? ???? (?? ????? ?????)  
- handleCompleteWithPayment - ?????? ???? ????? sale-unified  
- handleCompleteWithoutPayment - ?????? PATCH /api/visits/[id]/status completed  
- ????: bottom sheet mobile / ?????????????? ????? desktop  
- ??????: CreditCard (?????), Ban (??? ??????)  
- ??? 4 ????? ????? ?????????? ???? handleCompleteVisit  
- ???? paymentsEnabled=false - ???? ?? ????????????, ????? completed  
  
**?????:** src/app/(dashboard)/visits/page.tsx  
  
**Коммит:** d4fdf3f

---

### 2025-04-13 — fix(debts): редизайн мобильного UI раздела «Долги»

**Проблема:** Вкладка «Долги» в /payments отображалась без дизайна — текст без карточек, кнопки не видны (прозрачный фон без стилей). CSS-переменные `var(--color-background-primary)` не резолвились в inline styles на мобиле.

**Решение:**
- `urgencyColor()` переведён с CSS-переменных на реальные hex-цвета (работает везде)
- Мобильные карточки: `rounded-2xl`, `shadow-sm`, цветная `borderInlineStart` по срочности
- Кнопки WA/Оплата/Изменить — акцентные: зелёный / синий / серый с иконками
- Desktop таблица — переведена на Tailwind классы, правильные hover-состояния
- `DetailPanel` — Tailwind-based, кнопки вертикальные с иконкой + текстом
- Мобиль: items разворачиваются при клике (expand), "ещё N позиций" кликабелен
- Фильтры давности и поиск — без изменений (функционал сохранён полностью)

**Файл:** `src/app/(dashboard)/debts/page.tsx`

**Коммит:** d219fa5

---

### 2025-04-13 — fix(debts): исправлены кнопки «Изменить» и «Принять оплату»

**Проблемы:**
- Кнопка «Изменить» не работала: `openModal('client-details', { clientId })` — неверный ключ
- Кнопка «Принять оплату» делала API-запрос и открывала WhatsApp напрямую — неверный UX

**Исправления:**
- `handleEdit`: ключ исправлен на `{ id: debt.client_id }` — теперь открывает карточку клиента
- `handlePaymentLink`: убран прямой API-запрос, теперь `openModal('payment-unified', { clientId, clientName, clientPhone, prefillAmount: debt.total_debt, onSuccess })` — открывает стандартный диалог выбора способа оплаты с предзаполненными данными клиента и суммой долга; после успеха инвалидирует `['debts']`
- Добавлен `useQueryClient` в импорты

**Файл:** `src/app/(dashboard)/debts/page.tsx`

**Коммит:** 05b5b45

