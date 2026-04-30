# Trinity CRM — Полная документация

> Amber Solutions · [ambersol.co.il](http://ambersol.co.il) · Последнее обновление: 20.04.2026

---

## 📋 Содержание

 1. [Обзор проекта](#1-%D0%BE%D0%B1%D0%B7%D0%BE%D1%80-%D0%BF%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D0%B0)
 2. [Инфраструктура](#2-%D0%B8%D0%BD%D1%84%D1%80%D0%B0%D1%81%D1%82%D1%80%D1%83%D0%BA%D1%82%D1%83%D1%80%D0%B0)
 3. [Архитектура](#3-%D0%B0%D1%80%D1%85%D0%B8%D1%82%D0%B5%D0%BA%D1%82%D1%83%D1%80%D0%B0)
 4. [База данных — таблицы и схема](#4-%D0%B1%D0%B0%D0%B7%D0%B0-%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D1%85)
 5. [RLS и безопасность](#5-rls-%D0%B8-%D0%B1%D0%B5%D0%B7%D0%BE%D0%BF%D0%B0%D1%81%D0%BD%D0%BE%D1%81%D1%82%D1%8C)
 6. [Аутентификация и роли](#6-%D0%B0%D1%83%D1%82%D0%B5%D0%BD%D1%82%D0%B8%D1%84%D0%B8%D0%BA%D0%B0%D1%86%D0%B8%D1%8F-%D0%B8-%D1%80%D0%BE%D0%BB%D0%B8)
 7. [Ветки (филиалы)](#7-%D0%B2%D0%B5%D1%82%D0%BA%D0%B8-%D1%84%D0%B8%D0%BB%D0%B8%D0%B0%D0%BB%D1%8B)
 8. [Платежи и Tranzila](#8-%D0%BF%D0%BB%D0%B0%D1%82%D0%B5%D0%B6%D0%B8-%D0%B8-tranzila)
 9. [WhatsApp (Whapi)](#9-whatsapp-whapi)
10. [Лендинг /landing](#10-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-landing)
11. [UI-компоненты](#11-ui-%D0%BA%D0%BE%D0%BC%D0%BF%D0%BE%D0%BD%D0%B5%D0%BD%D1%82%D1%8B)
12. [Демо-режим](#13-%D0%B4%D0%B5%D0%BC%D0%BE-%D1%80%D0%B5%D0%B6%D0%B8%D0%BC)
13. [Beautymania интеграция](#14-beautymania-%D0%B8%D0%BD%D1%82%D0%B5%D0%B3%D1%80%D0%B0%D1%86%D0%B8%D1%8F)
14. [Kira AI агент](#15-kira-ai-%D0%B0%D0%B3%D0%B5%D0%BD%D1%82)
15. [Правила разработки](#16-%D0%BF%D1%80%D0%B0%D0%B2%D0%B8%D0%BB%D0%B0-%D1%80%D0%B0%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B8)
16. [Changelog — апрель 2026](#17-changelog)

---

## 1. Обзор проекта

**Trinity CRM** — SaaS CRM-платформа для малого бизнеса в Израиле: салоны, барбершопы, клиники, автомастерские, юристы, риелторы.

ПараметрЗначениеПродуктTrinity CRMДомен<https://ambersol.co.il>GitHub[github.com/Creepie132/trinity](http://github.com/Creepie132/trinity)Локальный путь`F:\Amber_solutions_Kira\Trinity`StackNext.js App Router, Supabase, TypeScript, Tailwind CSSДеплойVercelТекущие клиентыBeautymania (Анета), Hair Rehab (Ксения)

### Тарифные планы

ПланЦенаНазначениеBase₪199/месСтарт, клиенты, визиты, складPro₪249/мес+ онлайн-запись, статистика, SMSEnterprise₪499/мес+ филиалы, лояльность, до 5 сотрудниковCustomпо выборуИндивидуальные модулиНастройка₪500 разовоВыезд + настройка + обучение

---

## 2. Инфраструктура

### Vercel

ПараметрЗначениеTeam ID`team_LMjQcFhJbvsscDS6v1qU2If9`Project ID`prj_4LI8wdySl50XqA52ymhhC4IcY8JI`Build MachineBasicPreview URLpush в `main`Production`git push origin main:production`

### Supabase

ПараметрЗначениеProject ID`tjryzcqvsavtllahjyrj`Regioneu-central-1Realtimeвключён для `wa_conversations`, `wa_messages`, `site_orders`

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

ТаблицаНазначениеКлючевые колонки`organizations`Одна запись = один клиент Trinityid, name, features(jsonb), plan, subscription_status`org_users`Членство пользователей в orguser_id, org_id, role`branches`Филиал → родительская orgid, parent_org_id, child_org_id`user_active_branch`Активная ветка пользователяuser_id, active_org_id`clients`CRM-клиенты бизнесаid, org_id, first_name, last_name, phone, email`visits`Записи/визитыid, org_id, client_id, staff_id, started_at, status`payments`Платежиid, org_id, client_id, amount, status, tranzila_document_id`products`Товары/материалыid, org_id, name, price, stock_quantity`inventory_transactions`Движение складаid, org_id, product_id, type, quantity`sales`Продажиid, org_id, client_id, total_amount, status`sale_items`Позиции продажиid, sale_id, org_id, product_id, quantity, price`site_orders`Заказы с сайта Beautymaniaid, org_id, client_id, sale_id, status`wa_conversations`WhatsApp чатыid, org_id, client_id, phone, status`wa_messages`Сообщения WAid, conversation_id, org_id, body, direction`wa_integrations`Настройки WAid, org_id, provider_type, instance_id`wa_send_log`Лог отправок WAid, org_id, client_id, status`deals`Сделки (CRM)id, org_id, client_id, assigned_to, stage_id`deal_stages`Этапы воронкиid, org_id, name, position`work_shifts`Смены сотрудниковid, org_id, user_id, started_at`audit_log`Аудит действийid, org_id, action, entity_type, entity_id`staff_permissions`Права сотрудниковid, org_id, user_id, permissions(jsonb)`push_subscriptions`Web push подпискиid, org_id, user_id, subscription(jsonb)`revenue_logs`Доходы сотрудниковid, org_id, worker_id, amount`expenses`Расходыid, org_id, amount, category`impersonation_sessions`Сессии impersonationid, admin_id, target_org_id, token`org_receipt_settings`Настройки квитанцийid, org_id, provider, document_type, is_enabled

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

- `staff_permissions`: удалены дубли `staff_view_own_permissions`, `owner_manages_permissions`
- `inventory_transactions`: удалены старые `inventory_select`, `inventory_insert` (через `get_user_org_ids()`)
- `branches`**,** `deal_stages`**,** `deal_tags`**,** `product_relations`**,** `sales_plans`: ALL-политики разбиты на INSERT/UPDATE/DELETE чтобы не перекрываться с SELECT

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

ФайлИспользование`src/lib/supabase/server.ts`Cookie-based client (для обычных запросов с RLS)`src/lib/supabase-service.ts`Service role (обходит RLS, только после проверки auth)

### Роли пользователей

РольДоступ`owner`Полный доступ к org, управление настройками, staff`admin`Управление клиентами, платежами, данными`staff`Ограниченный доступ через `staff_permissionsworker`Изолированный раздел `/worker` — только свои данныеsuperadminЧерез `admin_users` таблицу — полный доступ ко всем org

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

КомпонентНазначение`branches` таблицаСвязь parent_org_id → child_org_id`user_active_branch`Активная ветка пользователя (server truth)`BranchContext.tsx`Client-side кэш в localStorage`POST /api/set-active-branch`Сохранение выбора в БД

### Данные по контексту

Тип данныхСкопМеханизмClientsShared (mainOrgId)Без branch-контекстаVisitsPer activeOrgIdService role + user_active_branchPaymentsPer activeOrgIdService role + user_active_branchProductsPer activeOrgIdService role + user_active_branchDashboardPer activeOrgIduseBranch() hook

---

## 8. Платежи и Tranzila

### Tranzila — библиотеки

ФайлНазначение`src/lib/tranzila.ts`Создание платёжных ссылок (DirectNG iframe)`src/lib/tranzila-invoices.ts`Генерация документов (Invoices API)`src/lib/tranzila-webhook.ts`Безопасность вебхуков (подпись, IP)

### Типы документов Tranzila

Код APIТип в кодеИврит`IRreceipt_invoice`חשבונית מס קבלה (default)`REreceipt`קבלה`INinvoice`חשבונית מס

**Default везде**: `receipt_invoice` (חשבונית מס קבלה). Меняется через `org_receipt_settings.document_type`.

### Терминалы

ПеременнаяНазначение`TRANZILA_TERMINAL_ID`Основной платёжный терминал (`ambersolt`)`TRANZILA_TOKEN_TERMINAL`Token-терминал для рекуррентных платежей`tranzila_invoice_terminal`Отдельный терминал для документов (на уровне org)

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

МаршрутНазначение`GET /api/wa-inbox/conversations`Список чатов`POST /api/wa-inbox/send`Отправить сообщение`GET /api/wa-inbox/[id]`Сообщения чата`POST /api/wa-inbox/[id]/create-client`Создать клиента из чата`POST /api/wa-inbox/[id]/create-visit`Создать визит из чата`POST /api/webhooks/whapi`Входящие сообщения от Whapi

### WA-напоминания о визитах

- Cron: `GET /api/cron/reminders`
- Шаблоны: `wa_trigger_settings` (время, текст)
- Отправка через Whapi API

---

## 10. Лендинг /landing

### Расположение

- `src/app/landing/page.tsx` — единый client-component (`'use client'`), \~1700 строк
- `src/app/landing/layout.tsx` — пустой pass-through (изоляция через root layout + cookie)
- `src/app/landing/metadata.ts` — SEO metadata
- `src/app/page.tsx` — `redirect('/landing')` (корень → лендинг)

### Изоляция от Trinity app

Лендинг рендерится в ОТДЕЛЬНОМ `<html>/<body>` без Trinity-провайдеров.

**Механизм:**

1. `middleware.ts` на публичных путях выставляет cookie `trinity_page=landing` (maxAge 60s) только для `/landing*`, для остальных публичных путей — удаляет
2. Root `src/app/layout.tsx` читает cookie в SSR — если `trinity_page === 'landing'`:
   - `<html lang="ru" dir="ltr">` (всегда LTR, без Hebrew)
   - `<head>` подключает только Inter (Google Fonts)
   - `<body>` inline-style: `background: #080810`, `fontFamily: 'Inter'`
   - Никаких `QueryProvider`, `LanguageProvider`, `Toaster`, PWA-манифеста
3. Иначе (обычная Trinity-страница) — полный layout с Rubik/Assistant, провайдерами, JSON-LD

**Зачем:** болванка требует `body { overflow: hidden }` + fixed sidebar + scroll-snap. Если бы лендинг рендерился под общим layout с Trinity-провайдерами и её `globals.css`, глобальные стили конфликтовали бы с лендингом (особенно Rubik vs Inter, RTL vs LTR, Tailwind reset vs собственный reset).

### Архитектура страницы

Единый client-компонент, все стили inline через `<style>{`...`}</style>` (template literal внутри JSX). Это позволяет держать весь лендинг в одном файле и избегать конфликтов с Trinity CSS.

`useEffect` инициализирует 3 `IntersectionObserver`:

- **Fade-up reveals** — `.reveal` получает `.visible` при появлении в viewport
- **Active section** — синхронизирует `.active` класс sidebar/mobile-tabs со scroll-позицией
- **Smooth scroll** — перехватывает клики по `a[href^="#"]`, делает `scrollIntoView({ behavior: 'smooth' })`

Scroll-контейнер — `<main id="main-scroll">` с `scroll-snap-type: y mandatory`. Все `IntersectionObserver` используют этот элемент как `root`.

### Компоненты страницы

 1. **Sidebar** (fixed, left, 80px → expands to 240px on hover) — логотип, 7 пунктов навигации, «Войти →», переключатель языка
 2. **Mobile bottom tabs** (fixed, bottom, только `<768px`) — 5 табов: Главная, Возможности, Тарифы, Отзывы, Контакты
 3. **Hero** — eyebrow, H1 с gradient-text, subtitle, 2 CTA-кнопки, 3 stats (90% WhatsApp / 5 мин / 0₪), particles + mesh-gradient bg, scroll-chevron
 4. **Industries strip** — marquee с 8 типами бизнеса (×2 для seamless loop)
 5. **Pain points** — 3 карточки с красной полосой слева (записи теряются / SMS не читают / непонятно что работает)
 6. **Bento features** — 6 карточек в grid-template-areas:
    - WhatsApp (full row, с mini-chat mockup из 3 bubbles)
    - Clients / Diary
    - Analytics (full row, с mini-chart из 10 bars)
    - Stock / Payments
 7. **How it works** — 4 шага с circular gradient-connector
 8. **Security** — 4 карточки 2×2 с зелёной полосой слева
 9. **Pricing** — 4 плана (Base ₪199 / Pro ₪249 featured / Enterprise ₪499 / Индивидуальная) в horizontal scroll-snap
10. **Reviews** — 2 карточки: Анета (Beautymania), Ксения (Hair Rehab)
11. **CTA + Contacts** — финальный призыв + форма (имя/email/тел/сообщение) + контакты (WhatsApp/Email/Израиль)
12. **Footer** — copyright + ссылки

### Правила hover sidebar (важно!)

Чтобы иконки НЕ смещались при expand sidebar:

- `.sidebar-logo`, `.sidebar-nav a`, `.sidebar-bottom` имеют фиксированную `width: var(--sidebar-expanded)` (240px)
- Ширина видимой части sidebar меняется через `width` на `.sidebar` (80 → 240px) + `overflow: hidden`
- Layout внутренних элементов считается от 240px всегда → при expand ничего не пересчитывается, просто «открывается окно»

### Шрифты

- **Единственный шрифт:** Inter (weights 300, 400, 500, 600, 700) с Google Fonts
- Подключается в `src/app/layout.tsx` только при `trinity_page=landing`
- `html`, `body`, `.sidebar` явно прописывают `font-family: 'Inter', sans-serif` чтобы не сработал fallback на Trinity-шрифты

### Адаптивность

- `>1024px` — sidebar 80px, expand до 240px при hover
- `768–1024px` — sidebar 60px, без hover, текст скрыт через `display: none`, bento становится 2-column
- `<768px` — sidebar скрыт, показывается mobile bottom tabs, scroll-snap отключён, все grid становятся 1-column, steps-container — вертикальный с линией слева

### CSS-переменные

```css
--bg: #080810           /* тёмный фон */
--surface: #111118      /* карточки */
--white: #fff
--muted: rgba(255,255,255,.4)
--gold: #C8881A         /* акцент Amber */
--gold-glow: rgba(200,136,26,.25)
--sidebar-w: 80px
--sidebar-expanded: 240px
--red-accent: #e74c3c
--green-accent: #2ecc71
```

### История изменений (18.04.2026)

- **c632de0** — полная перезапись `page.tsx` с нуля 1-в-1 по эталонной HTML-болванке (`trinity-variant-a.html`, 1714 строк). Заменены все тексты, добавлены mini-chat/mini-chart mockups, форма контактов, fixed sidebar со scroll-snap секциями
- **d9a9fe5** — фикс смещения иконок sidebar при hover: `.sidebar-logo`, `.sidebar-nav a`, `.sidebar-bottom` получили `width: var(--sidebar-expanded)`. Принудительный `font-family: 'Inter'` на `body` и `.sidebar`
- **39d921e** — force-dynamic в `layout.tsx` для обхода edge-cache (prerender жил 15 дней игнорируя деплои)
- **a7ea49f** — middleware пробрасывает pathname через request header `x-pathname` (попытка SSR-изоляции, не сработала: Next.js не читает эти headers в root layout)
- **51d75d6** — **рабочая изоляция**: CSS-reset с `!important` (`html[dir="rtl"] { direction: ltr !important }`) + JS override в useEffect (удаление Trinity-классов `__variable_*`, `font-sans`, `light`). SSR всё равно отдаёт `<html dir="rtl" lang="he">`, но визуальный слой перезаписывается на клиенте. Производительность: FOUC не заметен за счёт `!important` в стилях
- **46c1459** — фикс цвета заголовков (Trinity light-theme перебивала через inheritance) + pricing-бейджи теперь внутри карточек (не обрезаются scroll-контейнером)

---

## 11. UI-компоненты

### GoldTabBar — мобильная навигация

`src/components/layout/GoldTabBar.tsx`

Liquid gold bottom tab bar для мобильных устройств (&lt;1024px). Рендерится через `DashboardShell` поверх всего контента.

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

Для мобильных устройств (&lt;768px) — bottom sheet вместо центрированного модала.

### Размеры модалок

sizemax-widthsmclamp(320px, 90vw, 384px)mdclamp(320px, 90vw, 448px)lgclamp(320px, 85vw, 512px)xlclamp(320px, 85vw, 576px)fullclamp(320px, 80vw, 896px)

### Адаптивность (правило)

**Все страницы Trinity обязаны поддерживать:**

- Mobile: &lt; 768px
- Tablet: 768–1024px
- Desktop: &gt; 1024px

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
- **URL**: [beautymania.co.il](http://beautymania.co.il)

### API маршруты (в Trinity)

МаршрутНазначение`GET /api/beautymania/products`Каталог товаров для сайта`GET /api/beautymania/related`Связанные товары`POST /api/beautymania/order`Создание заказа → Trinity CRM`POST /api/beautymania/contact`Форма обратной связи

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
- **Домен**: [kira.ambersol.co.il](http://kira.ambersol.co.il) (планируется)

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

- \[ \] `getAuthContext()` вызван первым
- \[ \] Пользователь аутентифицирован (401 если нет)
- \[ \] `activeOrgId` из БД, не из заголовков
- \[ \] Все запросы фильтруются по `org_id`
- \[ \] Service role только после проверки auth
- \[ \] Нет sensitive данных в логах

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

### 20.04.2026 — fix(visits): кнопки «Услуга/Товар/Произвольно» в создании визита не реагировали на клик

**Что:** При создании визита (web + PWA) нажатие на «+ Добавить позицию» открывало шит `ItemPickerSheet`, но кнопки «Услуга», «Товар», «Произвольно» выглядели мёртвыми — клик не открывал следующий шаг. Баг регрессии: сломано мульти-корзинное добавление услуг/товаров в визит.

**Корень проблемы:**

- В `src/components/shared/ItemPickerSheet.tsx` дефолт параметра объявлен как inline-литерал:

  ```tsx
  allowedTypes = ['service', 'product', 'custom']
  ```

  Этот массив пересоздаётся на каждом рендере родителя (`UnifiedVisitDialog`) — новая ссылка.

- Эффект синхронизации шага держал `allowedTypes` в зависимостях:

  ```tsx
  useEffect(() => {
    if (isOpen) {
      if (allowedTypes.length === 1) setStep(allowedTypes[0])
      else setStep('choose')
      ...
    }
  }, [isOpen, allowedTypes])
  ```

- Итог: пользователь нажимал «Услуга» → `setStep('service')` → любой следующий ререндер `UnifiedVisitDialog` (а их каскад при изменении state корзины/поиска/клиента) → новая ссылка `allowedTypes` → эффект срабатывал → `setStep('choose')` откатывал step обратно. Визуально — кнопка «не реагирует».

**Почему не проявлялся в** `UnifiedSalesDialog`**:** там `ItemPickerSheet` — локальная одноимённая функция внутри файла, не импорт из `shared/`. Баг был только в визитах.

**Фикс:**

1. Вынесен стабильный дефолт в модульную константу `DEFAULT_ALLOWED_TYPES`:

   ```tsx
   const DEFAULT_ALLOWED_TYPES: Array<'service' | 'product' | 'custom'> = [
     'service', 'product', 'custom',
   ]
   ```

2. Эффект теперь зависит от стабильного primitive-ключа `allowedKey = allowedTypes.join(',')` — двойная защита от будущих вызовов с inline-литералами:

   ```tsx
   const allowedKey = allowedTypes.join(',')
   useEffect(() => { ... }, [isOpen, allowedKey])
   ```

**Затронутые файлы:**

- `src/components/shared/ItemPickerSheet.tsx` (props-default + useEffect deps)

**Регрессия:** проверено все использование — `ItemPickerSheet` из `shared/` импортируется только в `UnifiedVisitDialog.tsx`. Single-type кейсы (`allowedTypes.length === 1`) продолжают работать.

**Безопасность:** правка чисто клиентская, не затрагивает API/RLS.

**Коммит:** см. следующий push в main.

---

### 20.04.2026 — fix(sales): sale со ссылкой на оплату показывалась как «Наличные» + refactor: PaymentLinkActions в shared

**Что:** В `SaleDetailModal` (детали сделки на /sales) для sale со «Ссылка на оплату» (`payment_method=null`, `status=unpaid`, связанный `payment.payment_link` не пуст) в поле «Оплата» показывалось **«Наличные»** — это финансовая ложь и риск путаницы в учёте. А также не было кнопок для копирования/открытия/отправки ссылки клиенту.

**Корень проблемы:**

- Архитектура Trinity (по дизайну): sale создаётся чистой (`payment_method=null`, `status=unpaid`, `paid_amount=0`). `payment_method` заполняется только когда реально прошла оплата — это правильно для учёта.

- Но UI в `SaleDetailModal.tsx:114` ложно дефолтил на «Наличные»:

  ```ts
  const methodLabel = t[sale.payment_method as keyof typeof t] || sale.payment_method || t.cash
  ```

  Для `payment_method=null`: `t[null] → undefined || null || t.cash` → **«Наличные»**.

- Данные о pending-ссылке уже были доступны — API `/api/sales` джойнил `payments!payments_sale_id_fkey(payment_link)`, но UI их игнорировал.

**Фикс:**

1. **Новый shared-компонент** `src/components/payments/PaymentLinkActions.tsx` (149 строк). Экспортирует:

   - `<PaymentLinkActions />` — три кнопки (copy/open/send WA) для тёмного sidebar
   - `buildPaymentLinkMobileActions(...)` — массив actions для `TrinityMobDetailShell`
   - Clipboard API с fallback на `execCommand`, [wa.me](http://wa.me) deep-link с нормализацией телефона в `972xxx`, встроенная локаль HE+RU
   - Иконки: `Copy`, `ExternalLink`, `MessageCircle`

2. **Рефакторинг** `PaymentDetailsDrawer.tsx`**:** удалил 46 строк inline-логики + 10 строк локалей — заменил на вызовы shared-компонента. Поведение 1:1 с предыдущим коммитом `294b25c`.

3. `SaleDetailModal.tsx` **— главный фикс:**

   - Добавлена детекция: `pendingLink = sale.payments?.find(p => p.payment_link && p.status === 'pending')?.payment_link`
   - `isAwaitingLink = (status === 'unpaid' || status === 'new') && !!pendingLink`
   - Переписана логика `methodLabel` / `methodIcon` — больше **нет лжи про «Наличные»**:
     - `isAwaitingLink` → «Ожидает оплаты по ссылке» / `ממתין לתשלום בקישור` + иконка `ExternalLink`
     - Известный `payment_method` (`cash/card/bit/transfer/credit_card`) → локаль + emoji
     - Неизвестный `payment_method` → показываем как есть (не дефолтим)
     - `null` без ссылки → «Не указан» / `לא צוין` (не «Наличные»)
   - Встроен `<PaymentLinkActions />` в desktop sidebar (когда `isAwaitingLink`)
   - Встроен `buildPaymentLinkMobileActions(...)` в mobile actions (в начало массива)

4. `api/sales/route.ts`**:** джойн расширен — `payments!payments_sale_id_fkey(payment_link, status)`. Нужен `status` чтобы отличать pending-ссылку от completed-платежа (completed-оплата через Tranzila тоже хранит link, но его показывать уже не нужно).

5. `hooks/useSales.ts`**:** тип `Sale` пополнен полем `payments?: Array<{ payment_link?: string | null; status?: string | null }>` — соответствует расширенному джойну.

**Почему выбран рефакторинг в shared, а не inline-копия:** Inline-копия логики из `PaymentDetailsDrawer` в `SaleDetailModal` означала бы \~50 строк дубликата (3 хендлера × 2 файла). При следующем изменении (новый метод, изменение текста, другая обработка ошибок) пришлось бы править оба места — типичный источник расхождений. Shared-компонент + `buildPaymentLinkMobileActions` даёт единую точку правды для 2+ мест использования.

**Файлы:**

- `src/components/payments/PaymentLinkActions.tsx` — новый (149 строк)
- `src/components/payments/PaymentDetailsDrawer.tsx` — рефакторинг (−56 строк)
- `src/components/sales/SaleDetailModal.tsx` — фикс + интеграция shared
- `src/app/api/sales/route.ts` — джойн расширен (+ `status`)
- `src/hooks/useSales.ts` — тип `Sale.payments` расширен

**Build:** `npm run build` — `✓ Compiled successfully in 27.7s`, 237/237 страниц, 0 TS-ошибок (после исправления generic-типизации `buildHandlers` — сигнатура теперь `LinkMessages` interface вместо `typeof LOCALES['ru']` literal).

**Регрессия:**

- `PaymentDetailsDrawer` — визуально идентичен коммиту `294b25c`. Функциональность `PaymentLinkActions` протестирована через код-пафс и TS.
- `SaleDetailModal` — старое поведение (эмодзи `💵💳📱🏦` + локаль из `t`) сохраняется для sale с **известным** `payment_method`. Расширение: теперь также корректно показываются неизвестные методы (вместо молчаливого fallback на «Наличные») и `null`-методы (вместо лживого «Наличные»).
- JOIN `payments.status` — существующие клиенты не затронуты: API возвращает больше данных, старый код их просто игнорирует.

**Безопасность:** защищено. `PaymentLinkActions` — чистый клиентский компонент без API-вызовов (только `navigator.clipboard` и `window.open`). API `/api/sales` — RLS по `org_id`, джойн `payments` имеет FK-constraint `payments_sale_id_fkey`, SELECT-политики на `payments` проверяют `get_user_org_ids()`.

**Что:** В `PaymentDetailsDrawer` (детали платежа на страницах /payments, /visits, /debts) для платежа в статусе `pending` с уже созданной Tranzila-ссылкой (`payment_link`) отсутствовали действия: скопировать, открыть, отправить клиенту в WhatsApp. Одновременно кнопка «Отправить квитанцию WA» показывалась для pending — квитанция это документ о **совершённом** платеже, для pending её отправлять нельзя.

**Корень проблемы:**

- В drawer'е не было логики под `payment_link` — только под `transaction_id` (tranzila PDF для completed)
- Условие показа «Квитанция WA»: `clientPhone && ...` — без фильтра по статусу. Для pending клиенту отправлялась квитанция, которой ещё не существует (API `send-receipt` создаёт документ в Tranzila Invoice — для pending это бессмысленно и потенциально ломает учёт)
- Готовая логика копирования/открытия/отправки в WA уже существовала в `PaymentLinkResultModal.tsx` (показывается сразу после создания ссылки), но в drawer не переиспользовалась

**Фикс:** `src/components/payments/PaymentDetailsDrawer.tsx`

- Добавлены 3 новых хендлера: `handleCopyLink` (Clipboard API + fallback на `execCommand`), `handleOpenLink` (`window.open`), `handleSendLinkWhatsApp` (`wa.me/972...` deep-link с текстом на языке UI, логика 1:1 из `PaymentLinkResultModal`)
- Введены `isPendingWithLink = status === 'pending' && !!payment_link` и `isCompletedStatus = status === 'completed' || status === 'paid'`
- 3 новые кнопки в sidebar (desktop) и 3 новых action в `mobActions` (mobile) — показываются только для `isPendingWithLink`
- Кнопка «Квитанция WA» теперь требует `isCompletedStatus` — для pending скрыта
- Кнопки «PDF» и «Refund» мигрированы с `payment.status === 'completed'` на `isCompletedStatus` (теперь работают и для `paid`, и для `completed` — раньше `paid` игнорировался)
- Локали пополнены: `copyLink / openLink / sendLinkWa / linkCopied / noLink` (HE + RU)

**Почему не вынес в общий компонент** `PaymentLinkActions`**:** у `PaymentLinkResultModal` и `PaymentDetailsDrawer` разные визуальные контейнеры (модалка с Tailwind vs sidebar с inline-стилями), кнопки должны выглядеть нативно в каждом. Вынос — отдельный рефакторинг на будущее. Сейчас приоритет — закрыть баг без лишнего скоупа.

**Файлы:**

- `src/components/payments/PaymentDetailsDrawer.tsx` — +1 import (Copy, ExternalLink), +10 строк локалей, +46 строк хендлеров, +3 мобильных action, +3 desktop-кнопки, гард `isCompletedStatus` на старые кнопки

**Build:** `npm run build` — `✓ Compiled successfully in 25.4s`, 237/237 страниц, 0 TS-ошибок.

**Регрессия:** нулевая для completed-платежей — `isCompletedStatus` охватывает старое `status === 'completed'` и доп. `status === 'paid'` (это расширение, не сужение). API `/api/payments/[id]` и `/api/payments/[id]/send-receipt` не менялись.

**Безопасность:** защищено — `payment_link` читается из уже существующего `richPayment` (SELECT \* через `/api/payments/[id]` с `getAuthContext` + `eq('org_id', orgId)`). RLS/auth слой не менялся.

**Что:** Кнопка "Добавить услугу" (`Настройки → Бизнес → Услуги → הוסף שירות`) падала с toast-ом "משהו השתבש" ещё до отправки запроса. POST на `/api/services` вообще не уходил — в Vercel runtime logs за 2ч только GET-запросы, ни одного POST.

**Корень проблемы:**

- `useServices()` хранит кэш как плоский массив `Service[]`
- `useCreateService/useUpdateService/useDeleteService` использовали общий `useOptimisticMutation`, который рассчитан **только** на `PagedCache<T> = { data: T[], count: number }`
- В `onMutate` хук делал `[...old.data, optimisticRecord]` и `old.count + 1` над плоским массивом → `undefined.data` → crash → `onError` → toast "somethingWentWrong"
- В jsdoc `useServices.ts` было написано "хук обрабатывает оба шейпа" — это было неверно, `useOptimisticMutation` обрабатывает только paged

**Фикс:** `src/hooks/useServices.ts` переписан — три хука (`useCreateService/useUpdateService/useDeleteService`) теперь используют `useMutation` напрямую с локальной optimistic-логикой для плоского `Service[]`:

- `onMutate`: snapshot через `getQueryData<Service[]>`, optimistic-insert/update/delete через `setQueryData`
- `onSuccess` (insert): swap temp UUID → server UUID в кэше, debounced invalidate через 2 сек (Realtime-first как в базовом хуке)
- `onError`: rollback из snapshot

**Почему не правил базовый** `useOptimisticMutation`**:** его используют `clients / visits / payments / products / sales` — все с `PagedCache`. Расширение базового хука на оба шейпа потребовало бы регрессии 5 модулей. Локальный фикс в `useServices.ts` — нулевая регрессия, точечное решение ровно под плоский кэш.

**Файлы:**

- `src/hooks/useServices.ts` — полностью переписан (185 строк, 3 хука локально)

**Build:** `npm run build` — `✓ Compiled successfully in 28.0s`, 237/237 страниц, 0 TS-ошибок.

**Регрессия:** нет. `useOptimisticMutation.ts` не тронут, grep по всему `src/` подтвердил что только `useServices.ts` его импортировал.

**Безопасность:** защищено — API `/api/services` POST не менялся, RLS `services_insert` с `get_user_org_ids()` не менялся.

**Что:** При создании нового визита теперь можно добавить несколько позиций: услуги, товары и произвольные (custom) строки — по аналогии с модулем "Продажи". Edit-mode и meeting-mode (встречи) остались как были — одна услуга, без корзины.

**Зачем:** Комплексные визиты одним окном без постфактум-добавления позиций (стрижка + окраска + шампунь товаром). Владу это нужно для Ксении и Анеты, где мастер за один визит продаёт и услугу, и сопутствующий товар.

**Архитектура:**

- Новый общий компонент `src/components/shared/ItemPickerSheet.tsx` (\~330 строк) — bottom-sheet с тремя режимами: `service` / `product` / `custom`. Переиспользуется из `UnifiedSalesDialog` и `UnifiedVisitDialog`. Типизация onAdd через `PickedItem` (открытый контракт), каждый диалог маппит её в свою локальную форму.
- В `UnifiedVisitDialog.tsx` добавлена локальная корзина: `items: VisitLineItem[]`, хэндлеры `addItem / removeItem / updateItemQty / updateItemPrice`.
- Флаг `hasMultiMode = !isEditMode && !isAppt` — корзина работает только для новых визитов-услуг.
- Авто-расчёт:
  - `cartSubtotal` = Σ (qty × unit_price)
  - `cartDuration` = Σ длительностей услуг (товары = 0 мин)
  - `cartTotal` = priceOverride ?? cartSubtotal (пользователь может переопределить итог)
- Submit в мульти-режиме:
  - Первая позиция кладётся в `POST /api/visits` как `service` / `serviceId` → совместимость с мобилкой и старой схемой `visits.service_id` сохранена.
  - Доп. позиции отправляются через `Promise.allSettled` по `POST /api/visits/[id]/services` и `/products` (существующие endpoint-ы).
- UI: старый блок "Длит + Цена" скрыт в мульти-режиме; вместо него рендерится список позиций с qty ±, полем цены, кнопкой удаления и overridable полем "Итого". Сводка показывает `N позиций — ₪X`.

**Файлы:**

- `src/components/shared/ItemPickerSheet.tsx` — новый
- `src/components/visits/UnifiedVisitDialog.tsx` — корзина, авто-расчёт, override, мульти-ветка submit
- `public/sw.js` — регенерирован next-pwa при билде

**Совместимость:**

- Edit-mode не затронут — старый `ServicePicker` остаётся, одна услуга как раньше
- Meeting-mode (встречи) не затронут
- Мобилка не ломается — первая позиция кладётся в legacy-поле `service_id`/`price`/`duration`, остальные довешиваются через `visit_services`
- Старые визиты — без изменений

**Build:** `npm run build` чистый, 0 TS-ошибок, 237/237 страниц, exit code 0 (146s).

**Регрессия:** нет. Edit-mode, meeting-mode, мобильное создание визита, POST /api/visits Zod-валидация — всё не затронуто.

**Безопасность:** защищено — все запросы идут через существующие endpoint-ы с `getAuthContext()` + RLS по `org_id`.

**Коммит:** fe73383

---

### 20.04.2026 — refactor: переименование ביקורים → יומן/תורים в Hebrew UI (для Ксении)

**Контекст:** Ксения (Hair Rehab) запросила замену терминологии: раздел/меню "ביקורים" → "יומן" (журнал), счётчики визитов → "תורים" (записи).

**Логика разделения терминов:**

- **יומן** — название раздела, пункт меню, заголовок страницы /visits, PWA shortcut, группы уведомлений, описания модулей в биллинге
- **תורים** — все счётчики, empty states, метки виджетов, статистика, column labels
- **ביקור / ביקורים** — функциональные фразы (`הוסף ביקור`, `ביקור אחרון`, `סיים ביקור`, `ממוצע לביקור`, tab filter visit/meeting) **оставлены без изменений**
- **terms/page.tsx** — юридический документ, термин "ביקורים" не трогали

**Затронутые файлы (33 файла, \~80 точечных замен):**

- `src/contexts/LanguageContext.tsx` — visits.title, clients.history, visitsMonth, widgets.visits_month, stats.visitsByMonth и др.
- `src/lib/landing-pages.ts` — sidebar menu label_he: `יומן`
- `public/manifest.json` — PWA shortcut: `יומן`
- `src/app/(dashboard)/settings/display/page.tsx`, `settings/notifications/page.tsx`, `analytics/page.tsx`
- `src/lib/modules-config.ts`, `trinityPlans.ts`, `src/hooks/usePricingPlans.ts`, `useMeetingMode.ts`
- `src/app/admin/modules/page.tsx`, `admin/organizations/page.tsx`
- `src/components/admin/OrganizationStatsCard.tsx`
- `src/components/clients/GdprDeleteDialog.tsx`, `ClientDesktopPanel.tsx`, `ClientBottomSheet.tsx`, `ClientCard.tsx`
- `src/components/visits/CalendarView.tsx` (5 мест — счётчики дня, empty states)
- `src/components/modals/clients/ClientHistoryModal.tsx`, `ClientDetailsModal.tsx`
- `src/components/landing/DemoRegisterModal.tsx` → `יומן פגישות` (коллизия с `diary: יומן`)
- `src/components/AiChatWidget.tsx` — модуль core + FAQ
- `src/components/demo/DemoBannerGlobal.tsx`, `DemoSectionBanner.tsx`, `DemoLimitModal.tsx`, `DemoOrderModal.tsx`
- `src/components/diary/CreateTaskSheet.tsx` — visit picker empty state
- `src/components/dashboard/DashboardContent.tsx`, `StatsCardsClient.tsx`, `TodayVisitsWidget.tsx`
- `src/components/ui/TrinityMob.tsx`, `src/components/debts/DebtsContent.tsx`
- `src/app/demo/register/page.tsx` → `יומן פגישות` (коллизия с `diary: יומן`)
- `src/app/demo/callback/google/page.tsx`, `src/app/onboarding/trial/page.tsx`
- `src/app/api/mobile/preferences/route.ts` — mobile navbar label **Build:** `npm run build` чистый, 0 ошибок. **Регрессия:** нет — все функциональные фразы (кнопки действий, filter by event type) намеренно сохранены. Tab filter в `/visits` (`all/visit/meeting`) оставлен без изменений как категория события.

---

### 13.04.2026 — fix: WhatsApp visit_created из мобильного приложения (commit 7b0c1ec)

**Проблема:** При создании визита через Trinity Mobile автоматическое WA-сообщение (`visit_created` триггер) не отправлялось. Создание визита через веб-версию работало корректно.

**Причина:** Мобильный endpoint `POST /api/mobile/visits` не вызывал `fireWaTrigger()` — функция была добавлена только в веб-endpoint `POST /api/visits`, а мобильный endpoint забыли обновить.

**Исправление:** `src/app/api/mobile/visits/route.ts`:
- Добавлен импорт `fireWaTrigger` из `@/lib/wa/fire-trigger`
- После успешной вставки визита добавлен fire-and-forget блок:
  - Загружает телефон и имя клиента из БД
  - Загружает название организации
  - Вызывает `fireWaTrigger` с `triggerType: 'visit_created'` и переменными (client_name, org_name, date, time, service)
- Для встреч без клиента (`client_id = null`) — блок пропускается
- Ошибки WA не блокируют создание визита (всё в try/catch)

**Затронутые файлы:**
- `src/app/api/mobile/visits/route.ts` (+43 строки)

---



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

*Документация обновлена: 13.04.2026*
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

---

### 2025-04-13 — fix(debts): кнопка «Изменить» per-item, открывает визит или сделку

**Проблема:** кнопка «Изменить» была одна на всю карточку клиента и открывала `client-details` — неверный UX.

**Решение:**
- Кнопка «Изм.» добавлена к каждой строке item (визит / продажа) — и на мобиле, и в `DetailPanel` (desktop)
- `handleEdit(item: DebtItem)` — определяет тип:
  - `type === 'visit'` → `GET /api/visits/:id` → `openModal('visit-unified', { mode: 'edit', visit })` — полная форма (услуги, товары, время, сумма)
  - `type === 'sale'` → `GET /api/sales/:id` → `setEditSale(sale)` → `SaleDetailModal` рендерится локально
- Спиннер-оверлей во время загрузки, кнопки `disabled`
- После закрытия `SaleDetailModal` — `invalidateQueries(['debts'])` обновляет список
- Общая кнопка «Изменить» с карточки клиента убрана, footer стал 2-колоночным (WA + Оплата)
- Добавлен импорт `SaleDetailModal`, `Loader2`; `return` обёрнут в `<>` (Fragment)

**Файл:** `src/app/(dashboard)/debts/page.tsx`

**Коммит:** 0c438f9

---

### 2025-04-13 — feat(payments): квитанции Tranzila — GET /api/payments/[id]/receipt

**Задача:** Ксения и клиенты должны видеть квитанции прямо из Trinity, без входа в My Tranzila.

**Реализация:**
- `GET /api/payments/[id]/receipt` переписан для работы с Tranzila Billing API
- Логика: если `tranzila_document_id` уже есть в БД → редирект 302 на Tranzila PDF viewer (`billing5.tranzila.com/api/documents_db/display_document?key=...`)
- Если нет → создаём квитанцию через `createReceipt()` из `lib/tranzila-invoices.ts`, сохраняем `retrieval_key` в `payments.tranzila_document_id`, редирект на PDF
- Тип документа: IR (חשבונית מס קבלה) — утверждён налоговой
- Email клиента передаётся в Tranzila → Tranzila автоматически шлёт подписанный PDF на email клиента
- Auth: `getAuthContext(request)` обязателен; суперадмин видит любой платёж, обычный юзер — только своей org
- Только `completed`-платежи; остальные возвращают 400

**Существующая инфраструктура (не трогалась):**
- `lib/tranzila-invoices.ts` — полная библиотека с HMAC-auth, уже была
- `payments.tranzila_document_id` — колонка в БД, уже была
- `/api/payments/[id]/tranzila-pdf` — качает PDF напрямую буфером, остался как есть

**Файл:** `src/app/api/payments/[id]/receipt/route.ts`

**Коммит:** ba09a39


---

### 2026-04-13 — feat: Personal WhatsApp Bot

**Задача:** Автоответчик на личный номер WhatsApp с AI-классификацией, режимом тишины и командами управления.

**Реализация:**

**Новый endpoint:** `POST /api/personal-bot/webhook?secret=PERSONAL_BOT_WEBHOOK_SECRET`

**Слои защиты:**
- URL secret авторизация (`PERSONAL_BOT_WEBHOOK_SECRET`)
- Loop prevention: `from_me === true` → не отвечаем, только обновляем тишину
- Rate limiting: не более 5 ответов за 5 минут на один chat_id (через `personal_bot_logs`)
- Глобальная пауза (`/pause`)
- Тишина на конкретный чат (автоматически при ответе владельца)
- Ночной режим: 23:00–08:00 Israel time (UTC+3)

**AI-классификация (gpt-4o-mini через @ai-sdk/openai):**
- Определяет язык: `ru | he | en`
- Определяет intent: `business | personal`
- Личные сообщения — игнорируются (не отвечаем)
- Рабочие — генерируем ответ на языке отправителя

**Эмуляция человека:**
- Typing indicator через Whapi API
- Задержка ответа: 4–15 секунд (рандом)

**Команды владельца (пишешь в чат сам себе или в любой чат):**
- `/pause [мин]` — глобальная пауза (с таймером или до /resume)
- `/resume` — включить бота
- `/status` — текущее состояние
- `/silence [мин]` — тишина в конкретном чате
- `/help` — список команд

**Автоматическая тишина:**
- Когда владелец сам отвечает в чат → бот молчит 30 минут (настраивается)
- После истечения — бот снова активен

**Новые таблицы Supabase:**
- `personal_bot_sessions` — тишина по chat_id (`silent_until`, `last_owner_reply_at`)
- `personal_bot_config` — singleton конфиг (`is_paused`, `paused_until`, `night_mode_start`, `night_mode_end`, `silence_after_owner_reply_minutes`)
- `personal_bot_logs` — лог всех событий (direction, reason, language, intent, preview)

**Новые env-переменные (добавить в Vercel):**
```
PERSONAL_BOT_WHAPI_TOKEN=     # токен отдельного Whapi-канала для личного номера
PERSONAL_BOT_WEBHOOK_SECRET=  # секрет для авторизации вебхука
PERSONAL_BOT_OWNER_PHONE=     # твой номер в формате 972524024447 (дефолт задан в коде)
```

**Настройка Whapi:**
1. Создать канал для личного номера
2. Webhook URL: `https://www.ambersol.co.il/api/personal-bot/webhook?secret=<SECRET>`
3. Events: messages

**Файл:** `src/app/api/personal-bot/webhook/route.ts`

**Коммит:** 3385e03


---

### 2026-04-13 — refactor: личный бот смержен в /api/webhooks/whapi

**Задача:** Убрать дублирование — личный бот и клиентский вебхук объединены в один файл.

**Изменение:** `/api/personal-bot/webhook` удалён. Вся логика личного бота перенесена в `src/app/api/webhooks/whapi/route.ts`.

**Роутинг внутри вебхука:**
- `?org_id=...` → клиент Trinity (wa_conversations, wa_messages)
- без `org_id` → личный номер Влада (AI-классификация, тишина, команды)

**Удалён:** `src/app/api/personal-bot/webhook/route.ts`

**Коммит:** fedc5e2

---

### 2026-04-13 — feat: база знаний личного бота

**Новая таблица:** `personal_bot_knowledge`
- Поля: `category` (pricing/product/faq/contacts/custom), `title`, `content`, `is_active`, `sort_order`
- Начальные данные: Trinity CRM — описание, тарифы, возможности, контакты, FAQ (7 записей)

**Изменение в вебхуке:** `generateBotResponse` теперь загружает активные записи из `personal_bot_knowledge` и вставляет их в системный промпт GPT. Бот отвечает на основе реальной базы знаний, а не галлюцинирует.

**Как редактировать базу знаний:** напрямую в Supabase Dashboard → таблица `personal_bot_knowledge`. Панель управления в Trinity — следующий шаг.

**Файл:** `src/app/api/webhooks/whapi/route.ts`

**Коммит:** 0ebb4db

---

### 2026-04-13 — fix: имя клиента в Продажах + сумма сделки в Платежах

**Баг 1 — "Клиент" вместо имени в Продажах**

Подтверждено данными БД: 5 сделок из 24 за 7 дней создались с `client_id = NULL`.
Причина: race condition в `useEffect` в `UnifiedSalesDialog.tsx`.
При вызове `onClose() → openModal('sale-unified', { clientId, clientName })` из карточки клиента:
`open` уже был `true` от предыдущего состояния → `useEffect([open])` не перезапускался →
`clientId` читался из устаревшего `initialData` (undefined) → сделка создавалась без клиента.

**Фикс:** добавлен `initialData` в зависимости `useEffect`:
```ts
}, [open, initialData])  // было: [open]
```

**Файл:** `src/components/sales/UnifiedSalesDialog.tsx`

---

**Баг 2 — суммы в Платежах не совпадают с Продажами**

Не баг архитектуры — это два разных числа по задумке:
- `sales.total_amount` — полная стоимость сделки
- `payment.amount` — реально оплаченная сумма (может быть частичной)

**Фикс UX:** бейдж "Сделка" в `PaymentCard` теперь показывает сумму сделки: "Сделка ₪500".
API `/api/payments` теперь джойнит `sales (id, total_amount, status, sale_date)`.

**Файлы:**
- `src/components/payments/PaymentCard.tsx` — бейдж с суммой сделки
- `src/app/api/payments/route.ts` — добавлен JOIN с sales

**Коммит:** d32492f

---

## 2026-04-13 — Ядро глобальной реактивности (Optimistic UI + Supabase Realtime)

### Новые файлы

**`src/hooks/useOptimisticMutation.ts`**
Универсальный дженерик-хук для всех мутаций Trinity (INSERT / UPDATE / DELETE).
Реализует все 5 правил архитектуры реактивности:
- Rule 1: нет Realtime-подписок — только хирургия кэша
- Rule 2: `getQueriesData` → снэпшот всех matching ключей (все страницы, все фильтры) → `setQueriesData` откатывает при ошибке
- Rule 3: `setTimeout(invalidateQueries, 2000)` — Realtime получает приоритет, full refetch только страховка
- Rule 5: в `onSuccess` для INSERT — находит `optimistic-*` в кэше и заменяет реальным UUID сервера без мигания позиции

API:
```ts
useOptimisticMutation<TData extends { id: string }, TInput>({
  queryKey,       // TanStack Query key prefix
  type,           // 'insert' | 'update' | 'delete'
  mutationFn,     // (input: TInput) => Promise<TData>
  toOptimistic?,  // (input) => Partial<TData> — для insert/update
  messages?,      // { success?, error? }
  invalidateDelayMs?, // default 2000
  onSuccess?, onError?,
})
```

**`src/components/providers/GlobalRealtimeProvider.tsx`**
Единый Realtime-провайдер, монтируется один раз в `ClientProviders`.
Заменил 10 вызовов `useRealtimeSync` (которые делали `invalidateQueries` = full refetch) на хирургические `setQueriesData`:
- `INSERT` → prepend row, Rule 5: swap optimistic placeholder
- `UPDATE` → patch row in-place
- `DELETE` → remove row, decrement count
- Поддерживает оба шейпа кэша Trinity: paged `{data, count}` и flat `[]`
- `TABLE_CONFIGS` — одна строка чтобы добавить новую таблицу
- Rule 4: `filter: org_id=eq.${orgId}` на каждом канале
- Каналы дедуплицируются через `channelsRef` + `supabase.getChannels()`

### Изменённые файлы
- `src/components/providers/ClientProviders.tsx` — заменён `GlobalRealtimeSync` на `GlobalRealtimeSyncBridge` + `GlobalRealtimeProvider`; `notifications` (filterColumn=user_id) и `organizations` (router redirect) остались через `useRealtimeSync`
- `src/hooks/useServices.ts` — мигрирован на новый API `useOptimisticMutation` (type/toOptimistic вместо applyOptimistic)
- `src/components/services/ServiceDetailSheet.tsx` — вызовы `mutateAsync` обновлены под новый контракт

### Что изменилось для пользователя
До: любое действие (добавить клиента, изменить статус визита, удалить услугу) → `invalidateQueries` → full refetch → мигание списка ~200-400мс.
После: мгновенное обновление UI, Realtime подтверждает через WebSocket ~50-200мс, rollback при ошибке незаметен.

**Коммит:** e378bbb



---

## Changelog — апрель 2026 (продолжение)

### 2026-04-14 — ⚡ Performance First: Instant Load & PWA Caching

**Задача:** Экстремальная оптимизация роутинга и инициализации — восприятие 0ms latency при навигации и старте PWA.

#### Аудит — найденные узкие места
1. **14 из 21 роутов** `(dashboard)` не имели `loading.tsx` → белый экран 300–800ms при каждом переходе
2. **PWA без Service Worker** → каждый старт приложения = полная загрузка с нуля
3. `staleTime` и `refetchOnWindowFocus` уже были настроены корректно в `QueryProvider`
4. `DashboardLayout` — 1 DB-запрос (JWT fast-path) — допустимо

#### Что сделано

**Шаг 1 — loading.tsx для 14 роутов** (App Router показывает скелетон мгновенно, sidebar/header уже в DOM):
- `visits/loading.tsx` — KPI strip + фильтры + строки визитов
- `payments/loading.tsx` — split layout (тёмная панель + список)
- `finances/loading.tsx` — KPI + чарт + категории + расходы
- `sales/loading.tsx` — pipeline колонки (desktop) + список (mobile)
- `inventory/loading.tsx` — продуктовая сетка + stats
- `analytics/loading.tsx` — KPI + charts
- `inbox/loading.tsx` — chat sidebar + area
- `reports/loading.tsx` — period tabs + summary + charts
- `debts/loading.tsx` — summary cards + table rows
- `broadcast/loading.tsx` — template cards + history
- `office/loading.tsx` — feature cards
- `profile/loading.tsx` — avatar + form sections
- `audit/loading.tsx` — filters + log rows
- `settings-new/loading.tsx` — нет page.tsx, пропущено

**Шаг 2 — Service Worker PWA** (`/public/sw.js`, Workbox):
- `CacheFirst` → `_next/static/*` (JS/CSS бандлы, хешированные, 1 год TTL)
- `StaleWhileRevalidate` → GET `/api/*` (мгновенный ответ из кэша прошлой сессии + фоновое обновление)
- `NetworkFirst` → HTML навигация (3с таймаут → fallback на кэш)
- Push-уведомления: обработчики `push` + `notificationclick`
- НЕ кэширует: POST/PATCH/DELETE, `/api/auth/*`, `/api/mobile/auth`

**Шаг 3 — PWARegister компонент** (`src/components/providers/PWARegister.tsx`):
- Регистрирует `/sw.js` только в `production` и только в браузере
- Проверяет обновления SW раз в 60 секунд
- Подключён в `src/app/layout.tsx`

**Шаг 4 — `.cursorrules`** (Performance First Policy):
- ЗАКОН #1: все новые роуты ОБЯЗАНЫ иметь `loading.tsx`
- ЗАКОН #2: запрещены blocking SSR fetches без Suspense
- ЗАКОН #3: деградация скорости = критический баг, блокирует коммит
- ЗАКОН #4: правила кэширования SW задокументированы

#### Затронутые файлы
- `src/app/(dashboard)/visits/loading.tsx` — создан
- `src/app/(dashboard)/payments/loading.tsx` — создан
- `src/app/(dashboard)/finances/loading.tsx` — создан
- `src/app/(dashboard)/sales/loading.tsx` — создан
- `src/app/(dashboard)/inventory/loading.tsx` — создан
- `src/app/(dashboard)/analytics/loading.tsx` — создан
- `src/app/(dashboard)/inbox/loading.tsx` — создан
- `src/app/(dashboard)/reports/loading.tsx` — создан
- `src/app/(dashboard)/debts/loading.tsx` — создан
- `src/app/(dashboard)/broadcast/loading.tsx` — создан
- `src/app/(dashboard)/office/loading.tsx` — создан
- `src/app/(dashboard)/profile/loading.tsx` — создан
- `src/app/(dashboard)/audit/loading.tsx` — создан
- `public/sw.js` — создан (Workbox, 3 стратегии)
- `src/components/providers/PWARegister.tsx` — создан
- `src/app/layout.tsx` — добавлен import PWARegister
- `.cursorrules` — создан (Performance First Policy)
- `docs/TRINITY_DOCS.md` — обновлён

#### Результат
- Навигация между страницами: **мгновенный скелетон** вместо белого экрана
- PWA холодный старт: **данные из кэша прошлой сессии** до ответа сервера
- Все будущие разработчики (и Claude) ограничены правилом: нет loading.tsx = нет merge

**Коммит:** (следующий)

---

### 2026-04-14 — ⚡ next-pwa: полноценный Service Worker с precache-манифестом

**Задача:** Внедрить `@ducanh2912/next-pwa` для генерации реального SW с precache-манифестом всех статических ассетов.

#### Что сделано

**Установка и конфигурация:**
- `@ducanh2912/next-pwa@10.2.9` — единственный форк с поддержкой Next.js 16 + App Router
- `next.config.js` обёрнут в `withPWA({ swSrc: 'src/sw.ts', dest: 'public', disable: dev, skipWaiting: true })`
- `package.json`: `build: next build --webpack` (next-pwa использует webpack-плагин), `dev: next dev --turbopack`
- Webpack alias `@/*` → `src/` добавлен явно для webpack-режима
- `public/sw.js` и `public/workbox-*.js` добавлены в `.gitignore` (генерируются при build)

**`src/sw.ts`** — кастомный SW-шаблон (`/// <reference lib="WebWorker" />`):
- `precacheAndRoute(self.__WB_MANIFEST)` — next-pwa инжектирует реальный список ~300 файлов
- `NetworkFirst` (3с таймаут) → HTML-навигация
- `CacheFirst` → шрифты Google, изображения
- `StaleWhileRevalidate` → GET `/api/*` (кроме `/api/auth`, `/api/mobile/auth`, `/api/webhooks`)
- Push-события: `push` + `notificationclick` хэндлеры

**Рефакторинг именованных экспортов из route/page файлов** (нарушали Next.js App Router rules, вскрылись при переходе на webpack):
- `DebtsContent` вынесен из `debts/page.tsx` → `src/components/debts/DebtsContent.tsx`
- `PushSettings`, `DEFAULT_PUSH_SETTINGS` → `src/lib/push-settings.ts`
- `NotifChannels`, `NotificationPreferences` → `src/lib/notification-preferences.ts`
- `usePushSettings.ts` обновлён для импорта из `lib/`
- `payments/page.tsx` обновлён для импорта из `components/debts/`
- `debts/page.tsx` — тонкий re-export `export { default } from '@/components/debts/DebtsContent'`

**Результат:**
- `public/sw.js` = 60KB, содержит precache с ~300 хешированными ассетами
- При первом открытии PWA → SW кэширует весь статик
- При повторном открытии → всё из кэша, страницы грузятся до сети
- API-данные прошлой сессии видны мгновенно (StaleWhileRevalidate)

#### Затронутые файлы
- `next.config.js` — withPWA обёртка, webpack alias
- `package.json` / `package-lock.json` — @ducanh2912/next-pwa, build/dev скрипты
- `.gitignore` — generated SW files excluded
- `src/sw.ts` — создан (кастомный SW с WebWorker reference)
- `src/components/debts/DebtsContent.tsx` — создан (вынесен из page)
- `src/lib/push-settings.ts` — создан
- `src/lib/notification-preferences.ts` — создан
- `src/app/(dashboard)/debts/page.tsx` — re-export thin wrapper
- `src/app/(dashboard)/payments/page.tsx` — импорт из components/debts
- `src/app/api/push/settings/route.ts` — импорт из lib
- `src/app/api/notifications/preferences/route.ts` — импорт из lib
- `src/hooks/usePushSettings.ts` — импорт из lib

**Коммит:** 6ed1e2f

---

### 2025-04-14 — Рефакторинг мобильного хедера (PWA): Back ↔ Burger swap + RTL/LTR

#### Задача
Поменять местами кнопку «Назад» и кнопку гамбургер-меню во всех мобильных хедерах.
Реализовать универсальную RTL/LTR совместимость через нативный Flexbox без хардкода направления.

#### Архитектурное решение
DOM-порядок: `[Back (Start)] [Logo (Center)] [Bell + Burger (End)]`

- При **LTR** (русский): Back — физически слева, Burger — справа.
- При **RTL** (иврит): Flexbox автоматически зеркалит: Back улетает вправо, Burger — влево.
- Кнопка «Назад» рендерится **условно** — только если `canGoBack === true`.
- При отсутствии кнопки «Назад» placeholder `<span class="w-10">` сохраняет симметрию `justify-between`.

#### Изменения в `useBackNavigation.ts`
- Добавлен `useMemo` импорт.
- Добавлено вычисляемое свойство `canGoBack` (boolean):
  - `true` если есть открытая модалка, или есть родительский маршрут в PARENT_ROUTES, или pathname не в ROOT_ROUTES, или есть история в sessionStorage.
- Хук теперь возвращает `{ handleBack, canGoBack }`.

#### Изменения в `MobileHeader.tsx`
- Деструктурирован `canGoBack` из `useBackNavigation()`.
- Структура flex-контейнера переработана: `[Back|Logo|Bell+Burger]`.
- Кнопка «Назад» обёрнута в `div.w-10` с условным рендером по `canGoBack`.
- Бургер перемещён в правый блок рядом с `NotificationBell`.
- aria-label кнопок локализован через `language === 'he'`.

#### Изменения в `MobileAdminHeader.tsx`
- Та же структура: `[Back|Logo|Burger]`.
- `canGoBack` из хука управляет видимостью Back-кнопки.

#### Затронутые файлы
- `src/hooks/useBackNavigation.ts`
- `src/components/layout/MobileHeader.tsx`
- `src/components/layout/MobileAdminHeader.tsx`

**Коммит:** 0639cb1

---

### 14.04.2026 — fix: payments GET — фильтр по датам не работал для платежей без paid_at (коммит 276b1a4)

**Проблема:**  
Раздел "Платежи" в Trinity Mobile показывал 0 записей по всем периодам (кроме "Всё"). Платежи созданные без явной даты оплаты (`paid_at = NULL`) выпадали из выборки — PostgreSQL не включает NULL в условие `gte('paid_at', ...)`.

**Причина:**  
`GET /api/payments` фильтровал только по `paid_at >= startDate`. Записи где `paid_at IS NULL` (большинство платежей создаются без явной даты оплаты) игнорировались.

**Исправление:**  
`src/app/api/payments/route.ts` — заменён простой `gte` на `or()` условие:
- `paid_at >= startDate` — платёж с явной датой оплаты
- ИЛИ `paid_at IS NULL AND created_at >= startDate` — платёж без даты оплаты, fallback на дату создания

**Затронутые файлы:**  
- `src/app/api/payments/route.ts`

**Коммит:** 276b1a4


---

## 2025-04-15 — /api/auth/register + Trinity Desktop валидация

**Что сделано:**

Создан endpoint `POST /api/auth/register` для регистрации новых пользователей через Trinity Desktop.

**Логика endpoint'а:**
- Rate limit: 5 запросов с одного IP за 10 минут
- Валидация имени: 2–60 символов
- Валидация email: строгий regex, только валидный формат
- Валидация пароля: только латиница + цифры + спецсимволы (кириллица/иврит запрещены), 8–128 символов
- Создаёт пользователя через `supabaseAnon.auth.signUp()`
- Отправляет email верификации (redirectTo: `/auth/confirm`)
- Создаёт организацию (`plan: 'trial'`) и привязывает пользователя как `owner`
- Устанавливает `user_active_branch`

**Фронт (trinity-desktop/login.html):**
- Добавлена фронтовая валидация с теми же правилами (до отправки на сервер)
- Новые строки ошибок на RU/EN/HE: `eNameShort`, `eEmail`, `ePassLatin`

**Попутно:**
- Фикс `src/app/landing/page.tsx` — был обрезан, не имел default export, блокировал билд

**Затронутые файлы:**
- `src/app/api/auth/register/route.ts` (новый)
- `src/app/landing/page.tsx` (фикс)
- `F:\Amber_solutions_Kira\trinity-desktop\src\login.html`

**Коммит:** 91a4798


---

## 2025-04-15 — Free план Trinity CRM

**Что сделано:**

### Новый файл: `src/lib/plan-limits.ts`
Единый источник правды для ограничений по планам. Содержит:
- `PLAN_MODULES` — какие модули доступны на каждом плане
- `PLAN_LIMITS` — лимиты сущностей (clients: 100 для free)
- `checkPlanLimit(orgId, entity)` — проверяет лимит
- `enforcePlanLimit(orgId, entity)` — возвращает 403 если превышен
- `enforceModuleAccess(orgId, moduleKey)` — возвращает 403 если модуль недоступен

### Free план — что включено:
- Модули: `clients`, `visits`, `tasks`, `analytics`
- Лимит клиентов: **100**
- Все остальные планы (trial, base, pro, enterprise) — без лимитов

### Изменённые файлы:
- `src/app/api/clients/route.ts` — добавлен `enforcePlanLimit` после demo limit
- `src/app/api/auth/register/route.ts` — новые org получают `plan: 'free'` + включают только Free модули
- `src/lib/trinityPlans.ts` — добавлен Free план в список (₪0/мес)

### Формат 403 ответа при превышении лимита:
```json
{ "code": "PLAN_LIMIT_EXCEEDED", "entity": "clients", "current": 100, "limit": 100, "plan": "free" }
```

**Коммит:** 2f2b447


---

## 2026-04-16 — Hotfix: Next.js 16 cookies read-only crash

**Проблема:** Пользователи не могли зайти в Trinity (веб и PWA) — экран ошибки «Что-то пошло не так». Runtime лог Vercel: `Error: Cookies can only be modified in a Server Action or Route Handler`.

**Причина:** Next.js 16 сделал `cookies().set()` в Server Component контексте исключением (read-only). Supabase SSR при вызове `getUser()` пытается обновить сессионный cookie через `setAll` → исключение → 500 на `/dashboard`.

**Фикс:** Обёрнуть `cookieStore.set()` в `try/catch` в обоих местах где создаётся Supabase клиент. Middleware продолжает писать cookies как обычно — сессия не теряется.

**Изменённые файлы:**
- `src/lib/supabase/server.ts` — `setAll` обёрнут в try/catch
- `src/lib/api-auth.ts` — `setAll` в `getSupabaseServerClient` обёрнут в try/catch

**Коммит:** b6ba4b6


---

### 18.04.2026 — Исправление продаж без клиента

**Что изменено:**

1. **Привязка потерявшихся продаж к клиентам (SQL)** — 7 продаж org Анеты (`1e77c781`) у которых `client_id = NULL` были вручную привязаны к правильным клиентам через прямой UPDATE в Supabase. Сопоставление производилось по сумме, дате и составу товаров.

2. **UX: обязательный выбор клиента** (`src/components/sales/UnifiedSalesDialog.tsx`)
   - Добавлен state `clientWarning: boolean`
   - При попытке перейти на шаг checkout без выбранного клиента — переход блокируется, поле поиска подсвечивается красной рамкой, под ним появляется текст ошибки (RU/HE)
   - Блокировка работает на кнопке "К оплате →" (мобильный footer), таб "💳 Оплата" (мобильный), кнопка "К оплате →" в desktop sidebar
   - При выборе клиента из дропдауна `clientWarning` сбрасывается автоматически
   - При открытии диалога `clientWarning` сбрасывается

**Коммит:** 8a22579


---

### 18.04.2026 — Исправление бесконечного редиректа между / и /landing

**Проблема:** Лендинг не открывался — браузер бесконечно прыгал между `https://www.ambersol.co.il/` и `https://www.ambersol.co.il/landing`.

**Причина:** Redirect loop:
- `src/app/page.tsx` — server-side `redirect('/landing')`
- `src/app/landing/page.tsx` — client-side `router.replace('/')` в `useEffect`

**Фикс:**
- `src/app/page.tsx` — изменён редирект с `/landing` на `/login`
- `src/app/landing/page.tsx` — заменён client-side компонент на server-side `redirect('/login')`

**Изменённые файлы:**
- `src/app/page.tsx`
- `src/app/landing/page.tsx`

**Коммит:** 1c5e789

---

### 18.04.2026 — HOTFIX: /api/payments 500 у всех клиентов

**Проблема:** GET /api/payments возвращал 500 Internal Server Error у всех клиентов. Страница "Платежи" показывала пустой список.

**Причина:** JOIN с таблицей `sales` в SELECT-запросе — `sales(id, total_amount, status, sale_date)`. Колонка `sale_date` была переименована или удалена из таблицы `sales` в Supabase, из-за чего PostgREST возвращал ошибку "Could not find...".

**Фикс:** Убран join с `sales` из GET `/api/payments`. Данные о сделке не нужны для отображения списка платежей — в `payment` уже есть `sale_id` для ссылки.

**Затронутые файлы:**
- `src/app/api/payments/route.ts`

**Коммит:** 11ead4d

---

### 18.04.2026 — Сортировка клиентов

**Функционал:** На странице `/clients` добавлена сортировка по 4 критериям.

**UI:** Строка чипов под поиском — активный чип подсвечивается indigo. Работает на десктопе и мобиле.

**Варианты сортировки:**
- **По дате добавления** (`created_at DESC`) — дефолт, SQL `ORDER BY`
- **По алфавиту** (`first_name ASC`) — SQL `ORDER BY`
- **По последнему визиту** (`last_visit DESC`) — пост-сортировка после RPC-агрегата, null → в конец
- **По сумме сделок** (`total_paid DESC`) — пост-сортировка после RPC-агрегата

**Затронутые файлы:**
- `src/app/(dashboard)/clients/page.tsx` — state `sortBy`, UI чипы, передача в хук
- `src/hooks/useClients.ts` — параметр `sortBy` в queryKey и URLSearchParams
- `src/app/api/clients/summary/route.ts` — `sortBy` из searchParams, SQL sort для alphabet/created_at, пост-сортировка для last_visit/last_sale

**Коммит:** 8829823

---

### 18.04.2026 — Responsive layout: маленькие экраны (ноутбуки/планшеты)

**Проблема:** На ноутбуках ~1366px одновременно показывались RightPanel (288px) + левая тёмная панель статистики (~250px) → для контента оставалось ~550px.

**Что изменено:**

**RightPanel** (`src/components/layout/RightPanel.tsx`):
- `xl:flex` → `2xl:flex` — панель Киры/рекламы скрыта до 1536px

**Sales** (`src/app/(dashboard)/sales/page.tsx`):
- Левый split-layout: `hidden md:flex` → `hidden xl:flex`
- KPI-карточки и chart: `md:hidden` → `xl:hidden` (видны на планшетах)
- Добавлен `md:block xl:hidden` — полноширокая таблица без левой панели (поиск + табы + строки)

**Payments** (`src/app/(dashboard)/payments/page.tsx`):
- Левый split-layout: `hidden md:flex` → `hidden xl:flex`
- Добавлен `md:block xl:hidden` — полноширокая таблица с поиском/шапкой/строками

**Clients** (`src/app/(dashboard)/clients/page.tsx`):
- Шапка/скелетон/строки: `grid-cols-[2fr_1fr_1fr_80px_100px_90px]` → адаптивный grid
- `md`: имя + телефон + визиты (3 колонки)
- `lg`: + последний визит + сумма (5 колонок)
- `xl`: + действия (6 колонок)
- Имя никогда не обрезается — первая колонка `2fr` на всех брейкпоинтах

**Коммит:** 328da4b

---

### 19.04.2026 — feat: Главная страница — пользовательский выбор landing page (Web + PWA синк)

**Задача:** Ксения попросила возможность выбрать какая страница открывается при входе (например Визиты вместо Дашборда). Выбор должен синхронизироваться между веб и PWA.

#### Архитектурное решение

Расширена существующая таблица `user_nav_preferences` (уже использовалась для мобильного навбара) — per-user хранилище с RLS `auth.uid() = user_id`. Существующий API `/api/mobile/preferences` уже работает и из веб (cookies), и из PWA (Bearer) — автоматическая синхронизация.

**Почему расширили, а не создали новое:** экономия инфраструктуры. Одна таблица, один endpoint, одна React Query key — всё уже настроено.

#### Миграция БД

`add_default_landing_page_to_user_nav_preferences`:
```sql
ALTER TABLE public.user_nav_preferences
  ADD COLUMN IF NOT EXISTS default_landing_page text NOT NULL DEFAULT 'dashboard';

ALTER TABLE public.user_nav_preferences
  ADD CONSTRAINT user_nav_preferences_default_landing_page_check
  CHECK (default_landing_page IN (
    'dashboard', 'visits', 'clients', 'sales', 'payments',
    'finances', 'inventory', 'diary', 'broadcast', 'analytics'
  ));
```

RLS уже настроен (`auth.uid() = user_id`), политика `user_nav_preferences_self` — юзер видит только свою строку.

#### Новые файлы

**`src/lib/landing-pages.ts`** — single source of truth
- 10 опций: `dashboard`, `visits`, `clients`, `sales`, `payments`, `finances`, `inventory`, `diary`, `broadcast`, `analytics`
- Каждая опция: `path`, `label_ru`, `label_he`, `desc_ru`, `desc_he`, `icon` (Lucide), `featureFlag`, `colorTint`
- `pathFromLandingId(id)` — серверный резолв без проверки фич, fallback `/dashboard`
- `resolveLandingPath(id, features)` — клиентский резолв с учётом отключённых модулей
- `VALID_LANDING_IDS` — множество для API-валидации

**`src/hooks/useLandingPage.ts`** — React Query хук
- Query `['user-preferences']`, staleTime 60s, `refetchOnWindowFocus: false`
- Мутация с optimistic update (Rule 5 реактивности Trinity)
- `availableOptions` — фильтрация через `useFeatures()` (отключённые модули не показываются)
- Возвращает: `landingId`, `landingPath`, `availableOptions`, `isLoading`, `isSaving`, `saveError`, `setLanding`

**`src/app/(dashboard)/settings/home-page/page.tsx`** — UI выбора
- Карточки с иконкой, лейблом, описанием (RU/HE)
- Клик → optimistic save + toast об ошибке если упало
- Skeleton-loading пока грузятся preferences
- RTL-aware

#### Изменённые файлы

**`src/app/api/mobile/preferences/route.ts`**
- GET возвращает `default_landing_page` (default `'dashboard'`)
- PUT принимает частичный payload (`nav_tabs` и/или `default_landing_page` — одно или оба)
- Валидация `default_landing_page` через `VALID_LANDING_IDS`
- Возвращает актуальное состояние после upsert

**`src/components/settings/settingsConfig.ts`**
- Добавлен импорт `Home` из lucide-react
- Новая карточка `home-page` в категорию `general`, после `language` (иконка Home, emerald colorTint, href `/settings/home-page`)

**`src/app/callback/route.ts`** (Google OAuth коллбек)
- Добавлен helper `getUserLandingPath(adminClient, userId)` — читает `user_nav_preferences.default_landing_page`, fallback `/dashboard` при любой ошибке
- Редирект обычных owner/staff: `NextResponse.redirect(${origin}${landingPath})` вместо хардкода `/dashboard`
- **Не затронуты** ветки admin/sales-agent/onboarding — у них своя логика редиректов

**`src/app/login/page.tsx`** (email/password логин)
- После успешного `signInWithPassword`: fetch `/api/mobile/preferences` → `pathFromLandingId` → `router.push(targetPath)`
- Fallback `/dashboard` при любой ошибке fetch

**`src/components/layout/Sidebar.tsx`** (десктопный логотип)
- Добавлен импорт `useLandingPage`
- Блок логотипа обёрнут в `<Link href={landingPath} prefetch>`: клик по "Trinity" ведёт на выбранную страницу
- aria-label на RU/HE

**`src/components/layout/MobileHeader.tsx`** (мобильный центральный логотип)
- Добавлен импорт `Link` и `useLandingPage`
- Центральный логотип (когда нет филиалов) обёрнут в `<Link href={landingPath}>` с active:scale-95
- Когда есть филиалы — центр занят `BranchSwitcher`, логотипа нет (не трогаем)

#### Поведение

1. Юзер заходит в `/settings/home-page`, выбирает "Визиты"
2. Optimistic update в кэше React Query, PUT на `/api/mobile/preferences`
3. БД: `UPSERT user_nav_preferences SET default_landing_page = 'visits' WHERE user_id = auth.uid()`
4. При следующем логине (OAuth через `/callback` или email через `/login`) — редирект на `/visits`
5. Клик по логотипу в шапке → переход на `/visits`
6. В PWA — то же самое, читает ту же БД-запись через Bearer auth
7. Если админ отключит модуль `visits` для org — опция исчезнет из списка выбора, но в БД запись останется; `resolveLandingPath` вернёт fallback `/dashboard`

#### Безопасность

- RLS `auth.uid() = user_id` — per-user isolation
- CHECK constraint в БД — невалидное значение отвергается на уровне PostgreSQL
- API-валидация через `VALID_LANDING_IDS` — двойная защита
- `getAuthContext(request)` — поддерживает и Bearer (mobile/PWA), и cookies (веб)
- Fallback `/dashboard` везде при сбое — юзер не попадёт в 404

#### Затронутые файлы

**Созданы:**
- `src/lib/landing-pages.ts`
- `src/hooks/useLandingPage.ts`
- `src/app/(dashboard)/settings/home-page/page.tsx`

**Изменены:**
- `src/app/api/mobile/preferences/route.ts`
- `src/components/settings/settingsConfig.ts`
- `src/app/callback/route.ts`
- `src/app/login/page.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileHeader.tsx`

**Миграция:** `add_default_landing_page_to_user_nav_preferences`

**Коммиты:**
- `3288cde` — feature
- `9d0e88d` — fix: суперадмин с своей org уважает preference в /callback
- `2460a29` — fix: PWA entry /pwa-start (см. ниже)

**PWA nuance — отдельный entry point `/pwa-start`:**

PWA manifest не пропускает пользователя через `/callback` — при тапе на иконку приложение открывается сразу на `start_url` с уже валидной сессией. Захардкоженный `/dashboard` игнорировал preference.

Решение: `start_url: "/pwa-start"` в `manifest.json` + серверный компонент `src/app/pwa-start/page.tsx`, который:
- Проверяет auth через cookies (SSR supabase client)
- Не залогинен → `/login`
- Залогинен → читает `user_nav_preferences.default_landing_page` → редирект
- Fallback `/dashboard` на любую ошибку

Страница `force-dynamic` + `runtime: 'nodejs'` — никакого edge-кэша, каждый открытый PWA тап = свежий расчёт.

**⚠️ Важно про обновление manifest в PWA:**
Браузеры агрессивно кэшируют `manifest.json`. Установленная PWA может продолжать использовать старый `start_url: "/dashboard"` до полного цикла обновления Service Worker, который может занять несколько открытий приложения. Чтобы ускорить:
- Android Chrome: удалить иконку с домашнего экрана → переустановить PWA
- iOS Safari: удалить иконку → снова "Add to Home Screen"

---

## 🔒 ГЛОБАЛЬНОЕ ПРАВИЛО: Mobile Header — расположение иконок

**Правило (неизменно для обоих языков — русский И иврит):**
- 🔙 **Стрелка "Назад" — ВСЕГДА СЛЕВА**
- ☰ **Бургер (меню) — ВСЕГДА СПРАВА**
- В центре — логотип или Branch Switcher
- Ни в русской, ни в израильской версии они НЕ должны меняться местами

**Механика реализации:**
- На flex-контейнере шапки стоит `dir="ltr"` — это **форсит LTR-раскладку локально**, игнорируя глобальный `dir="rtl"` от `<html>` на иврите
- Flexbox не зеркалит порядок, потому что локальный `dir` важнее родительского
- Внутренние dropdown-ы (Branch Switcher) оборачиваются в собственный `dir` по языку страницы — это вложенное исключение, не влияет на порядок иконок в шапке
- Никаких JS-условий `if (language === 'he')` для позиционирования — только DOM + `dir="ltr"` на контейнере

**Файлы, где применяется правило:**
- `src/components/layout/MobileHeader.tsx` — основной мобильный header (все страницы `(dashboard)`)
- `src/components/layout/MobileAdminHeader.tsx` — header админской панели `/admin/*`

**DOM-порядок (обязательный):**
```tsx
<div dir="ltr" className="flex items-center justify-between ...">
  {/* Left: Back */}
  <div className="w-10 justify-start">...ArrowLeft...</div>

  {/* Center: Logo / BranchSwitcher */}
  <div ...>...</div>

  {/* Right: Bell + Burger */}
  <div className="flex gap-1">...NotificationBell...Menu...</div>
</div>
```

**❌ Чего НИКОГДА нельзя делать:**
1. Удалять `dir="ltr"` с flex-контейнера шапки — иначе Flexbox на иврите зеркалит и бургер уходит налево
2. Менять DOM-порядок блоков (должно быть строго: Back → Logo → Burger)
3. Делать позиционирование условным от языка (`language === 'he' ? ... : ...`) — ведёт к "гуляющим" иконкам при смене языка
4. Оборачивать всю шапку в `<div dir="rtl">` (или полагаться на наследование от `<html dir="rtl">`) — то же самое

**✅ Если надо добавить новый элемент в шапку:**
- К Back (левая группа) — вложить внутрь `<div className="w-10 justify-start">` рядом с Back
- К Burger (правая группа) — вложить внутрь `<div className="flex gap-1">` рядом с NotificationBell + Burger
- Никогда не создавать четвёртый отдельный блок между ними — сломает `justify-between`

**История:**
- 14.04.2026 — первая попытка swap через Flexbox + RTL-автозеркаливание (коммит `0639cb1`) — не сработало стабильно, иконки "гуляли"
- 19.04.2026 — окончательный фикс через локальный `dir="ltr"` на контейнере шапки. Позиции зафиксированы навсегда.


---

## 🔒 ГЛОБАЛЬНОЕ ПРАВИЛО: Уточнение области изменений перед работой

**Когда правило применяется:**
Каждый раз, когда Влад ставит задачу БЕЗ явного указания платформы или языка интерфейса, Claude ОБЯЗАН задать уточняющие вопросы ДО написания любого кода.

### Что уточнять

**1. Интерфейс (платформа):**
- 🖥️ **ПК / Десктоп** — веб >1024px
- 📱 **Мобильный веб / PWA** — <768px
- 📲 **Планшет** — 768–1024px
- 🤖 **Trinity Mobile (Flutter)** — отдельное нативное приложение
- 🌐 **Все сразу** — синхронная правка

**2. Языки интерфейса:**
- 🇷🇺 **Русский** (`ru`)
- 🇮🇱 **Иврит** (`he`, RTL)
- **Оба языка** (дефолт для UI-текстов)

### Когда уточнять НЕ нужно

- Влад сам указал область в запросе («на мобильном», «в десктопе», «только иврит», «PWA», «Flutter»)
- Правка чисто серверная — API-роут, миграция БД, бэкенд-логика без UI
- Фикс бага с чётко локализованной областью (например «в логах Vercel видно ошибку на /api/payments» — область понятна)
- Влад прислал скриншот / фото — область видна из контекста

### Формат уточнения

Коротко, списком, без воды. Пример:

> Уточни перед стартом:
> 1. Где правим — десктоп, мобильный веб (PWA), Flutter, или везде?
> 2. Какие языки затрагиваем — только RU, только HE, или оба?

После ответа Влада — СРАЗУ в работу, без повторных вопросов.

### Зачем это нужно

- Экономит время: не переделываем половину, потому что «а я имел в виду только мобилку»
- Предотвращает регрессию: правка в десктопе не ломает мобильный layout и наоборот
- RTL/LTR-специфика иврита требует отдельного тестирования — надо знать заранее
- Trinity Mobile (Flutter) — отдельный кодбейс, правки туда требуют flutter analyze + ручной тест на Samsung S21

### История
- **19.04.2026** — правило введено по указанию Влада. Причина: слишком часто Claude лез править везде сразу или угадывал платформу, вместо того чтобы спросить.

---

### 19.04.2026 — fix: PWA открывается на /dashboard вместо выбранной landing page

**Проблема:**
Пользователь выбрал в Настройках → Главная страница раздел «Задачи» (или любой другой кроме Дашборда). Но при запуске установленной PWA с иконки телефона — всё равно открывается `/dashboard`, игнорируя preference.

**Причина:**
`start_url` устанавливается в момент **первой** установки PWA на устройство. У Влада (и потенциально других ранних юзеров) PWA установлена **до** того, как в `manifest.json` появился `/pwa-start` — в системе телефона прописан старый `start_url: "/dashboard"`. Chrome обновляет `start_url` из свежего манифеста асинхронно и не гарантированно, это может занимать дни/недели. Плюс manifest.json агрессивно кэшируется (HTTP `max-age=604800` + Service Worker).

Результат: `/pwa-start` отрабатывает корректно, но **никогда не вызывается** — PWA открывается сразу на `/dashboard`.

**Решение:**
Добавлен клиентский guard `PWAHomeRedirect` в `/dashboard`, который при выполнении всех условий редиректит на preference:
1. `display-mode: standalone` (мы в PWA)
2. `document.referrer` пустой или не с нашего origin (первое открытие, а не клик из меню)
3. Флаг `sessionStorage.trinity_pwa_home_redirected_v1` не выставлен (в этой сессии ещё не редиректили — защита от цикла)
4. `default_landing_page !== 'dashboard'` из `/api/mobile/preferences`

Только при ВСЕХ четырёх — `router.replace(targetPath)`. Флаг ставится ДО проверки landing — чтобы даже если юзер вручную кликнет «Дашборд» в меню после редиректа, мы его больше не перехватывали.

**Поведение:**
- PWA открывается из иконки → Dashboard мелькает скелетон (≈200 мс) → редирект на выбранную страницу
- В меню PWA клик «Дашборд» → остаёмся на дашборде (реферер с нашего origin блокирует guard)
- Обычный веб (не standalone) → guard не срабатывает, ничего не меняется
- Юзер не выбирал landing page → возвращается `'dashboard'` по дефолту → guard ничего не делает

**Важно про /pwa-start:**
Эндпоинт `/pwa-start` **остаётся** — он нужен для новых установок PWA, которые корректно подхватят `start_url: "/pwa-start"` из свежего манифеста, и пройдут через него быстрее (серверный редирект). `PWAHomeRedirect` — подстраховка для старых установок и для случаев, когда SW закэширует что-то некорректно.

**Затронутые файлы:**
- `src/components/dashboard/PWAHomeRedirect.tsx` (новый) — клиентский компонент
- `src/app/(dashboard)/dashboard/page.tsx` — монтирует `<PWAHomeRedirect />` рядом с `<DashboardContent />`

**Безопасность:**
- `/api/mobile/preferences` уже требует auth (cookie или Bearer), возвращает только preferences текущего юзера
- RLS на `user_nav_preferences` — `auth.uid() = user_id`
- Никаких новых данных в клиент не утекает
- Guard не делает ничего кроме чтения своей же preference

**Регрессия:**
- Нет. Guard работает ТОЛЬКО в PWA standalone с пустым/external реферером. В обычном вебе `matchMedia('(display-mode: standalone)')` возвращает false — весь useEffect выходит на первой проверке.
- Прямые клики «Дашборд» в меню PWA не ломаются — они идут с реферером того же origin.

**Коммит:** `fed6df9`

---

### 19.04.2026 — fix: PWA мелькание дашборда 4-5 сек перед редиректом на landing preference

**Проблема:**
После предыдущего фикса (`fed6df9`) при открытии PWA дашборд всё равно показывался 4-5 секунд **полностью загруженным** со всеми виджетами, и только потом происходил редирект на выбранную юзером landing page (например «Задачи»). Причина: `PWAHomeRedirect` был тонкий client-side guard, который **не блокировал** рендер `DashboardContent` — виджеты успевали и смонтироваться, и завершить свои fetch'и, пока guard ждал ответа от `/api/mobile/preferences`.

**Решение — два изменения:**

**1. Кэш landing в `localStorage`** (файл `src/hooks/useLandingPage.ts`)
- Экспортируется константа `LANDING_LS_KEY = 'trinity_landing_v1'`
- При каждом успешном fetch preferences значение `default_landing_page` пишется в `localStorage`
- При сохранении нового выбора (optimistic update в `useMutation`) — тоже пишется сразу в `localStorage`
- При откате ошибки — восстанавливается старое значение

Это даёт **синхронное** чтение preference при следующем открытии PWA — без ожидания сети.

**2. `PWAHomeGate` — блокирующая обёртка** (новый файл `src/components/dashboard/PWAHomeGate.tsx`, удалён старый `PWAHomeRedirect.tsx`)

Компонент-обёртка вокруг `DashboardContent`. При первом рендере синхронно в `useState(() => ...)` принимает решение: `'show-dashboard'` / `'redirect'` / `'pending'`.

Условия для синхронного `'redirect'`:
- `display-mode: standalone` (PWA)
- Реферер пуст или внешний (свежее открытие, не клик из меню)
- Флаг `sessionStorage.trinity_pwa_home_redirected_v1` не выставлен
- `localStorage[LANDING_LS_KEY]` содержит не-dashboard значение

Если все выполнены — **`DashboardContent` НЕ монтируется**, показывается только нейтральный фон `bg-gray-50`, параллельно триггерится `router.replace(target)`. Виджеты не грузятся, сетевых запросов дашборда нет, мельтешения нет.

Для кейса без кэша (первый запуск PWA после установки) — рендерится пустой фон и идёт fetch preferences; после ответа либо редирект, либо показ дашборда. Это ~200 мс пустого экрана вместо 4-5 секунд мельтешащего дашборда.

Фоновый `refreshLandingCacheInBackground()` при синхронном редиректе — обновляет localStorage на случай если серверное значение изменилось.

**Файл `src/app/(dashboard)/dashboard/page.tsx`:**
```tsx
<PWAHomeGate>
  <DashboardContent orgId="" />
</PWAHomeGate>
```

**Защита от регрессии для обычных пользователей:**
- На веб-Chrome (не standalone) `syncDecision()` сразу возвращает `'show-dashboard'` → дашборд рендерится **без задержек и без изменений**
- Клик «Дашборд» из меню PWA имеет реферер с того же origin → тоже `'show-dashboard'`
- После первого редиректа в сессии — флаг sessionStorage блокирует повторную сработку (если юзер вручную пойдёт на /dashboard из меню)

**Затронутые файлы:**
- `src/hooks/useLandingPage.ts` — добавлен кэш в localStorage (expose `LANDING_LS_KEY`, write on fetch + mutate)
- `src/components/dashboard/PWAHomeGate.tsx` — **новый**, блокирующая обёртка
- `src/components/dashboard/PWAHomeRedirect.tsx` — **удалён**, заменён на PWAHomeGate
- `src/app/(dashboard)/dashboard/page.tsx` — DashboardContent обёрнут в PWAHomeGate

**Безопасность:**
- `localStorage` хранит только id страницы (`'diary'`, `'visits'` и т.п.) — не секретные данные, не токены
- API `/api/mobile/preferences` требует auth и возвращает только данные текущего юзера (RLS)
- Все try/catch защищены от приватного режима/quota errors

**Регрессия:** нет. Обычный веб не затронут. Клик из меню в PWA не перехватывается.

**Коммит:** `583c12b`


---

### 20.04.2026 — fix: кнопка «Назад» возвращала на /dashboard игнорируя выбранную главную

**Проблема:**
После настройки кастомной главной страницы (`user_nav_preferences.default_landing_page` — например `/clients` или `/diary`) кнопка «Назад» в PWA — и физическая Android-кнопка, и стрелка ← в `MobileHeader` — всё равно возвращала на `/dashboard`. Поведение одинаковое в RU и HE, на мобиле и десктопе, потому что все header'ы используют один и тот же хук `useBackNavigation`.

**Причина:**
В `src/hooks/useBackNavigation.ts` карта `PARENT_ROUTES` хардкодила `/dashboard` как родителя для всех корневых секций:
```ts
'/clients': '/dashboard',
'/payments': '/dashboard',
'/visits': '/dashboard',
'/sales': '/dashboard',
'/inventory': '/dashboard',
'/diary': '/dashboard',
// ... и т.д.
'/dashboard': '/',
```
`ROOT_ROUTES = new Set(['/', '/dashboard', '/admin'])` — дашборд считался конечным корнем навигации независимо от выбора пользователя. `canGoBack` и `handleBack` ничего не знали про `landingPath`.

**Решение — нативное, без костылей:**

Файл `src/hooks/useBackNavigation.ts`:

1. **Импорт** `useLandingPage` и `DEFAULT_LANDING_PATH`.
2. **Убрана** карта «корневые секции → /dashboard». Оставлены только реальные sub-page → parent маппинги (`/admin/*` → `/admin`, `/settings/*` → `/settings`, `/clients/import` → `/clients`). Добавлен `/settings/home-page` → `/settings` (его не хватало).
3. **Новая константа** `DASHBOARD_ROOT_SECTIONS` — Set всех корневых секций дашборда. Их родитель вычисляется динамически как `landingPath` пользователя.
4. **Новая функция** `buildParentResolver(landingPath)` — возвращает резолвер, который для любой секции из `DASHBOARD_ROOT_SECTIONS` возвращает `landingPath` (или `null`, если текущая секция и есть landing). Статический маппинг имеет приоритет.
5. **`STATIC_ROOT_ROUTES = new Set(['/', '/admin'])`** — только то, что всегда корень (выбор главной не влияет на админку и корневой редиректор).
6. **В хуке**: `useLandingPage()` даёт `landingPath`, из него через `useMemo` собирается резолвер. Флаг `isAtLanding = pathname === landingPath` — единственный источник истины «мы на главной».
7. **`handleBack`**: если `isAtLanding`, шаг "родитель" пропускается → сразу переходим к истории → к двойному нажатию для выхода.
8. **`canGoBack`**: `false` если `isAtLanding` или `pathname ∈ STATIC_ROOT_ROUTES` → стрелка ← в `MobileHeader` автоматически скрывается на выбранной главной.

**Что это даёт:**
- Юзер выбрал `/clients` главной → на `/clients` стрелка скрыта, Android-back = двойное нажатие для выхода.
- С `/clients/<id>` стрелка возвращает на `/clients` (было так же — работает).
- С `/payments` стрелка возвращает на `/clients` (было на `/dashboard` — **фикс**).
- Юзер ничего не выбирал → `landingPath = /dashboard` → всё работает как раньше.
- RU и HE ведут себя одинаково (хук не зависит от языка).
- Desktop (`Sidebar` использует `landingPath` для логотипа) и mobile (`MobileHeader` использует `useBackNavigation` для стрелки) — единая логика.
- Админка (`/admin`) не затронута — `STATIC_ROOT_ROUTES` держит её как корень независимо от preference.

**Затронутые файлы:**
- `src/hooks/useBackNavigation.ts` — полная переработка резолвера родителей + canGoBack

**Проверено:**
- `src/app/page.tsx`, `src/app/pwa-start/page.tsx` — редиректы на landing не тронуты
- `src/components/dashboard/PWAHomeGate.tsx` — логика блокировки дашборда не тронута
- `src/components/layout/MobileHeader.tsx`, `src/components/layout/MobileAdminHeader.tsx`, `src/components/layout/Sidebar.tsx` — потребители хука, API хука не изменился (`{ handleBack, canGoBack }`)
- `src/lib/landing-pages.ts` — SSOT опций главной страницы, не тронут
- Билд `npm run build` — чистый, 237 страниц, 0 ошибок TypeScript

**Регрессия:** нет. API хука не изменился. Все существующие маппинги `/admin/*`, `/settings/*`, `/clients/import` работают как раньше. Для юзеров без выбранной главной (`landingId === 'dashboard'`) поведение идентично прежнему. Админка и корневой `/` не затронуты.

**Безопасность:** не затронута. Изменения только в клиентской навигации, никакого касания auth/RLS/org_id.

**Коммит:** будет проставлен после push.


---

### 20.04.2026 — feat: мульти-корзина при редактировании визита (услуги + товары + произвольные)

**Запрос:**
При редактировании визита должна быть возможность добавлять и удалять услуги, товары или произвольные позиции — как при создании. До этого в edit-режиме был только один ServicePicker и одна цена.

**Архитектурное решение — без новых API:**

Существующие эндпоинты уже поддерживают инкрементное управление позициями визита:
- `POST /api/visits/[id]/services` — добавить услугу/произвольную позицию в `visit_services`
- `POST /api/visits/[id]/products` — добавить товар в `visit_services` (без движения склада до оплаты)
- `DELETE /api/visits/[id]/services/[serviceId]` — удалить позицию
- `PUT /api/visits/[id]` — обновить базовую услугу/цену/длительность/дату

Фундаментальное правило (закреплено в эндпоинтах, не меняется): `visits.price` = базовая цена (первая позиция). `visit_services[]` хранит только ДОП. позиции. Итог в UI = `visits.price + sum(visit_services.price)`. `DELETE`/`POST` на `visit_services` **не трогают** `visits.price` — иначе был бы двойной счёт.

**Реализация в `src/components/visits/UnifiedVisitDialog.tsx`:**

1. **Тип `VisitLineItem` расширен** двумя полями:
   - `dbId?: string` — id строки `visit_services` в БД (если уже сохранено)
   - `isBase?: boolean` — маркер основной позиции визита (управляется через `PUT /api/visits/[id]`)

2. **`hasMultiMode = !isAppt`** (было `!isEditMode && !isAppt`) — корзина теперь активна и для edit визита.

3. **`initialItemsRef: useRef<VisitLineItem[]>([])`** — snapshot БД-позиций на момент открытия модалки (только `extras`, без `isBase`). Используется для diff'а при submit.

4. **`useEffect` на `open` в edit-режиме** теперь:
   - строит `baseItem` из `visit.services`/`visit.price`/`visit.duration_minutes` с `isBase: true`
   - делает свежий `fetch('/api/visits/[id]/services')` — источник истины (а не кэшированный `visit_services` из props)
   - маппит результат в `extras`, каждая позиция получает `dbId`
   - `setItems([baseItem, ...extras])`, `initialItemsRef.current = extras`
   - fallback на `[baseItem]` при ошибке fetch — хотя бы базовая позиция видна

5. **`handleSubmit` для edit-режима — diff-синхронизация:**
   - `PUT /api/visits/[id]` — из значений `baseItem` (если корзинный режим) или `form.*` (fallback для встреч)
   - `DELETE` для позиций, которые были в `initialItemsRef` (с `dbId`), но исчезли из текущей корзины
   - `POST` для новых позиций (без `dbId`) в `/services` или `/products` в зависимости от типа
   - Все операции через `Promise.allSettled` — ошибки на отдельных позициях не ломают PUT, но показывают toast с числом неудач

6. **UI мульти-корзины:**
   - Базовая позиция (`isBase`) выделена indigo-подсветкой и бейджем «Основная услуга» / «שירות ראשי»
   - Кнопка `×` для `isBase` скрыта (вместо неё пустой spacer той же ширины) — базовую позицию нельзя удалить, это сам визит
   - `removeItem` дополнительно защищён: даже при программном вызове `i.isBase` фильтруется и не удаляется

7. **Блок «Длительность + Цена»** (`!isAppt && !hasMultiMode`) теперь рендерится только для встреч — для визитов цена и длительность считаются из корзины автоматически.

8. **Legacy-блок ServicePicker** остался в коде (ветка `hasMultiMode ? <корзина/> : <picker/>`) — формально недостижим для визита, но не удалён, т.к. используется как fallback для потенциального будущего отключения корзины через feature flag.

**Затронутые файлы:**
- `src/components/visits/UnifiedVisitDialog.tsx` — тип `VisitLineItem`, `useEffect` на open, `handleSubmit` edit-ветка, `removeItem`, UI корзины (бейдж + скрытие ×)

**Проверено:**
- `src/app/api/visits/[id]/route.ts` — PUT не трогает `visit_services`, safe
- `src/app/api/visits/[id]/services/route.ts` — POST не трогает `visits.price`, safe
- `src/app/api/visits/[id]/services/[serviceId]/route.ts` — DELETE пересчитывает `visits.duration_minutes`, но НЕ `visits.price`, safe
- `src/app/api/visits/[id]/products/route.ts` — POST не списывает склад до оплаты (списание через `/api/sales` при завершении), safe
- `src/app/(dashboard)/visits/page.tsx` — `getVisitTotal` считает `visit.price + sum(visit_services.price)`, ломает если удалить базу → именно поэтому `isBase` нельзя удалить из UI
- `src/components/shared/ItemPickerSheet.tsx` — общий picker с корзиной UnifiedSalesDialog, не затронут
- Билд `npm run build` — чистый, 237 страниц, 0 TypeScript-ошибок, 32s compile

**Регрессия:** нет.
- Create визита — логика `useMultiCart` та же (первая позиция → `visits.*`, остальные → `visit_services`)
- Создание встречи — блок `!isAppt` не выполняется, корзина не инициализируется, всё как раньше
- Редактирование встречи — `v.event_type === 'meeting'` пропускает блок загрузки корзины, рендерится старый UI (цель встречи + link)
- Завершённые визиты — edit теперь показывает все их позиции в корзине и позволяет добавлять новые, но не удалять базу

**Безопасность:**
- Все операции через `apiFetch` идут в существующие эндпоинты, защищённые `getAuthContext` + фильтр по `org_id`
- Никакого касания RLS, никаких новых таблиц, никаких миграций
- `dbId` в клиентском состоянии — это uuid строки `visit_services`, которая уже принадлежит визиту; передача его в URL `DELETE /api/visits/[id]/services/[dbId]` проходит ту же auth-проверку

**Коммит:** будет проставлен после push.


---

### 20.04.2026 — fix(sales): переименование кнопки «Оплатить сейчас» → «Изменить способ оплаты»

**Контекст:**
В drawer сделки (`SaleDetailModal`) у неоплачённой сделки (`status = unpaid`) со ссылкой на оплату уже отображается кнопка «Скопировать ссылку» для отправки клиенту. Ниже неё была кнопка «Оплатить сейчас» / «שלם עכשיו», которая открывает `UnifiedPaymentDialog` — тот же диалог выбора способа оплаты, что и при создании сделки. Лейбл сбивал с толку — для сделки со ссылкой человек не «оплачивает сейчас», а меняет способ оплаты (например, с линка на наличные/карту/бит).

**Изменения в `src/components/sales/SaleDetailModal.tsx`:**
- RU: `payNow: 'Оплатить сейчас'` → `'Изменить способ оплаты'`
- HE: `payNow: 'שלם עכשיו'` → `'שנה אמצעי תשלום'`
- `payBalance` (RU: 'Оплатить остаток', HE: 'שלם יתרה') — не тронуто. Это другой случай (`status = partial`, часть оплачена), там действительно доплата остатка.

Кнопка одинаково используется в desktop sidebar и в mobile actions — обе платформы читают один и тот же `t.payNow`/`t.payBalance`, поэтому правка в двух местах (HE + RU) покрывает всё.

**Затронутые файлы:**
- `src/components/sales/SaleDetailModal.tsx` — 2 строки в словарях локализации (HE + RU)

**Проверено:**
- `UnifiedPaymentDialog` — без изменений, тот же выбор способа оплаты
- Логика `needsPayment = sale.status === 'unpaid' || sale.status === 'partial'` — без изменений
- Билд `npm run build` — чистый, 33.2s, 237 страниц, 0 TypeScript-ошибок

**Регрессия:** нет. Только текст лейбла в двух локалях. Поведение кнопки (открытие диалога оплаты) не менялось.

**Безопасность:** не затронута.

**Коммит:** будет проставлен после push.


---

### 20.04.2026 — feat(whatsapp): ссылка на оплату в подтверждении визита

**Контекст:**
В настройках WhatsApp-автоматизации (`/settings/whatsapp/triggers`) для триггера «Подтверждение визита» (`visit_created`) добавлена возможность автоматически прикреплять ссылку на оплату Tranzila к сообщению, которое отправляется клиенту сразу после создания визита. Клиент получает в WhatsApp подтверждение записи с готовой ссылкой для онлайн-оплаты — не нужно отправлять её отдельным сообщением.

**Как работает:**
1. В карточке триггера «Подтверждение визита» появился новый тумблер «Прикрепить ссылку на оплату».
2. Когда включён — в список доступных переменных шаблона добавляется `{{payment_link}}`. Владелец ставит её туда, где хочет видеть ссылку в тексте.
3. При создании визита (если у него есть цена > 0 и у org настроен Tranzila-терминал) система:
   - создаёт запись в `payments` со статусом `pending`, привязанную к `visit_id`;
   - генерирует iFrame-ссылку Tranzila через тот же `createTranzilaPaymentLink`, что и `/api/payments/create-link`;
   - сохраняет ссылку в `payments.payment_link`;
   - подставляет её в `{{payment_link}}` шаблона и отправляет через `fireWaTrigger`.
4. Когда клиент оплачивает — существующий webhook `/api/payments/tranzila-success` корректно переводит `payments.status = 'paid'`, и триггер `recalculate_sale_status` (если визит связан со сделкой) автоматически обновляет статус.

**Архитектурное решение:**
Вся инфраструктура оплаты уже была в системе (`lib/tranzila.ts`, `/api/payments/create-link`, webhook). Вместо дублирования логики выделен общий хелпер `createVisitPaymentLink`, который используется и в web-роуте, и в mobile-роуте создания визита. Никакие существующие эндпоинты не тронуты.

**Миграция БД:**
- Таблица `public.wa_trigger_settings`: добавлена колонка `attach_payment_link boolean NOT NULL DEFAULT false` (migration `wa_trigger_settings_add_attach_payment_link`). Все существующие триггеры продолжают работать — по умолчанию опция выключена.

**Затронутые файлы:**
- `src/lib/wa/create-visit-payment-link.ts` — **новый** хелпер, инкапсулирует создание pending-payment + Tranzila-ссылки per-org. Не бросает исключений (возвращает `null` при любой ошибке).
- `src/lib/wa/fire-trigger.ts` — в интерфейс `vars` добавлено поле `payment_link?: string`; подстановка в шаблон через `{{payment_link}}`.
- `src/app/api/wa-triggers/route.ts` — POST upsert теперь сохраняет `attach_payment_link` в БД.
- `src/app/(dashboard)/settings/whatsapp/triggers/page.tsx` — в `TRIGGER_META.visit_created` добавлен флаг `showPaymentLinkToggle`, новое поле в `Trigger`, рендер тумблера внутри карточки (видно только для `visit_created`), `{{payment_link}}` в списке переменных.
- `src/app/api/visits/route.ts` — перед `fireWaTrigger` проверяет `wa_trigger_settings.attach_payment_link`, генерит ссылку через хелпер и передаёт её в vars.
- `src/app/api/mobile/visits/route.ts` — то же самое для создания визита с мобильного приложения.

**Безопасность:**
- Использует только per-org Tranzila-credentials из `organizations.tranzila_terminal/password`. Если терминал не настроен у org — ссылка просто не прикрепляется, сообщение уходит с пустой `{{payment_link}}` (graceful fallback). Никогда не используются платформенные ключи Amber Solutions как fallback.
- `paymentId` передаётся в Tranzila через `cField1` → webhook `/api/payments/tranzila-success` валидирует запись и статус по `payment_id` и `org_id`.
- Все вызовы fire-and-forget через `void` / `try-catch`: любая ошибка генерации ссылки не ломает создание визита.
- Запись в `payments` создаётся через `createSupabaseServiceClient` после того как `orgId` уже провалидирован вызывающим контекстом (`getAuthContext`).

**Регрессия:** нет.
- Существующие триггеры работают как раньше (дефолт `attach_payment_link = false`).
- Визиты без цены (`visitPrice <= 0`) → ссылка не создаётся.
- Визиты у org без настроенного Tranzila → ссылка не создаётся, сообщение отправляется без неё.
- Mobile-роут: встречи без `client_id` не затронуты, логика `if (client_id)` сохранена.
- Компонент `WaTriggerWizard` в `/admin/whatsapp` (старый suberadmin-мастер) не тронут.

**Проверено:**
- `npm run build` — чистый, 37.6s, 237 страниц, 0 TypeScript-ошибок.
- Миграция применена в Supabase, колонка подтверждена через `information_schema`.

**Коммит:** будет проставлен после push.


---

### 20.04.2026 — refactor(whatsapp): ссылка на оплату как отдельный триггер `payment_link_created`

**Контекст:**
Предыдущая реализация (коммит `111dab7`) добавляла опцию «прикрепить ссылку на оплату» внутрь триггера `visit_created`. Это была неверная архитектура: логически ссылка на оплату не связана с созданием визита — владелец создаёт её в любой момент (в drawer платежа, в drawer сделки, в `CompleteVisitPaymentDialog`, через API). Влад попросил сделать это отдельным триггером.

**Что изменилось:**
- **Новый триггер `payment_link_created`** — отдельный пункт в списке автоматических сообщений WhatsApp. Срабатывает после успешного выполнения `POST /api/payments/create-link` или `POST /api/mobile/payments/create-link` (т.е. когда владелец/сотрудник создаёт платёжную ссылку Tranzila для клиента).
- **Переменные шаблона:** `{{client_name}}`, `{{amount}}`, `{{payment_link}}`, `{{org_name}}`. Когда триггер включён и у клиента есть телефон — автоматически отправляется WhatsApp с заполненным шаблоном.
- Иконка: `CreditCard` (emerald-цвет). В списке стоит между `after_sale` и `birthday`.

**Откат предыдущей реализации:**
- Убран `showPaymentLinkToggle` и тумблер «Прикрепить ссылку на оплату» из карточки `visit_created`.
- Убрана переменная `{{payment_link}}` из `visit_created.vars`.
- Удалён файл `src/lib/wa/create-visit-payment-link.ts` — больше не нужен.
- Удалены импорты и вызовы `createVisitPaymentLink` из `src/app/api/visits/route.ts` и `src/app/api/mobile/visits/route.ts` — оба файла возвращены к состоянию до коммита `111dab7` в части триггеров.
- Колонка `wa_trigger_settings.attach_payment_link` (добавленная в миграции `wa_trigger_settings_add_attach_payment_link`) **оставлена в БД** — не удаляется, т.к. это дороже чем держать неиспользуемую boolean-колонку с `DEFAULT false`. API upsert её сохраняет, но нигде больше не читает.

**Затронутые файлы:**
- `src/lib/wa/fire-trigger.ts` — в `WaTriggerType` добавлен `'payment_link_created'`.
- `src/app/api/wa-triggers/route.ts` — в `TRIGGER_TYPES` whitelist добавлен `'payment_link_created'`.
- `src/app/(dashboard)/settings/whatsapp/triggers/page.tsx` — новая карточка `payment_link_created` с переменными, добавлена в `ORDER` между `after_sale` и `birthday`. Убран тумблер payment_link из `visit_created`. Добавлен `emerald` в `COLOR_BG`.
- `src/app/api/payments/create-link/route.ts` — после сохранения ссылки в `payments` добавлен `void` fire-and-forget вызов `fireWaTrigger('payment_link_created', ...)`. Загружает `clients.first_name/phone` и `organizations.name` через тот же `createSupabaseServiceClient`.
- `src/app/api/mobile/payments/create-link/route.ts` — то же самое для мобильного endpoint-а.
- `src/app/api/visits/route.ts` — откат: убрана проверка `attach_payment_link`, генерация ссылки и поле `payment_link` в vars.
- `src/app/api/mobile/visits/route.ts` — откат аналогично.
- Удалён: `src/lib/wa/create-visit-payment-link.ts`

**Точки срабатывания в UI (где вызывается `/api/payments/create-link` или мобильный аналог):**
- `/payments` — кнопка «Создать ссылку» в списке платежей.
- `PaymentDetailsDrawer` — действия в drawer платежа.
- `SaleDetailModal` — кнопка генерации ссылки в drawer сделки.
- `CompleteVisitPaymentDialog` — при выборе способа оплаты `card` (Tranzila).
- `UnifiedPaymentDialog` — тот же способ оплаты.
- Flutter mobile — все экраны создания платежа/сделки, использующие `create-link`.

Во всех этих точках ничего менять не пришлось — логика внедрена в сам endpoint, а не в фронтенд-вызов.

**Безопасность:**
- Per-org `tranzila_terminal` уже валидируется внутри endpoint-ов. WhatsApp-триггер срабатывает только после успешного создания `payment` и получения `tranzilaResult.url`.
- `fireWaTrigger` сам проверяет `is_enabled = true` и наличие непустого `message_template` перед отправкой. Если владелец не включил триггер — ничего не отправляется.
- `void` / try-catch — любая ошибка триггера не блокирует возврат ссылки клиенту (endpoint возвращает `payment_link` как и раньше).
- Нет изменений в проверках auth, RLS, модулей — `checkAuthAndFeature('payments')` + проверка `client.org_id` сохранены.

**Регрессия:** нет.
- Существующие триггеры работают как раньше.
- `visit_created` вернулся ровно к состоянию до коммита `111dab7` (переменных снова 5, без `{{payment_link}}`).
- Существующие строки в `wa_trigger_settings.attach_payment_link` не читаются — поле просто игнорируется.
- Endpoint-ы `/api/payments/create-link` возвращают тот же JSON-контракт `{ success, payment_id, payment_link, amount, currency }` — фронтенд ничего не замечает.
- Если у клиента нет телефона — триггер ранний `return`, ошибки нет.
- Если WA-интеграция у org отключена — `sendWhatsAppMessage` мягко фейлится (softFail), endpoint всё равно возвращает ссылку успешно.

**Проверено:**
- `npm run build` — чистый, 28.7s, 237 страниц, 0 TypeScript-ошибок.
- Поиск по коду: `createVisitPaymentLink` больше нигде не упоминается.
- Поиск по коду: `attach_payment_link` остался только в API upsert (не читается при отправке).

**Коммит:** будет проставлен после push.


---

### 20.04.2026 — fix(whatsapp): CHECK constraint блокировал сохранение нового триггера `payment_link_created`

**Контекст:**
После деплоя `7a628be` включение нового триггера «Создана ссылка на оплату» и нажатие «Сохранить настройки» приводило к тосту «Ошибка сохранения». Ошибка появлялась только для этого триггера — остальные 9 сохранялись нормально.

**Причина:**
На таблице `public.wa_trigger_settings` был CHECK constraint `wa_trigger_settings_trigger_type_check`, который жёстко ограничивал `trigger_type` десятью значениями: `visit_created`, `visit_reminder`, `visit_completed`, `client_added`, `demo_expired`, `after_visit`, `after_sale`, `birthday`, `win_back`, `debt_reminder`.

Код в `src/app/api/wa-triggers/route.ts` whitelist-ил новый тип на уровне приложения (`TRIGGER_TYPES.includes(t.trigger_type)`), но при upsert Postgres отбрасывал строку с constraint violation `23514`.

**Исправление:**
Миграция `wa_trigger_settings_add_payment_link_created_type` пересоздаёт CHECK constraint с расширенным списком, добавляя `'payment_link_created'`.

```sql
ALTER TABLE public.wa_trigger_settings
DROP CONSTRAINT IF EXISTS wa_trigger_settings_trigger_type_check;

ALTER TABLE public.wa_trigger_settings
ADD CONSTRAINT wa_trigger_settings_trigger_type_check
CHECK (trigger_type = ANY (ARRAY[
  'visit_created'::text, 'visit_reminder'::text, 'visit_completed'::text,
  'client_added'::text, 'demo_expired'::text, 'after_visit'::text,
  'after_sale'::text, 'birthday'::text, 'win_back'::text,
  'debt_reminder'::text, 'payment_link_created'::text
]));
```

**Проверено:**
- Constraint подтверждён через `pg_get_constraintdef` — новый тип в списке.
- Существующие строки не затронуты (DROP + ADD с тем же именем, данные сохраняются).
- Код приложения без изменений.

**Урок на будущее:**
При добавлении нового `trigger_type` нужно **одновременно** обновлять CHECK constraint — иначе application-level whitelist пропускает, а БД молча режет. Next time — гpеп по схеме перед коммитом: `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.wa_trigger_settings'::regclass`.

**Регрессия:** нет — CHECK только расширен, ничего не удалено из списка.

**Безопасность:** не затронута.

**Коммит:** документация обновлена, миграция применена напрямую через Supabase MCP (никакого кода в репозитории не менялось).


---

### 20.04.2026 — fix(whatsapp): BiDi в fireWaTrigger + короткие ссылки через /pay/[id]

**Контекст:**
После первого теста `payment_link_created` Влад прислал скриншот реально пришедшего WhatsApp-сообщения. Две проблемы:

1. **Длинная Tranzila-ссылка отображалась целиком как текст** — `https://directng.tranzila.com/ambersolt/iframenew.php?TranzilaPW=...&sum=...&currency=1&...` с URL-encoded параметрами. Клиент такое не откроет — выглядит как фишинг.

2. **BiDi-проблема в ивритском тексте** — строки где иврит смешан с эмодзи или цифрами ломались: WhatsApp выстраивал всю строку как LTR потому что первый «сильный» символ был латиницей или кириллицей (после подстановки `{{client_name}}`).

**Причина 1 — длинные ссылки:**
`fireWaTrigger` для `payment_link_created` передавал в переменную `payment_link` прямой URL Tranzila из `tranzilaResult.url`. URL был 200+ символов с десятками encoded параметров.

**Причина 2 — BiDi:**
В `src/lib/wa/fire-trigger.ts` функция `applyTemplate` просто подставляла переменные без RLM-обработки. Та же проблема уже была решена в `src/app/api/cron/wa-triggers/route.ts` для delayed-триггеров (after_visit, after_sale, win_back, debt_reminder), но код не был выделен в общий хелпер и не применялся в `fireWaTrigger`.

**Исправление 1 — короткие брендированные ссылки:**
В Trinity уже есть публичная страница `src/app/pay/[id]/page.tsx`. Она:
- Принимает UUID платежа из URL
- Загружает payment из Supabase по RLS-permissive SELECT (публичный доступ, только `status`, `payment_link`, `amount`, `currency`)
- При `status = 'pending'` и наличии `payment_link` — автоматически редиректит на Tranzila через 1 секунду
- Обрабатывает `cancelled/completed/failed` с соответствующими экранами
- Локализована HE+RU с тумблером переключения

Изменение в двух endpoint-ах (`src/app/api/payments/create-link/route.ts` и `src/app/api/mobile/payments/create-link/route.ts`) — в `fireWaTrigger.vars.payment_link` теперь передаётся `${origin}/pay/${payment.id}` вместо `tranzilaResult.url`.

Результат: клиент получает короткую ссылку типа `https://www.ambersol.co.il/pay/abc123-...` (~55 символов) вместо 250-символового URL. В WhatsApp такая ссылка автоматически становится кликабельным preview. Бренд — Amber Solutions, а не Tranzila → выше доверие.

**Исправление 2 — BiDi через RLM:**
Портирована логика из `applyTemplate` в `api/cron/wa-triggers/route.ts` в `src/lib/wa/fire-trigger.ts`. Проверка `hasHebrew` (есть ли иврит в шаблоне) + построчная вставка RLM (`\u200F`) перед строками, которые начинаются с не-ивритского символа. Теперь все 4 точки использования `fireWaTrigger` (`client_added`, `visit_created`, `visit_completed`, `payment_link_created`) автоматически получают корректный RTL-рендеринг.

**Затронутые файлы:**
- `src/lib/wa/fire-trigger.ts` — расширена `applyTemplate` с RLM-обработкой.
- `src/app/api/payments/create-link/route.ts` — `payment_link` в vars теперь короткая ссылка.
- `src/app/api/mobile/payments/create-link/route.ts` — то же для mobile.

**Безопасность:**
- `/pay/[id]` уже использует `.select('id, status, payment_link, amount, currency')` — минимум данных, никаких client_id/org_id не раскрываются.
- UUID платежа непредсказуем (v4), brute-force неработоспособен.
- RLS на `payments` разрешает публичный SELECT, но только этих полей (проверено существующей страницей, паттерн не меняется).

**Регрессия:** нет.
- `tranzilaResult.url` продолжает сохраняться в `payments.payment_link` (и передаётся в success_url/fail_url Tranzila как раньше) — поведение webhook не менялось.
- BiDi-фикс срабатывает только если в шаблоне есть ивритские символы (`/[\u0590-\u05FF]/`) — для чисто русских или английских шаблонов поведение идентично старому.
- Cron-триггеры используют свою `applyTemplate` в `api/cron/wa-triggers/route.ts` — не трогаем, работает.

**Проверено:**
- `npm run build` — чистый, exit 0.
- Страница `/pay/[id]` уже в билде (видна в списке 237 страниц).

**Коммит:** будет проставлен после push.


---

### 20.04.2026 — feat(whatsapp): многоязычность клиентов (HE+RU) + приоритетный язык организации

**Контекст:**
После фикса BiDi + сокращения ссылок (`ee0dd67`) Влад попросил развернуть многоязычность правильно: язык у клиента, шаблоны HE+RU у каждого триггера, приоритетный язык орга как tie-breaker. Реальная проблема — у Ксении (Hair Rehab) смешанная база: русскоговорящие и ивритоязычные клиенты, одним шаблоном не обойтись.

**Архитектура:**
- `clients.preferred_languages text[] DEFAULT ['he']` — массив предпочитаемых языков клиента. Клиент может отметить оба, один, или оба одновременно.
- `organizations.primary_language text DEFAULT 'he'` — основной язык орга. Используется как tie-breaker когда клиент отметил оба языка, и как fallback когда клиент не указал ничего.
- `wa_trigger_settings.message_template_ru text DEFAULT ''` — русская версия шаблона. Основной `message_template` остался как HE. Пустой RU → fallback на HE (позволяет постепенно добавлять переводы, не обязательно сразу).

**Логика выбора языка (в `fireWaTrigger` и cron):**
```
один preferred_language у клиента     → он
оба языка у клиента                   → primary_language орга
клиент без языка                      → primary_language орга
выбран язык, но шаблон пустой         → fallback на второй язык
```

**Затронутые файлы:**

*Schema:*
- Миграция `multilang_clients_orgs_triggers` — 3 колонки + 2 CHECK constraint (subset `['he','ru']` для массива, enum для orga).

*API / backend:*
- `src/lib/wa/fire-trigger.ts` — полный рефакторинг: загружает `clients.preferred_languages` по `clientId`, загружает `organizations.primary_language`, вызывает `pickLanguage()` + `pickTemplate()`, BiDi-фикс через RLM. `WaTriggerType` расширен до 4 типов (+payment_link_created).
- `src/lib/wa/fire-trigger.ts` — новый необязательный параметр `clientId` в `FireWaTriggerOpts`. Если не передан — используется `primary_language` орга.
- `src/app/api/wa-triggers/route.ts` — upsert сохраняет `message_template_ru`.
- `src/app/api/cron/wa-triggers/route.ts` — все 4 cron-триггера (after_visit, after_sale, win_back, debt_reminder) выбирают язык. `pickTemplate()` импортируется из того же файла. Кэш `orgLangCache` по `org_id` — один SELECT на organization вместо N.
- `src/app/api/organizations/primary-language/route.ts` — **новый** endpoint, GET/POST, аутентификация через `getAuthContext`, валидация `lang in ('he','ru')`.

*Вызовы `fireWaTrigger` — все 5 точек теперь передают `clientId`:*
- `src/app/api/visits/route.ts` — web POST визита → `clientId: clientId`
- `src/app/api/mobile/visits/route.ts` — mobile POST визита → `clientId: client_id`
- `src/app/api/visits/[id]/status/route.ts` — PATCH completed → `clientId: client.id`
- `src/app/api/payments/create-link/route.ts` → `clientId: data.client_id`
- `src/app/api/mobile/payments/create-link/route.ts` → `clientId: client_id`
- `src/app/api/clients/route.ts` — POST нового клиента (client_added) → `clientId: client.id`

*UI:*
- `src/app/(dashboard)/settings/whatsapp/triggers/page.tsx` — двуязычные шаблоны: компонент `TemplateEditor` с табами «עברית / Русский», индикаторы заполненности (зелёная точка), fallback-hints, RTL `dir` для HE textarea. Fallback: если один из языков пустой — используется другой.
- `src/app/(dashboard)/settings/whatsapp/page.tsx` — селектор «Основной язык» с флагами 🇮🇱 🇷🇺, сохраняется сразу при клике (без кнопки Save), лоадер во время запроса, toast-подтверждение.
- `src/components/clients/AddClientDialog.tsx` — стилизованные toggle-buttons для `preferred_languages`, default `['he']`, защита от пустого массива (минимум один язык), подпись «Используется для WhatsApp на нужном языке».

*Types:*
- `src/types/database.ts` — `Client` расширен через intersection `& { preferred_languages?: string[] }` без правки автогенерированной секции. Когда `supabase gen types typescript` будет перегенерирован — поле попадёт в Row type автоматически, intersection можно будет убрать.

**Безопасность:**
- CHECK `clients.preferred_languages SUBSET OF ['he','ru']` — никто не может вставить мусорный язык.
- CHECK `organizations.primary_language IN ('he','ru')` — enum-валидация.
- `/api/organizations/primary-language` POST требует валидный `getAuthContext`, обновляет только `orgId` текущего auth-контекста. Невозможно изменить язык чужой организации.
- `AddClientDialog` — UI защищён от пустого массива (клик по выбранному языку когда он единственный не снимает галочку).

**Регрессия:**
- Все существующие клиенты получили `preferred_languages = ['he']` по дефолту → всем продолжают уходить ивритские шаблоны как раньше.
- Все организации получили `primary_language = 'he'` → нейтрально для всех.
- `message_template_ru` пустой → все триггеры продолжают работать на HE как до миграции.
- `fireWaTrigger` без `clientId` (если какая-то старая точка вызова забудет передать) → fallback на primary_language орга, не падает.
- Автогенерированный тип `Database` не тронут. Следующий `supabase gen types typescript` не перезапишет наши правки, потому что они вне автогенерированной секции.
- `ClientSummary` тип не менялся — в GET `/api/clients/summary` preferred_languages не выдаётся (не требуется в списке для отображения).

**Проверено:**
- `npm run build` — чистый, exit 0, 237 страниц.
- `/api/organizations/primary-language` присутствует в `.next/server/app/api/organizations/primary-language/route.js`.
- Миграция подтверждена через `information_schema` — все 3 колонки на месте.

**Что ещё можно сделать (TODO, оставлено на потом):**
- UI чекбоксов в `EditClientDialog` / карточке просмотра клиента — пока только при создании (через `AddClientDialog`). Существующим клиентам можно будет редактировать язык после отдельного ревью UI. Все существующие клиенты работают на дефолте `['he']`.
- Mobile Flutter UI — чекбоксы в мобильной форме создания клиента. Правило: Flutter-изменения — отдельной задачей.
- Массовое обновление preferred_languages клиентов (bulk-update из CSV) — пока не требуется.

**Коммит:** будет проставлен после push.


---

### 20.04.2026 — fix(clients): preferred_languages в EditClientSheet + PUT endpoint

**Контекст:**
После деплоя `51c1864` Влад открыл карточку существующего клиента (Анета, Beautymania) для редактирования — **поле языка общения там не было**. Это было в прошлом TODO, но на продакшене отсутствие поля сразу видно. Фикс — добавить блок чекбоксов в `EditClientSheet` и пропустить `preferred_languages` через PUT endpoint.

**Где проблема:**
- `AddClientDialog` (создание нового клиента) — поле было добавлено в `51c1864`
- `EditClientSheet` (редактирование существующего) — **не было**, владелец не мог изменить язык для существующих клиентов
- `PUT /api/clients/[id]` — в деструктуризации body не было `preferred_languages`, и в update-объекте тоже. Даже если UI передавал — поле отбрасывалось.

**Исправление:**

*Frontend (`EditClientSheet.tsx`):*
- Новый state `preferredLanguages: string[]` — инициализируется из `client.preferred_languages` с fallback `['he']`
- `useEffect` при смене `client?.id` синхронизирует state из свежего client-объекта
- UI-блок с двумя toggle-кнопками 🇮🇱 עברית / 🇷🇺 Русский, идентичен `AddClientDialog` — перед полем «Заметки»
- Защита от пустого массива: клик по единственному выбранному языку не снимает галочку
- Передача в `updateClient.mutateAsync` через spread

*Backend (`/api/clients/[id]/route.ts`):*
- В `GET` добавлено `preferred_languages` в SELECT-маску — чтобы при открытии модалки было что отображать
- В `PUT` новая блок-валидация:
  - Если `preferred_languages` передан — должен быть непустым массивом
  - Все элементы должны быть `'he'` или `'ru'` (subset check, mirrors DB CHECK)
  - Уникализация через `Array.from(new Set(...))` — защита от `['he','he']`
  - Если не передан — поле не трогается в `update` (backward compatibility со старыми вызовами)

**Затронутые файлы:**
- `src/components/clients/EditClientSheet.tsx` — +54 строки (state, sync, UI)
- `src/app/api/clients/[id]/route.ts` — валидация + опциональное поле в update

**Безопасность:**
- Валидация на уровне API + CHECK constraint на уровне БД — двойная защита от мусорных значений
- `getAuthContext + eq org_id` — паттерн не менялся, невозможно менять язык клиента чужой org
- `preferred_languages` не раскрывает никаких privacy-sensitive данных

**Регрессия:**
- Старые вызовы PUT без нового поля работают как раньше (поле не обновляется — undefined branch в коде)
- Старые клиенты без `preferred_languages` отображаются с дефолтом `['he']` (fallback в инициализации state)
- GET-endpoint добавил одно поле в SELECT — размер ответа вырос на ~15 байт, некритично

**Проверено:**
- `npm run build` — чистый, exit 0, 237 страниц.
- Все точки использования `EditClientSheet` (`EditClientModal`, `ClientBottomSheet`) передают client-объект, который уже содержит `preferred_languages` через `useClient.*` SELECT.
- Валидация тестирована мысленно: пустой массив → 400, `['fr']` → 400, `['he','ru']` → OK, `['he','he','ru']` → дедуплируется до `['he','ru']`.

**Коммит:** будет проставлен после push.


---

### 20.04.2026 — feat(clients): отображение языка в карточке просмотра клиента

**Контекст:**
После деплоя `0bce428` Влад открыл просмотр карточки клиента (не редактирование — именно Details View) — поля языка там не было. По смыслу: пользователь хочет видеть язык сразу при открытии карточки, без нужды заходить в редактирование. Добавляю read-only отображение в блок «Информация».

**Где проблема:**
- `ClientDetailsModal.tsx` — это просмотр карточки (то окно со списком Галерея/Документы/Email/Адрес/Дата создания). Блок «Информация» не включал язык.
- `/api/clients/summary` — endpoint который отдаёт список клиентов на страницу `/clients`. Его SELECT не включал `preferred_languages`, поэтому когда модалка открывается из списка — поля в объекте `client` нет.
- `ClientSummary` тип не включал `preferred_languages` — TypeScript бы ругался на обращение к полю.

**Исправление:**

*UI (`ClientDetailsModal.tsx`):*
- В `T` (i18n) добавлен ключ `language` для HE/RU/EN
- В блок «Информация» между Email и Адрес добавлена строка «Язык общения» с бэджами 🇮🇱 עברית и/или 🇷🇺 Рус
- Расширено условие показа блока — теперь `preferred_languages` тоже триггерит отображение (для клиентов у которых нет email/адреса/даты рождения, но есть язык)
- Read-only: никакого взаимодействия, только отображение. Редактирование остаётся в EditClientSheet через кнопку «Редактировать»

*API (`/api/clients/summary/route.ts`):*
- В SELECT добавлено `preferred_languages` — поле теперь приходит со списком клиентов
- Размер ответа: +2 байта на клиента для `['he']` (дефолт), +7 байт для `['he','ru']` — пренебрежимо

*Типы (`types/database.ts`):*
- `ClientSummary` расширен полем `preferred_languages: string[] | null`
- В базовом типе `Client` поле уже было через intersection из коммита `51c1864` — ничего менять не нужно

**Затронутые файлы:**
- `src/components/modals/ClientDetailsModal.tsx` — +22 строки (i18n + JSX блок языка)
- `src/app/api/clients/summary/route.ts` — +1 поле в SELECT-маске
- `src/types/database.ts` — +1 поле в `ClientSummary`

**Безопасность:**
- `preferred_languages` не privacy-sensitive — это не телефон, не email, не адрес. Видимо всем, кто уже имеет доступ к клиенту (тот же `org_id`).
- Нет SQL-инъекций: поле добавлено в уже существующий безопасный SELECT
- RLS не тронута

**Регрессия:**
- Для старых клиентов `preferred_languages` = `['he']` по дефолту → в карточке у всех будет видно «🇮🇱 עברית». Это ожидаемо и информативно
- Если у клиента поле пустое/null (редкий случай некорректной миграции) — блок языка не покажется (`Array.isArray && length > 0` guard)
- Другие компоненты, получающие `ClientSummary` — получат дополнительное поле, ничего не сломает (строгая типизация только расширилась)

**Проверено:**
- `npm run build` — чистый, exit 0, 237 страниц
- Список клиентов `/clients` продолжает работать (все существующие поля на месте)
- Условие показа блока «Информация» корректно обрабатывает отсутствие `preferred_languages`

**Коммит:** будет проставлен после push.


---

### 20.04.2026 — feat(clients): preferred_languages в PWA-карточке клиента (TrinityMob)

**Контекст:**
После деплоя `5df8dd8` я добавил отображение языка в `ClientDetailsModal` — но это **десктоп**. На PWA (мобильная версия в браузере / добавленное на главный экран приложение) карточка клиента рендерится другим компонентом — `TrinityMob` через `ClientBottomSheet`. Туда поле я не добавил, хотя обещал сегодня довести многоязычность везде.

**Где проблема:**
- `ClientDetailsModal` — используется только на десктопе (там `isMobile` → `return null` на первом `useEffect`)
- На мобильном (`window.innerWidth < 768`) `ClientBottomSheet` рендерит `TrinityMob` (свайп-шторка с drag-to-close)
- `TrinityMob` имеет свой блок «Info» со строками phone/email/address/status/created — язык там не показывался
- Без этого Владу пришлось бы открывать редактирование чтобы посмотреть какой язык у клиента. Неудобно.

**Исправление:**

*`TrinityMob.tsx`:*
- Тип `TrinityMobClient` расширен полем `preferred_languages?: string[] | null`
- В объекте локали `T` добавлен ключ `language` для HE/RU/EN (קороткая форма «שפה / Язык / Language»)
- Блок «Info» — после существующих строк (phone/email/address/status/created) добавлен отдельный JSX-блок языка со стилизованными бэджами 🇮🇱 עברית и/или 🇷🇺 Рус
- Блок условный: показывается только если `Array.isArray(preferred_languages) && length > 0` — для клиентов с пустым/null значением ничего не рендерится
- Стили согласованы с окружающей разметкой TrinityMob: `padding: '5px 0'`, `borderBottom: '1px solid rgba(255,255,255,0.05)'`, `fontSize: 11`
- Сами бэджи — `padding: '2px 7px'`, `borderRadius: 5`, `rgba(255,255,255,0.08)` фон — чтобы читалось на тёмном сайдбаре темы

*`ClientBottomSheet.tsx`:*
- Локальный `ClientBottomSheetProps.client` расширен полем `preferred_languages?: string[] | null`
- Без этой правки TypeScript ругался бы: `TrinityMob` ждёт поле в типе, а `ClientBottomSheet` передаёт свой `client` через spread

**Затронутые файлы:**
- `src/components/ui/TrinityMob.tsx` — тип + i18n (3 locale) + JSX-блок языка
- `src/components/clients/ClientBottomSheet.tsx` — тип client в props

**Безопасность:**
- `preferred_languages` уже приходит в `client`-объекте из `/api/clients/summary` (добавлено в `5df8dd8`)
- RLS не тронута, новые endpoint-ы не добавлены, SELECT не расширен

**Регрессия:**
- На старых клиентах поле отсутствует → блок не рендерится (guard `Array.isArray && length > 0`)
- На новых клиентах с дефолтом `['he']` → виден бэдж 🇮🇱 עברית
- Свайп-шторка действий (`drawerOpen`) не затронута — изменения только в левой «main panel»
- Темизация (Command Center / Editorial Luxury / Neon Industrial / Warm Organic) — использованы те же `rgba(255,255,255,X)` что и окружающие строки, темы работают без изменений

**Проверено:**
- `npm run build` — чистый, exit 0, 237 страниц
- Блок условный → не ломает отображение клиентов без языка
- Мобильная локаль `he` и `ru` — оба ключа `language` добавлены корректно

**Итог по многоязычности (вся серия коммитов):**
Теперь язык виден во ВСЕХ точках взаимодействия с клиентом:
- ✅ Создание (AddClientDialog) — чекбоксы
- ✅ Редактирование (EditClientSheet) — чекбоксы, используется на desktop + mobile edit
- ✅ Просмотр на desktop (ClientDetailsModal) — бэджи в блоке «Информация»
- ✅ Просмотр на PWA/mobile (TrinityMob) — бэджи в блоке «Info»
- ✅ Автоматический выбор языка в WhatsApp-триггерах (fireWaTrigger + cron)

**Коммит:** будет проставлен после push.


---

## 🔧 2026-04-20 — Обновление демо Бориса (Israstar)

### Контекст
Борис сообщил, что открывает демо и "всё в иероглифах" — оказалось, что он заходил на apex-домен `ambersol.co.il` (без `www`), который указывает на старый Vercel-проект и отдаёт 404 Trinity ("הדף לא נמצא" на иврите). Демо живёт только на `www.ambersol.co.il` (единственный продакшн-домен проекта `trinity` в Vercel).

Параллельно выяснилось, что в `public/demo-boris.html` остались старые цены (BASE ₪249 + PRO ₪499), хотя с Борисом договорились на промежуточный тариф "Старт с ИИ" **₪349/мес**.

### Что изменено в `public/demo-boris.html`
1. **Pricing grid** — вместо 2 карточек (BASE ₪249 + PRO ₪499) теперь **одна карточка "Старт с ИИ" ₪349/мес**, персонально для Israstar. WhatsApp ИИ-парсер включён с лимитом **1 000 сообщений/мес**. Внизу карточки — короткое примечание, что PRO (безлимит) обсуждается отдельно при росте объёмов.
2. **Комбо-блок** (Система + сайт) пересчитан: Старт ₪349 + сайт от ₪3000 в рассрочку = **₪499/мес** (раньше было PRO ₪499 + сайт = ₪649/мес).
3. **Special offer в конце** — убран устаревший пункт "₪149 первые 3 месяца" (был от старой ценовой политики). Вместо него — гибкий график оплат под сезонность туризма, поддержка 24/7, персональная настройка парсера.
4. **Мелочи:** `Администратор · RadioGuide` → `Администратор · Israstar` в футере сайдбара, `Реальные данные RadioGuide` → `Реальные данные Israstar` в подзаголовке календаря.

### Открытая проблема: apex-домен
`ambersol.co.il` (без `www`) указывает на Vercel IP `216.198.79.1`, который НЕ привязан к проекту `trinity` (team `team_LMjQcFhJbvsscDS6v1qU2If9`). Единственный настроенный продакшн-домен — `www.ambersol.co.il`. Нужно в Vercel Dashboard добавить `ambersol.co.il` к проекту и включить apex → www редирект. До этого момента Борису слать ссылку **только с `www`**: `https://www.ambersol.co.il/demo/boris` или `/demo-boris.html`.

### Файлы
- `public/demo-boris.html` — изменён

### Коммит
TBD (будет подставлен после push)


---

## 🔧 2026-04-20 (part 2) — Demo Boris: language codes + WA CTA

### Changes
1. **Язык-фичу** в pricing-карточке `Старт с ИИ`: флаги `🇮🇱 / 🇷🇺 / 🇬🇧` заменены на текстовые коды `HEB / RUS / ENG` — Борис попросил, чтобы не было двусмысленности с флагами.
2. **Кнопка "Начать работу"** в special-offer блоке внизу страницы «Условия» превращена из `<button>` в `<a href="https://wa.me/972544858586?text=...">`. Предзаполненный текст (URL-encoded): «Привет Влад, я посмотрел демо Trinity для Israstar — готов начать работу». `target="_blank" rel="noopener"` — безопасное открытие в новой вкладке.

### Files
- `public/demo-boris.html` — 2 правки через Desktop Commander `edit_block`

### Verification
- Локальная проверка файла (107 717 chars): `HEB / RUS / ENG` найдено, `wa.me/972544858586` найдено, старого `<button>Начать работу</button>` нет.

### Commit
`764ad90e8ba40b73c3b280979a26f9a3a2c76cc5` — deployment `dpl_5EriEVm1cujs6TNX7pN1qUEFku52`



---

## 🔔 2026-04-20 — Push Notifications I18N v2

### Контекст
Push-уведомления приходили всегда на иврите, независимо от выбранного пользователем языка интерфейса. Задача: язык push должен соответствовать `preferred_language` пользователя в `org_users`.

### Архитектурное решение
**Серверная шаблонизация per-user.** API routes не передают готовые `title/body`, а передают `template: { key, vars }`. Edge Function `send-notification` для каждого получателя читает `org_users.preferred_language` и рендерит локализованный payload в его языке.

**Почему так:**
1. Язык всегда актуальный — сменил язык → следующий push уже на новом (не зависит от момента подписки)
2. Один шаблон для всех языков — нет дублирования, нет рассинхрона
3. 3-й язык (en) добавится одной правкой словаря `TEMPLATES`
4. Fallback: `org_users.preferred_language` → `organizations.primary_language` → `'ru'`

### Поток данных
```
API route (visits/payments/clients/beautymania)
  └─► dispatchNotification({ event_type, org_id, template: { key, vars } })
        └─► Edge Function send-notification
              ├─► notification_preferences (кто в какой канал)
              ├─► organizations.primary_language (fallback locale)
              ├─► org_users.preferred_language (per-user locale, батчем)
              ├─► TEMPLATES[key][locale] → interpolate(vars)
              ├─► Telegram (org-level, orgDefaultLocale)
              └─► Web Push (per-user, своя локаль)
```

### Файлы
| Файл | Что изменено |
|---|---|
| `supabase/functions/send-notification/index.ts` | Полностью переписан: словарь `TEMPLATES` (10 событий × ru/he), per-user рендер title/body, локализованная ссылка Telegram. 461 строк. |
| `src/lib/dispatch-notification.ts` | Новый API `template: { key, vars }` + обратная совместимость с legacy `payload: { title, body }` |
| `src/app/api/visits/route.ts` | Убран хардкод `'📅 ביקור נוצר'`, передаёт `template: { key: 'new_visit', vars: { time, service } }`. Время форматируется нейтрально `HH:mm` в tz `Asia/Jerusalem`. |
| `src/app/api/payments/route.ts` | `template: { key: 'new_payment', vars: { amount, method } }` |
| `src/app/api/clients/route.ts` | `template: { key: 'new_client', vars: { name } }` |
| `src/app/api/beautymania/order/route.ts` | `template: { key: 'new_order', vars: { product, qty, total } }` |
| `src/components/PushNotificationPrompt.tsx` | Локализован через `useLanguage()`, убран хардкод `dir="rtl"` и ивритских строк. Локальный словарь `I18N = { he, ru }` для 10 строк компонента. |

### Словарь шаблонов (`TEMPLATES` в Edge Function)
Поддерживаемые события с ru+he переводами:
- `new_visit` — Новый визит / ביקור נוצר
- `visit_reminder` — Напоминание о визите / תזכורת לביקור
- `new_payment` — Новый платёж / תשלום חדש
- `new_client` — Новый клиент / לקוח חדש
- `new_order` — Новый заказ с сайта / הזמנה חדשה מהאתר
- `stock_alerts` — Низкий остаток / מלאי נמוך
- `task_mentions` — Вас упомянули / הוזכרת במשימה
- `birthday` — День рождения / יום הולדת
- `ai_fallback` — Кира просит помощи / קירה מבקשת עזרה
- `security_login` — Новый вход / כניסה חדשה

Все title/body поддерживают подстановку переменных вида `{name}` через `interpolate()`.

### Обратная совместимость
Legacy-вызовы `dispatchNotification({ payload: { title, body, url } })` продолжают работать — Edge Function использует готовые строки если `template` не передан. Это нужно для `cron/push-events`, `cron/reminders`, `cron/birthdays`, `cron/push-dispatch`, `ai_fallback` и прочих мест, которые ещё не мигрированы на шаблоны.

### Источник истины языка
`org_users.preferred_language` (`'he' | 'ru'`, дефолт `'ru'`) — синхронизируется с cookie `trinity_locale` и localStorage через `setLanguage()` в `LanguageContext.tsx`. Пользователь сменил язык в UI → `updateUserPreferences()` server action → следующий push приходит в новом языке.

### Service Worker
`src/sw.ts` не менялся — уже принимает `{title, body, data.url}` и рендерит нативное уведомление. Вся локализация живёт на сервере.

### Safety / Regression
- Перед деплоем на prod: **сначала** задеплоить Edge Function (`npx supabase functions deploy send-notification --project-ref tjryzcqvsavtllahjyrj`), **потом** `git push`. Иначе новые API routes будут слать `template` в старую функцию, и push перестанут доходить до задеплоя новой версии.
- RLS не тронута, auth не менялась, `org_id` берётся из `getAuthContext()` как раньше
- `push_subscriptions` схема не менялась — локаль берётся live из `org_users`

### Verification
- `npm run build` — чистый, 0 ошибок TS, 237 страниц
- Визуальная проверка: Prompt на ru показывает «Включить уведомления / Разрешить», на he — «הפעל התראות / אפשר»

### Commit
`02eef5d` — push i18n v2 + JWT role-based auth (Apr 20, 2026)

---

## 🚨 2026-04-20 — КРИТИЧНЫЙ ФИКС: Push-уведомления не работали (неправильная опция next-pwa)

### Симптом
Push-уведомления **никогда не приходили** в продакшене, несмотря на полностью настроенный backend (cron `push-dispatch` работал, `sent_last_24h = 3` уведомления проходили через очередь как «отправленные»).

В БД: `push_subscriptions.count = 0` — **ни одной активной подписки за всё время**.

### Root cause
В `next.config.js` использовалась опция **`swSrc: 'src/sw.ts'`**. Это API **старого** `next-pwa` (от shadowwalker). В Trinity стоит **`@ducanh2912/next-pwa@10.2.9`** — форк с другим API.

Плагин **молча игнорировал** `swSrc` (свойство даже не читается из конфига) и каждый раз генерировал **дефолтный Workbox SW без push-обработчиков**. Любая подписка через `pushManager.subscribe()` создавалась в браузере, POST `/api/push/subscribe` мог даже отработать — но при приходе push Chrome не находил хендлер в SW и просто игнорировал событие. Уведомления никогда не всплывали.

Дополнительно: поскольку пользователь не видел ни одного уведомления после «разрешить», баннер отписывался (либо пользователь блокировал permissions) — и подписки не сохранялись.

### Как найдено
1. Проверил `public/sw.js` — в сгенерированном SW не оказалось `addEventListener('push')`
2. Посмотрел `package.json` → `@ducanh2912/next-pwa` ≠ `next-pwa`
3. Прочитал `node_modules/@ducanh2912/next-pwa/dist/index.d.ts` → нет опции `swSrc`, есть только `customWorkerSrc`
4. Прочитал `dist/index.cjs:868-882` (`buildCustomWorker`) → логика: ищет `{src/,}index.{ts,js}` внутри `customWorkerSrc`, резолвит относительно корня проекта

### Решение
1. **Создан `src/worker/index.ts`** (141 строка) — кастомный worker с тремя обработчиками:
   - `push` — показ уведомления (title, body, icon, badge, tag, url, actions, requireInteraction, silent)
   - `notificationclick` — фокус существующей вкладки по pathname или открытие новой через `clients.openWindow`
   - `pushsubscriptionchange` — при ротации endpoint браузером автоматически переподписывается и шлёт `postMessage({type: 'TRINITY_PUSH_RESUBSCRIBED', subscription})` в клиенты

2. **`next.config.js`**: удалена `swSrc`, добавлена `customWorkerSrc: 'src/worker'`. Путь — от корня проекта (плагин сам это резолвит: `path.join(p.dir, E)`).

3. **Удалён** неиспользуемый `src/sw.ts` (он был проигнорирован плагином и никогда не попадал в билд)

### Как работает теперь (архитектура)
- **`public/sw.js`** ← GenerateSW от workbox (precache `_next/static/*`, runtime caching для API/pages)
- **`public/worker-<hash>.js`** ← наш `src/worker/index.ts`, скомпилированный через ChildCompilation
- В `public/sw.js` автоматически инжектится `importScripts("/worker-<hash>.js")` — поэтому обработчики загружаются **внутри основного SW-контекста** (это важно: Chrome ищет listener в том SW, который зарегистрирован на scope `/`)

### Верификация билда
```
✓ (pwa) Found a custom worker implementation at F:\...\src\worker\index.ts.
✓ (pwa) Building the custom worker to F:\...\public\worker-b140e5290fbf8181.js...
✓ Compiled successfully in 73s
```
- `public/sw.js` содержит `importScripts("/worker-b140e5290fbf8181.js")`
- `public/worker-b140e5290fbf8181.js` (1398 байт) содержит все три `addEventListener`
- Precache-манифест в `sw.js` включает `{url:"/worker-b140e5290fbf8181.js"...}` — файл доступен офлайн

### Что дальше (после деплоя)
1. Старый SW уже у всех в браузерах — при следующем визите `useServiceWorker` обнаружит `updatefound`, поставит новый в waiting, переключит при смене вкладки/через 60 сек (страховка)
2. После активации нового SW: `controllerchange` → reload страницы → `PushNotificationPrompt` пересчитает состояние → пользователь заново увидит баннер «Включить уведомления»
3. После «Разрешить» → `pushManager.subscribe()` → POST `/api/push/subscribe` → запись в `push_subscriptions`
4. Cron `push-dispatch` (каждую минуту) при следующем уведомлении найдёт подписку и отправит push **который теперь реально дойдёт и всплывёт**

### Затронутые файлы
- `src/worker/index.ts` — **создан** (141 строка)
- `next.config.js` — `swSrc` → `customWorkerSrc: 'src/worker'`
- `src/sw.ts` — **удалён** (был неактивным кодом)
- `public/sw.js` + `public/worker-b140e5290fbf8181.js` — пересобраны в билде

### Регрессия
Нет. Вся остальная часть SW (workbox precache, runtime caching для fonts/images/API/pages) генерируется тем же `GenerateSW` плагином и не изменилась — сравнение `sw.js` до/после показало только добавление одной строки `importScripts("/worker-...")` и добавление worker-файла в precache-манифест.

### Безопасность
- VAPID ключи не менялись (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` из `.env.local`, сгенерированы 2025-03-16)
- RLS на `push_subscriptions` не менялся
- `getAuthContext(request)` защищает `/api/push/subscribe` и `/api/push/send` — подписка привязывается к `auth.uid` + `org_id` из активной сессии
- `pg_cron` job `push-dispatch` использует `Authorization: Bearer <CRON_SECRET>` — эндпоинт проверяет этот заголовок

### Commit
`4724723` — fix(push): switch swSrc to customWorkerSrc for @ducanh2912/next-pwa (Apr 20, 2026)

### Верификация в продакшене
```
GET https://www.ambersol.co.il/sw.js             → 200, 61934 bytes, importScripts("/worker-b140e5290fbf8181.js") ✓
GET https://www.ambersol.co.il/worker-b140e5290fbf8181.js → 200, 1398 bytes
  addEventListener("push")                       → ✓
  addEventListener("notificationclick")          → ✓
  addEventListener("pushsubscriptionchange")     → ✓
```
Vercel deployment: `dpl_4bDFbTahShtv36JibedASeN9QJFi` (state: READY, production)

---

## fix: PDF-сводка платежей — футер и фильтрация (21 Apr 2026)

### Что изменено
**Проблема 1 — Футер обрезал текст в PDF.**
jsPDF не поддерживает иврит/кириллицу без встроенных шрифтов. Текст `orgName`, `contacts` в нижней полосе рендерился как пустота или обрезался.

**Решение:** Футер перенесён прямо в HTML-шаблон (`payment-report-html.ts`) — рендерится через `html2canvas` с font-family Heebo, все символы корректны. Параметр `hasHTMLFooter: true` передаётся в `downloadRaw` → jsPDF-футер для этого отчёта не рисуется, высота контента = полная страница A4.

**Проблема 2 — Проверка фильтрации.**
API `/api/payments` принимает `startDate`/`endDate` → фильтрует по `paid_at`. Способы оплаты фильтруются на клиенте через `normalizePaymentMethod`. Логика верная — данные корректно соответствуют выбранным датам и методам.

### Затронутые файлы
- `src/lib/pdf/payment-report-html.ts` — добавлен HTML-блок футера с `orgName`, контактами, номером документа
- `src/lib/pdf/use-generate-pdf.ts` — добавлен параметр `hasHTMLFooter?: boolean` в `downloadRaw`, при `true` — jsPDF-футер пропускается, `CONTENT_H_MM = PAGE_H_MM`
- `src/components/payments/PaymentReportModal.tsx` — вызов `downloadRaw` передаёт `hasHTMLFooter = true`

### Регрессия
Нет. `downloadRaw` с `hasHTMLFooter = false` (по умолчанию) работает как прежде — jsPDF-футер рисуется для других отчётов.

### Безопасность
Защищено — `getAuthContext()`, `org_id` из БД, RLS включён.

### Commit
`fef4d50` — fix: payment report footer in HTML correct fonts for Hebrew/Cyrillic (Apr 21, 2026)

---

## feat: Завершённые визиты — показываются по умолчанию + тумблер в Settings (23 Apr 2026)

### Что изменено

**Проблема:** Завершённые визиты не отображались в календаре (CalendarView жёстко фильтровал только `scheduled` и `in_progress`). В списке секция завершённых рендерилась всегда, но тумблер на странице визитов сохранялся в два разных localStorage ключа (user-specific и общий) — Settings не синхронизировался.

**Решение:**
1. `CalendarView.tsx` — добавлен prop `showCompleted?: boolean` (default `true`). Фильтр `activeVisits` теперь включает `completed` визиты при `showCompleted=true`.
2. `visits/page.tsx` — prop `showCompleted` передаётся в `CalendarView`. Desktop таблица и mobile карточки секции "Завершённые" обёрнуты в `{showCompleted && ...}`. localStorage унифицирован: единственный ключ `trinity_visits_show_completed`. Старый user-specific ключ мигрируется автоматически при первом входе.
3. `settings/display/page.tsx` — добавлен блок "Отображение завершённых визитов" с toggle-pill кнопкой. Иконки `Eye`/`EyeOff` из lucide-react. Сохраняет в общий ключ `trinity_visits_show_completed`.

**По умолчанию:** `true` — завершённые всегда видны пока пользователь не отключит.

### Затронутые файлы
- `src/components/visits/CalendarView.tsx` — prop `showCompleted`, обновлён фильтр `activeVisits`
- `src/app/(dashboard)/visits/page.tsx` — передача prop, унификация localStorage, условный рендер секций
- `src/app/(dashboard)/settings/display/page.tsx` — новый блок тумблера с Eye/EyeOff

### Регрессия
Нет. CalendarView обратно совместим (prop optional, default true).

### Безопасность
Настройка хранится только в localStorage (клиентская UI-преференция, не серверные данные).

### Commit
`54916bf` — feat: show completed visits by default, add toggle in Settings > Display (Apr 23, 2026)

---

## [Apr 24, 2026] Убрано приветствие с дашборда

### Задача
Влад попросил убрать блок приветствия ("Добрый вечер, Владислав 👋" + дата) с экрана дашборда.

### Что изменено
- `src/components/dashboard/DashboardContent.tsx` — удалён вызов `<GreetingHeader .../>` из JSX рендера. Компонент `GreetingHeader` остался в файле (локальный, не экспортируется), но больше не монтируется.
- `ActivityStrip` (три мини-карточки: визиты/задачи/доход) сохранён — убрано только приветствие.

### Регрессия
Нет. Компонент нигде не используется кроме этого вызова.

### Безопасность
Без изменений.

### Commit
`c5bddd1` — fix: remove greeting header from dashboard (Apr 24, 2026)

---

## [Apr 28, 2026] Рекуррентные платежи — завершение модуля

### Задача
Восстановить `settingsConfig.ts` после повреждения кодировкой (UTF-16LE вместо UTF-8), добавить карточку `recurring-plans` в настройки, исправить баги и задеплоить всё в production.

### Что было сломано
- `settingsConfig.ts` был перезаписан в UTF-16LE предыдущей PowerShell-сессией → `stream did not contain valid UTF-8` в webpack.
- `useFeatures.ts`: в fallback-ветке (org без `modules`) обращение к `modules.subscriptions` при `modules === undefined` → потенциальный runtime TypeError.
- `src/app/api/recurring-plans/[id]/route.ts`: `params` не обёрнут в `Promise<>` — TypeScript error в Next.js 16.

### Что исправлено
1. **`settingsConfig.ts`** — восстановлен из git HEAD (правильная UTF-8 с кириллицей/ивритом + BOM), затем добавлена карточка `recurring-plans` с `RefreshCw` иконкой и `featureFlag: 'recurringEnabled'`.
2. **`useFeatures.ts`** — в последнем fallback-return: `recurringEnabled: false` (вместо `modules.subscriptions === true` при `undefined`).
3. **`recurring-plans/[id]/route.ts`** — PATCH и DELETE переведены на `params: Promise<{ id: string }>` + `await params`.

### Новые файлы/модули (рекуррентные платежи)
- `src/app/(dashboard)/settings/recurring-plans/page.tsx` — страница управления планами подписок (CRUD: создать, редактировать, удалить). Фильтруется по `featureFlag: recurringEnabled`.
- `src/app/api/recurring-plans/route.ts` — GET (список планов org), POST (создать план). Таблица `recurring_plans`.
- `src/app/api/recurring-plans/[id]/route.ts` — PATCH (обновить), DELETE (удалить). Изолировано по `org_id`.
- `src/app/api/payments/charge-recurring/route.ts` — POST ручного списания по токену карты через Tranzila CGI (`secure5.tranzila.com`). Пишет в `subscription_charges`, обновляет `next_billing_date`.
- `src/components/clients/ClientDesktopPanel.tsx` — вкладка "Рекурр." в панели клиента: привязка карты (Tranzila iframe), оформление подписки, "Списать сейчас", пауза/возобновление, отмена, история списаний.

### Архитектура рекуррентных платежей
- `recurring_plans` — шаблоны планов org (name, price, billing_cycle, custom_days)
- `client_subscriptions` — подписка клиента на план (card_token, expdate, next_billing_date, status)
- `subscription_charges` — лог каждого списания (success/failed, tranzila_transaction_id)
- Карта привязывается через Tranzila `tranmode=VK` iframe → callback → `clients.card_token` + `card_last4`
- Ручное списание: `POST /api/payments/charge-recurring` → Tranzila CGI → запись в charges → update next_billing_date
- Feature gate: `recurringEnabled = modules.subscriptions === true` в useFeatures (только для org с modules)

### Регрессия
Нет. Всё новое; fallback-фикс в useFeatures только устраняет потенциальный crash.

### Безопасность
Все API через `checkAuthAndFeature`, `org_id` из БД, RLS включён. `card_token` хранится только в `clients`, передаётся только server-to-server в Tranzila.

### Затронутые файлы
- `src/components/settings/settingsConfig.ts`
- `src/hooks/useFeatures.ts`
- `src/components/clients/ClientDesktopPanel.tsx`
- `src/app/(dashboard)/settings/recurring-plans/page.tsx` (новый)
- `src/app/api/recurring-plans/route.ts` (новый)
- `src/app/api/recurring-plans/[id]/route.ts` (новый)
- `src/app/api/payments/charge-recurring/route.ts` (новый)

### Commit
`3df1867` — feat(recurring): add recurring-plans settings page, charge-recurring API, fix params Promise type, fix useFeatures fallback crash (Apr 28, 2026)


---

## Рассрочка платежей (Installment Plans) — 28 апреля 2026

### Что добавлено
Новый модуль разбивки оплаты на N платежей с автоматическим списанием по токену карты Tranzila.

**Логика:**
1. Ксения выбирает "Рассрочка" в диалоге оплаты (после визита или при создании продажи)
2. Выбирает кол-во платежей (2–36) и периодичность (weekly / biweekly / monthly)
3. Первый платёж списывается немедленно по токену сохранённой карты клиента
4. Vercel Cron в 10:00 Israel time (07:00 UTC) ежедневно списывает следующие платежи по расписанию
5. После N успешных списаний план переходит в `completed`

### Файлы
- `src/lib/installments.ts` — общие helpers: `computeNextDate`, `chargeInstallment` (Tranzila CGI)
- `src/app/api/installments/route.ts` — GET (список планов) + POST (создать план + первое списание)
- `src/app/api/installments/[id]/route.ts` — PATCH (статус) + DELETE (отмена)
- `src/app/api/cron/charge-installments/route.ts` — Vercel Cron ежедневного списания
- `src/components/payments/InstallmentForm.tsx` — UI выбора кол-ва платежей и периодичности
- `src/components/payments/UnifiedPaymentDialog.tsx` — добавлен метод `installment` + step `installment-form`
- `src/app/api/clients/[id]/route.ts` — GET теперь возвращает `tranzila_token`, `tranzila_expdate`, `card_last4`
- `vercel.json` — добавлен cron `0 7 * * *` для `/api/cron/charge-installments`
- `supabase/migrations/20260428_installment_plans.sql` — таблицы `payment_installments` + `installment_charges` с RLS

### Схема БД
- `payment_installments` — план рассрочки (org_id, client_id, visit_id?, sale_id?, total_amount, installment_amount, installments_count, installments_paid, frequency, next_due_date, status, tranzila_token, tranzila_expdate)
- `installment_charges` — лог каждого списания (installment_plan_id, installment_number, status, tranzila_doc_id, error_message)

### Безопасность
`org_id` из `getAuthContext()`, ownership check клиента и визита/продажи, RLS на обеих таблицах. Tranzila токен передаётся только server-to-server.

### Commit
`9cc8cea` — feat:installment-plans (Apr 28, 2026)

---

## Fix: поиск услуг в AddServiceDialog (Apr 29, 2026)

### Проблема
В модальном окне "Добавить услугу" (маршрут: Визиты → Новый визит → Добавить позицию → Услуги) поиск при вводе не показывал результаты.

### Причины
1. **Двуязычная фильтрация сломана** — при `language !== 'he'` брался `name_ru || name`, но если `name_ru` пустой → ивритская строка → русский запрос никогда не матчил.
2. **Unicode bidi-маркеры** — браузер добавляет невидимые символы направления (`\u200F`, `\u202B` и др.) в ивритский текст. `"שלום".includes("שלום")` возвращал `false` при несовпадении маркеров.
3. **Input без `dir`/`lang`** — браузер некорректно обрабатывал RTL-ввод.
4. **Нет debounce** — каждый символ перефильтровывал список синхронно.
5. **Пустой fallback** — при отсутствии результатов юзер видел пустоту без объяснений.

### Решение
- `normalizeForSearch()` — очищает bidi-маркеры + trim + toLowerCase перед сравнением
- Поиск по **обоим полям** (`name` и `name_ru`) независимо от языка интерфейса
- `useDebounce(searchQuery, 200)` + `useMemo` для оптимизации
- `dir={dir}` и `lang` на `<Input>`, динамическая позиция иконки поиска
- Явный fallback с текстом запроса: "Услуги по запросу «X» не найдены"

### Файлы
- `src/components/visits/AddServiceDialog.tsx`

### Commit
`e667c05` — fix: search in AddServiceDialog (Apr 29, 2026)

---

## Fix: белый экран / старый дизайн в инкогнито (Apr 29, 2026)

### Проблемы
1. **Белый экран с вечной загрузкой** в основном браузере — залипший Service Worker держал устаревший кеш и блокировал загрузку новой версии.
2. **Старый дизайн в инкогнито** — Vercel Edge кешировал HTML страницы и отдавал устаревшую версию анонимным пользователям.

### Причина проблемы 2
В `next.config.js` не было `Cache-Control` заголовка для HTML маршрутов. Vercel Edge по умолчанию мог кешировать ответы SSR без кук. При заходе в инкогнито пользователь получал закешированный старый HTML.

### Решение
Добавлен `Cache-Control: no-store, no-cache, must-revalidate` + `Pragma: no-cache` для всех HTML маршрутов (исключая `_next/*`, `api/*`, файлы со статическим расширением).

Паттерн: `source: '/((?!_next|api|.*\\..*$).*)'`

### Решение проблемы 1 (на стороне пользователя)
- DevTools → Application → Service Workers → Unregister
- Или `chrome://serviceworker-internals/` → Unregister для ambersol.co.il

### Файлы
- `next.config.js` — добавлен блок headers для HTML страниц

### Commit
`8f33186` — fix: no-store Cache-Control for HTML pages (Apr 29, 2026)

---

## Fix: лендинг показывал старый дизайн — hydration mismatch #418 (Apr 30, 2026)

### Проблема
`/landing` показывал старый светлый дизайн Trinity вместо нового тёмного. Сервер отдавал правильный HTML (`<html lang="ru" dir="ltr">`), но React на клиенте при гидрации применял Trinity-атрибуты (`lang="he" dir="rtl" class="light"`), вызывая ошибку hydration mismatch #418.

### Причина
Root `layout.tsx` определял `isLanding` через `headers()` — это работает только при SSR. При гидрации React не имел доступа к этой информации и пытался применить стандартную ветку layout. Два разных HTML-дерева (сервер vs клиент) = #418. `suppressHydrationWarning` подавлял предупреждение, но не исправлял DOM.

Предыдущий костыль (`useEffect` DOM-патч в `page.tsx`) работал только после гидрации — пользователь видел мигание старого дизайна перед исправлением.

### Решение
Перенос `/landing` в route group `(marketing)` с собственным независимым layout:

```
src/app/(marketing)/
  layout.tsx          ← <html lang="ru" dir="ltr"> — жёстко, для всех marketing-страниц
  landing/
    layout.tsx        ← force-dynamic + revalidate=0
    page.tsx          ← убран DOM-патч из useEffect, убран CSS-override блок
  pricing/
    page.tsx          ← унаследует (marketing)/layout.tsx
```

Next.js App Router использует **отдельное HTML-дерево для каждого route group**. Гидрация совпадает 100% — сервер и клиент оба получают `(marketing)/layout.tsx`, никаких headers() не нужно.

Root `layout.tsx` упрощён: убран `isLanding` блок, убран импорт `headers`.

### Файлы
- `src/app/(marketing)/layout.tsx` — создан (новый HTML-контекст для лендинга)
- `src/app/(marketing)/landing/layout.tsx` — создан (force-dynamic)
- `src/app/(marketing)/landing/page.tsx` — перемещён из `src/app/landing/`, убран DOM-патч
- `src/app/landing/` — удалён
- `src/app/layout.tsx` — убран isLanding блок и импорт headers

### Commit
`2b9b60d` — fix: landing hydration mismatch via marketing route group (Apr 30, 2026)

## [Apr 30, 2026] Impersonation fix — HttpOnly cookie через Server Action

### Проблема
При нажатии "Войти как пользователь" данные (услуги, платежи, клиенты, товары) не переключались.
Корень: `handleImpersonate` в `admin/page.tsx` никогда не устанавливал HttpOnly куку `impersonate_org_id`.
Вместо этого писал в `user_active_branch` (set-active-org) + клиентский cookie + localStorage.
`getAuthContext()` на сервере ищет только HttpOnly куку — её не было → orgId оставался суперадминовским.

### Архитектура (правильная)
1. `startImpersonation(orgId, token)` — Server Action (src/actions/impersonation.ts)
   - Проверяет token → isAdmin → SUPER_ADMINS
   - Пишет audit_log
   - Устанавливает HttpOnly куки: `impersonate_org_id` + `impersonate_org_name` (8ч)
2. `getAuthContext()` — читает куку, подменяет orgId для ВСЕХ API роутов
3. `ImpersonationBanner` — читает /api/admin/impersonation-state (HttpOnly-safe)
4. `stopImpersonation()` — Server Action, удаляет куки + redirect /admin

### Что исправлено
- `src/app/admin/page.tsx`: `handleImpersonate` теперь вызывает `startImpersonation()` вместо 5-шагового flow с localStorage/set-active-org. Убраны fetch к /api/admin/impersonate, /api/admin/set-active-org, document.cookie хак, localStorage записи.
- `src/hooks/useIsImpersonating.ts`: переключён с localStorage на /api/admin/impersonation-state — теперь синхронизирован с реальным HttpOnly состоянием.

### Файлы
- `src/app/admin/page.tsx` — handleImpersonate упрощён до 3 строк
- `src/hooks/useIsImpersonating.ts` — убран localStorage, читает API
- (не изменялись) `src/actions/impersonation.ts`, `src/lib/auth-helpers.ts`, `src/components/admin/ImpersonationBanner.tsx`

### Безопасность
- Только `is_admin=true` в JWT + email в SUPER_ADMINS
- HttpOnly кука — клиент не может подделать
- Audit log при каждом входе под пользователем

### Commit
`2452631` — fix_impersonation (Apr 30, 2026)
## [Apr 30, 2026] Impersonation fix #2 — убран несуществующий столбец display_name

### Проблема
Ошибка `column organizations.display_name does not exist` — в таблице `organizations` нет поля `display_name`, оно было добавлено в SELECT по ошибке.

### Исправление
`src/actions/impersonation.ts` — SELECT изменён с `id, name, display_name` на просто `id, name`. Имя организации берётся из `org.name`.

### Commit
`cd23556` — fix_display_name_column (Apr 30, 2026)
## [Apr 30, 2026] Impersonation fix #3 — service role клиент для данных при impersonation

### Проблема
В режиме impersonation баннер показывался корректно (кука работала), но данные (услуги, клиенты, платежи) не отображались. Например при создании визита — "Ничего не найдено" в выборе услуги.

### Причина
`getAuthContext()` при impersonation возвращал `supabase` = anon клиент с сессией суперадмина. RLS в Supabase работает по `auth.uid()`. Суперадмин не состоит в `org_users` клиентской организации → RLS блокировал все запросы к `services`, `clients`, `payments` и другим таблицам, даже при правильном `orgId`.

### Исправление
`src/lib/auth-helpers.ts` — при активной impersonation сессии возвращается `createSupabaseServiceClient()` вместо anon клиента. Service role обходит RLS полностью. Изоляция данных обеспечивается фильтром `.eq('org_id', orgId)` в каждом API route — как и всегда.

### Безопасность
Service role используется только при `isAdmin = true` + наличии HttpOnly куки `impersonate_org_id`. Обычные пользователи продолжают работать через anon клиент с RLS. Фильтрация по `org_id` обязательна в каждом route.

### Файлы
- `src/lib/auth-helpers.ts` — блок Safe Impersonation: supabase → serviceClient

### Commit
`957c622` — fix_impersonation_service_role_client (Apr 30, 2026)
## [Apr 30, 2026] Fix: поиск услуг по-ивритски в AddServiceDialog

### Проблема
У Ксении (Hair Rehab) услуги названы на иврите. При вводе ивритского текста в строке поиска (добавить позицию в визит) — услуги не находились. Воспроизводилось как на мобильном, так и на ПК.

### Причины (три):
1. **Никкуд (огласовки)** — Unicode U+0591–U+05C7. Если в БД название без огласовок, а клавиатура вставила с огласовками (или наоборот) — `includes()` не совпадает. `normalizeForSearch` стрипала только bidi-маркеры, но не никкуд.
2. **IME composition (мобильный)** — мобильный браузер при вводе иврита/арабского работает через IME: `onChange` срабатывает с промежуточными символами до завершения слова. Debounce перехватывал незаконченный ввод → поиск по мусору.
3. **Атрибут `lang`** — `lang="he"` на `<Input>` мог мешать некоторым мобильным IME корректно завершать ввод.

### Исправление (`AddServiceDialog.tsx`)
- `normalizeForSearch` — добавлен `.replace(/[\u0591-\u05C7]/g, '')` для стрипинга никкуда
- Добавлен `useRef(false)` флаг `isComposing`
- `onChange` — обновляет state только если `!isComposing.current`
- `onCompositionStart` — ставит флаг `true`
- `onCompositionEnd` — сбрасывает флаг, обновляет state финальным значением из события
- Удалён атрибут `lang` с инпута

### Файлы
- `src/components/visits/AddServiceDialog.tsx`

### Commit
`0e04099` — fix: service search Hebrew IME nikud (Apr 30, 2026)

## [Apr 30, 2026] Fix: impersonation — язык из org целевого клиента

### Проблема
При входе «как пользователь» (режим просмотра за клиента) система отображалась на языке суперадмина (русский), даже если у клиента (например, Ксении) установлен иврит.

### Причина
`getUserPreferences()` в `user-preferences.ts` читала язык по `user_id` суперадмина из cookies — а не из профиля org целевого клиента. Impersonation работает через куку `impersonate_org_id` без смены Supabase-сессии.

### Исправление (`src/actions/user-preferences.ts`)
- `getUserPreferences()` теперь первым делом проверяет куку `impersonate_org_id`
- Если impersonation активен — читает `theme` и `preferred_language` из `org_users` WHERE `org_id = impersonateOrgId AND role = 'owner'`
- Fallback при пустой записи: `preferred_language = 'he'` (большинство клиентов)
- Обычный путь (не impersonation) не затронут

### Файлы
- `src/actions/user-preferences.ts`

### Commit
`0d7c7f2` — fix-impersonation-language (Apr 30, 2026)

---

## [Apr 30, 2026] Fix: поиск услуг в ItemPickerSheet (הוסף פריט → שירות)

### Проблема
При создании визита → «הוסף פריט» → «שירות» — при вводе ивритского текста в строке поиска услуги не отображались ("לא נמצא"). Баг был в компоненте `ItemPickerSheet`, не в `AddServiceDialog`.

### Причина
Фильтрация в `ItemPickerSheet` искала только по `name_ru || name` — при ивритском интерфейсе брался `name_ru` (русское имя), а пользователь вводил иврит. Совпадений не было. Также не было нормализации никкуда и bidi-маркеров.

### Исправление (`ItemPickerSheet.tsx`)
- Добавлена `normalizeForSearch()` — удаляет bidi-маркеры (U+200E/F, U+202A-E, U+2066-9), никкуд (U+0591-U+05C7), trim, toLowerCase
- `filteredSvc` теперь ищет по обоим полям: `s.name` (иврит) И `s.name_ru` (русский)
- Поиск работает на любом языке интерфейса

### Файлы
- `src/components/shared/ItemPickerSheet.tsx`

### Commit
`1fbeaba` — fix: ItemPickerSheet service search he+ru both fields nikud normalization (Apr 30, 2026)


---

## [Apr 30, 2026] Fix: окно создания визита — длительность

### Изменения
1. **Убрана длительность из ServicePicker** — в выпадающем списке услуг больше не отображается время (только цена ₪). Длительность услуги была избыточной информацией при выборе.

2. **Поле ручного ввода длительности** — в окне создания визита (create-режим, блок позиций) добавлено необязательное поле «Длительность (мин)» / «משך (דקות)»:
   - Тип: `number`, мин 1, макс 600
   - По умолчанию пустое → визит создаётся с длительностью 60 мин (или авто из корзины услуг)
   - При заполнении → введённое значение overrides авто-длительность из корзины
   - State: `durationOverride: number | null` — сбрасывается при каждом открытии диалога

### Логика submit
```
duration = durationOverride !== null
  ? durationOverride
  : (cartDuration > 0 ? cartDuration : 60)
```

### Файлы
- `src/components/visits/UnifiedVisitDialog.tsx`

### Commit
`cbc3038` — fix: visit dialog duration field (Apr 30, 2026)

---

## [Apr 30, 2026] Fix: двойной учёт суммы корзины + double-tap на iPad при создании визита

### Проблема
При создании визита через мульти-корзину (UnifiedVisitDialog):
1. **Сумма задваивалась** — в UI итог показывал visits.price + visit_services суммарно, хотя visits.price уже содержала весь cartTotal
2. **Дублирование услуг** — на iPad при выборе услуги в ItemPickerSheet тап срабатывал дважды, добавляя одну и ту же услугу в корзину двумя строками

### Причина бага 1 (критический)
В `UnifiedVisitDialog.tsx` в `createPayload`:
```tsx
// БЫЛО (неправильно):
price: String(cartTotal),  // вся корзина — visits.price хранила сумму ВСЕХ позиций
```
Затем доп. позиции (restItems) писались в `visit_services` и при отображении суммировались поверх `visits.price`. Итог удваивался.

### Причина бага 2 (iPad double-tap)
В `ItemPickerSheet.tsx` не было защиты от повторного клика — touch-event на iPad мог срабатывать дважды за одно касание.

### Исправления
**UnifiedVisitDialog.tsx** — `createPayload.price`:
```tsx
// СТАЛО (правильно):
price: String(firstItem!.unit_price * firstItem!.quantity),
// visits.price = только первая позиция. Остальные → visit_services.
```

**ItemPickerSheet.tsx** — добавлен флаг `isAdding`:
- `const [isAdding, setIsAdding] = useState(false)` — сбрасывается при каждом открытии (`isOpen` useEffect)
- Все кнопки выбора (service, product, custom) получили `disabled={isAdding}` и guard `if (isAdding) return`
- `setIsAdding(true)` вызывается до `onAdd()` — исключает любой повторный вызов

### Архитектурное правило (задокументировать для будущего)
`visits.price` = цена ТОЛЬКО первой (основной) позиции визита.
`visit_services[].price` = цены доп. позиций.
Итоговая сумма = visits.price + SUM(visit_services.price) — суммируется на уровне UI/запроса.
Никогда не передавать cartTotal в visits.price при наличии доп. позиций.

### Файлы
- `src/components/visits/UnifiedVisitDialog.tsx`
- `src/components/shared/ItemPickerSheet.tsx`

### Commit
`e27acca` — fix-visit-cart-price-and-double-tap (Apr 30, 2026)

---

## Баг: stopImpersonation не возвращал данные суперадмина (Apr 30, 2026)

### Симптом
После нажатия "Завершить сеанс" в режиме просмотра организации — дашборд показывал данные просматриваемой org (Beautymania), а не реальные данные суперадмина.

### Причина
`stopImpersonation()` удалял только HttpOnly-куки (`impersonate_org_id`, `impersonate_org_name`), но НЕ сбрасывал запись `user_active_branch` в БД. При следующем запросе `getActiveOrgId()` читал из `user_active_branch` org_id Beautymania. Для суперадминов проверка принадлежности к филиалу пропускается — поэтому возвращался org_id чужой организации.

### Исправление
`src/actions/impersonation.ts` — `stopImpersonation()`:
- Создаёт SSR Supabase-клиент (читает auth-сессию из cookies)
- Находит реальную org суперадмина через `org_users`
- Делает `upsert` в `user_active_branch` с реальным `org_id` перед удалением кук
- Всё обёрнуто в try/catch — при любой ошибке куки всё равно удаляются

### Файлы
- `src/actions/impersonation.ts`

### Commit
`184a75b` — fix: stopImpersonation resets user_active_branch to real org (Apr 30, 2026)

---

## Beautymania: Система бестселлеров карусели (Apr 30, 2026)

### Что сделано
Полноценная система управления каруселью "Наши бестселлеры" на beautymania.co.il через Trinity CRM.

### БД
Таблица `site_bestsellers`:
- `org_id`, `position` (1-5), `product_id` (FK→products, nullable), `custom_title`, `custom_subtitle`, `image_url`, `is_active`
- RLS: члены орга читают, owner/admin управляют
- UNIQUE(org_id, position) — upsert по позиции
- 5 пустых слотов для Beautymania созданы при миграции

### Trinity API
- `GET /api/beautymania/bestsellers` — публичный, для сайта. Возвращает только активные слоты с привязанным товаром. Нормализует: custom_title/image_url перекрывают данные товара. Cache: s-maxage=60.
- `GET /api/beautymania/admin/bestsellers` — защищённый (getAuthContext), только org Beautymania. Все 5 слотов включая пустые.
- `PUT /api/beautymania/admin/bestsellers` — upsert всех слотов по (org_id, position). Zod-валидация.

### Trinity UI
`/settings/bestsellers` — страница редактора:
- 5 слотов с выбором товара (ProductPicker: поиск, превью, цена)
- Кастомный заголовок и подпись для каждого слота
- Переключатель активности слота
- Кнопка "Сохранить и опубликовать" (активна только при изменениях)
- Кнопка "Отменить" — сброс к последнему сохранённому
- Ссылка на сайт для проверки
- Карточка в settingsConfig.ts (секция Бизнес, иконка Star)

### bm_site
Карусель полностью переписана:
- Удалён хардкод HTML-слайдов в index.html
- main.js: fetch из `BESTSELLERS_API`, динамический рендер слайдов
- **Бесконечный loop**: клон последнего слайда в начале, клон первого в конце. При попадании на клон — мгновенный прыжок на реальный слайд (без анимации). Пользователь не видит края.
- Если API вернул 0 товаров — секция скрывается
- Картинка товара из `image_url` (в будущем: кастомная загрузка)

### Файлы
- `src/app/api/beautymania/bestsellers/route.ts` (новый)
- `src/app/api/beautymania/admin/bestsellers/route.ts` (новый)
- `src/app/(dashboard)/settings/bestsellers/page.tsx` (новый)
- `src/components/settings/settingsConfig.ts` (добавлена карточка)
- `F:\Amber_solutions_Kira\bm_site\js\main.js` (карусель переписана)
- Supabase migration: `create_site_bestsellers`

### Следующий шаг
Механика загрузки картинок для карусели (Анета сама загружает фото для каждого слота через Trinity).
