# 📚 TRINITY CRM - Полная документация

**Версия:** v2.28.0  
**Дата:** 2026-02-14  
**Powered by:** Amber Solutions Systems

---

## 📋 Содержание

1. [Описание системы](#описание-системы)
2. [Архитектура](#архитектура)
3. [База данных](#база-данных)
4. [Страницы](#страницы)
5. [API Routes](#api-routes)
6. [Функционал (Features)](#функционал-features)
7. [Тарифные планы](#тарифные-планы)
8. [Интеграции](#интеграции)
9. [Текущие баги и TODO](#текущие-баги-и-todo)

---

## 🎯 Описание системы

**Trinity CRM** — мультитенантная система управления клиентами (CRM) для малого и среднего бизнеса в Израиле.

### Основные возможности:
- ✅ Управление клиентами (clients)
- ✅ Визиты и расписание (visits)
- ✅ Платежи (Tranzilla + Stripe)
- ✅ SMS-кампании
- ✅ Аналитика и отчёты
- ✅ Управление складом (inventory)
- ✅ Кастомизируемые услуги (services)
- ✅ Инструкции по уходу (care instructions)
- ✅ Мультиязычность (עברית / Русский)
- ✅ Темы и кастомизация интерфейса

### Целевая аудитория:
- Салоны красоты
- Автомойки
- Клиники
- Рестораны
- Спортзалы
- Любой сервисный бизнес

---

## 🏗️ Архитектура

### Tech Stack

| Компонент | Технология | Версия |
|-----------|------------|--------|
| **Frontend** | Next.js (App Router) | 15.x |
| **Backend** | Next.js API Routes | 15.x |
| **Database** | Supabase (PostgreSQL) | Latest |
| **Auth** | Supabase Auth (OAuth) | Latest |
| **Styling** | Tailwind CSS | 3.x |
| **UI Components** | shadcn/ui | Latest |
| **State Management** | React Query (TanStack) | 5.x |
| **Deployment** | Vercel | Latest |
| **Charts** | Recharts | 2.x |
| **PDF Generation** | jsPDF | Latest |

### Архитектурные принципы:

#### 1. Multi-tenancy
- **Уровень:** Организации (organizations)
- **Изоляция:** Row-Level Security (RLS) в Supabase
- **Связь:** org_users таблица для связи пользователей с организациями

#### 2. Аутентификация
- **Провайдер:** Google OAuth через Supabase
- **Автолинковка:** При первом входе user_id автоматически связывается с org_users
- **Роли:** owner, manager, user

#### 3. Паттерны кода
- **Client Components:** `'use client'` директива
- **Server Actions:** API Routes в `/api/*`
- **Data Fetching:** React Query hooks
- **Type Safety:** TypeScript + Supabase generated types

---

## 🗄️ База данных

### Таблицы

#### 1. `organizations` — Организации
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `name` | text | Название организации |
| `email` | text | Email организации |
| `phone` | text | Телефон |
| `category` | text | salon, carwash, clinic, restaurant, gym, other |
| `plan` | text | basic, pro, enterprise |
| `is_active` | boolean | Статус активности |
| `billing_status` | text | paid, trial, overdue, cancelled |
| `billing_due_date` | timestamp | Дата следующего платежа |
| `settings` | jsonb | Настройки (темы, цвета, serviceColors) |
| `features` | jsonb | {sms, payments, analytics, subscriptions, visits, inventory} |
| `created_at` | timestamp | Дата создания |
| `updated_at` | timestamp | Дата обновления |

**RLS:** Только пользователи организации видят свои данные

---

#### 2. `org_users` — Связь пользователей с организациями
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `org_id` | uuid | FK → organizations |
| `user_id` | uuid | FK → auth.users (может быть NULL) |
| `email` | text | Email пользователя (lowercase) |
| `role` | text | owner, manager, user |
| `avatar_url` | text | URL аватара |
| `created_at` | timestamp | Дата создания |

**Уникальные индексы:**
- `(org_id, user_id)` — один user = одна роль в org
- `(org_id, lower(email))` — один email = одна запись

**Auto-link trigger:** При signup автоматически линкует user_id по email

---

#### 3. `admin_users` — Администраторы системы
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `email` | text | Email админа |
| `full_name` | text | Полное имя |
| `role` | text | admin, moderator |
| `is_active` | boolean | Активен ли |
| `created_at` | timestamp | Дата создания |

**Доступ:** Только через API с проверкой

---

#### 4. `clients` — Клиенты
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `org_id` | uuid | FK → organizations |
| `first_name` | text | Имя |
| `last_name` | text | Фамилия |
| `phone` | text | Телефон (уникальный в org) |
| `email` | text | Email |
| `address` | text | Адрес |
| `date_of_birth` | date | День рождения |
| `notes` | text | Заметки |
| `created_at` | timestamp | Дата создания |
| `updated_at` | timestamp | Дата обновления |

**RLS:** Только своя организация

**View:** `client_summary` — агрегированные данные (total_visits, total_paid, last_visit)

---

#### 5. `visits` — Визиты
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `org_id` | uuid | FK → organizations |
| `client_id` | uuid | FK → clients |
| `service_id` | uuid | FK → services (опционально) |
| `service_type` | text | Legacy: haircut, coloring, etc. |
| `service` | text | Deprecated (старое поле) |
| `scheduled_at` | timestamp | Время визита |
| `started_at` | timestamp | Время начала (для активных визитов) |
| `duration_minutes` | integer | Продолжительность |
| `price` | decimal | Цена |
| `status` | text | scheduled, in_progress, completed, cancelled |
| `notes` | text | Заметки |
| `created_at` | timestamp | Дата создания |
| `updated_at` | timestamp | Дата обновления |

**Статусы:**
- `scheduled` — запланирован
- `in_progress` — активный визит (с таймером)
- `completed` — завершен
- `cancelled` — отменен

**RLS:** Только своя организация

---

#### 6. `visit_services` — Дополнительные услуги в визите
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `visit_id` | uuid | FK → visits |
| `service_id` | uuid | FK → services (NULL для кастомных) |
| `service_name` | text | Название услуги |
| `service_name_ru` | text | Название на русском |
| `price` | decimal | Цена |
| `duration_minutes` | integer | Длительность |
| `created_at` | timestamp | Время добавления |

**Назначение:** Активный визит может включать несколько услуг

**RLS:** Только своя организация

---

#### 7. `services` — Услуги организации
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `org_id` | uuid | FK → organizations |
| `name` | text | Название (иврит) |
| `name_ru` | text | Название (русский) |
| `price` | decimal | Цена по умолчанию |
| `duration_minutes` | integer | Длительность |
| `color` | text | Цвет (#hex) |
| `is_active` | boolean | Активна ли |
| `created_at` | timestamp | Дата создания |
| `updated_at` | timestamp | Дата обновления |

**Soft delete:** `is_active = false` вместо DELETE

**RLS:** Только своя организация

---

#### 8. `care_instructions` — Инструкции по уходу
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `org_id` | uuid | FK → organizations |
| `service_type` | text | Для какой услуги |
| `title` | text | Заголовок (иврит) |
| `title_ru` | text | Заголовок (русский) |
| `content` | text | Текст (иврит) |
| `content_ru` | text | Текст (русский) |
| `pdf_url` | text | URL загруженного PDF |
| `is_active` | boolean | Активна ли |
| `created_at` | timestamp | Дата создания |
| `updated_at` | timestamp | Дата обновления |

**Функционал:**
- Генерация PDF с брендированным шаблоном
- Отправка в WhatsApp
- Загрузка готовых PDF

**RLS:** Только своя организация

---

#### 9. `payments` — Платежи
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `org_id` | uuid | FK → organizations |
| `client_id` | uuid | FK → clients |
| `visit_id` | uuid | FK → visits (опционально) |
| `amount` | decimal | Сумма |
| `payment_method` | text | cash, bit, credit_card, bank_transfer, phone_credit, stripe, tranzilla |
| `status` | text | pending, completed, failed, refunded |
| `transaction_id` | text | ID транзакции |
| `description` | text | Описание |
| `paid_at` | timestamp | Дата оплаты |
| `created_at` | timestamp | Дата создания |

**Методы оплаты:**
- `cash` — Наличные
- `bit` — Bit
- `credit_card` — Кредитная карта
- `bank_transfer` — Банковский перевод
- `phone_credit` — Телефонный кредит
- `stripe` — Stripe Checkout
- `tranzilla` — Tranzilla (израильская система)

**RLS:** Только своя организация

---

#### 10. `products` — Товары (Склад)
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `org_id` | uuid | FK → organizations |
| `name` | text | Название (иврит) |
| `name_ru` | text | Название (русский) |
| `barcode` | text | Штрихкод |
| `category` | text | Категория |
| `unit` | text | Единица измерения |
| `quantity` | decimal | Текущее количество |
| `min_quantity` | decimal | Минимальное количество (для алертов) |
| `cost_price` | decimal | Себестоимость |
| `sell_price` | decimal | Цена продажи |
| `is_active` | boolean | Активен ли |
| `created_at` | timestamp | Дата создания |
| `updated_at` | timestamp | Дата обновления |

**Low Stock Alert:** Когда `quantity <= min_quantity`

**RLS:** Только своя организация

---

#### 11. `inventory_transactions` — Транзакции склада
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `org_id` | uuid | FK → organizations |
| `product_id` | uuid | FK → products |
| `type` | text | purchase, sale, return, adjustment, write_off |
| `quantity` | decimal | Количество |
| `price_per_unit` | decimal | Цена за единицу |
| `total_price` | decimal | Общая сумма |
| `related_visit_id` | uuid | FK → visits (для продаж в визитах) |
| `notes` | text | Заметки |
| `created_at` | timestamp | Дата транзакции |

**Типы транзакций:**
- `purchase` — Закупка (+)
- `sale` — Продажа (-)
- `return` — Возврат от поставщика (+) / от клиента (-)
- `adjustment` — Корректировка (установить точное значение)
- `write_off` — Списание (-)

**Trigger:** Автоматически обновляет `products.quantity`

**RLS:** Только своя организация

---

#### 12. `sms_campaigns` — SMS-кампании
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `org_id` | uuid | FK → organizations |
| `name` | text | Название кампании |
| `message` | text | Текст сообщения |
| `filter_type` | text | all, single, inactive_days |
| `filter_value` | text | client_id или количество дней |
| `status` | text | draft, sent, failed |
| `sent_count` | integer | Отправлено |
| `failed_count` | integer | Не отправлено |
| `created_at` | timestamp | Дата создания |
| `sent_at` | timestamp | Дата отправки |

**Фильтры:**
- `all` — Все клиенты
- `single` — Один клиент
- `inactive_days` — Неактивные N дней

**RLS:** Только своя организация

---

#### 13. `ad_campaigns` — Рекламные кампании (Админ)
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid | Primary key |
| `advertiser_name` | text | Название рекламодателя |
| `banner_url` | text | URL баннера |
| `link_url` | text | URL перехода |
| `target_categories` | text[] | Целевые категории (salon, carwash, etc.) |
| `start_date` | date | Дата начала |
| `end_date` | date | Дата окончания |
| `is_active` | boolean | Активна ли |
| `clicks` | integer | Количество кликов |
| `impressions` | integer | Количество показов |
| `created_at` | timestamp | Дата создания |

**Назначение:** Партнёрские предложения в разделе "Партнёры"

**RLS:** Public read для активных кампаний

---

## 📄 Страницы

### Public Pages (без авторизации)

| Путь | Файл | Описание |
|------|------|----------|
| `/` | `app/page.tsx` | Редирект → `/login` |
| `/login` | `app/login/page.tsx` | Google OAuth авторизация |
| `/landing` | `app/landing/page.tsx` | Лендинг Amber Solutions (автономный) |
| `/blocked` | `app/blocked/page.tsx` | Страница блокировки организации |

---

### Dashboard Pages (требуют авторизации)

| Путь | Файл | Фича | Описание |
|------|------|------|----------|
| `/dashboard` | `app/(dashboard)/page.tsx` | - | Главная: статистика, карточки |
| `/clients` | `app/(dashboard)/clients/page.tsx` | - | Список клиентов, пагинация, поиск |
| `/visits` | `app/(dashboard)/visits/page.tsx` | `visits` | Визиты: список, календарь, активные визиты |
| `/inventory` | `app/(dashboard)/inventory/page.tsx` | `inventory` | Склад: товары, транзакции, сканер |
| `/payments` | `app/(dashboard)/payments/page.tsx` | `payments` | Платежи: Tranzilla, Stripe, наличные |
| `/sms` | `app/(dashboard)/sms/page.tsx` | `sms` | SMS-кампании (Inforu API) |
| `/stats` | `app/(dashboard)/stats/page.tsx` | `analytics` | Статистика: графики, ТОП клиенты |
| `/analytics` | `app/(dashboard)/analytics/page.tsx` | `analytics` | Аналитика: PieChart, BarChart |
| `/partners` | `app/(dashboard)/partners/page.tsx` | - | Партнёрские предложения |
| `/settings` | `app/(dashboard)/settings/page.tsx` | - | Хаб настроек |
| `/settings/display` | `app/(dashboard)/settings/display/page.tsx` | - | Темы, цвета, layouts, dark mode |
| `/settings/language` | `app/(dashboard)/settings/language/page.tsx` | - | Выбор языка (עברית / Русский) |
| `/settings/customize` | `app/(dashboard)/settings/customize/page.tsx` | - | Детальная кастомизация UI |
| `/settings/services` | `app/(dashboard)/settings/services/page.tsx` | - | Управление услугами |
| `/settings/care-instructions` | `app/(dashboard)/settings/care-instructions/page.tsx` | - | Инструкции по уходу |
| `/settings/users` | `app/(dashboard)/settings/users/page.tsx` | - | Управление пользователями |
| `/settings/service-colors` | `app/(dashboard)/settings/service-colors/page.tsx` | - | Цвета услуг для календаря |

---

### Admin Pages (только для админов)

| Путь | Файл | Описание |
|------|------|----------|
| `/admin` | `app/admin/page.tsx` | Админ дашборд: статистика |
| `/admin/organizations` | `app/admin/organizations/page.tsx` | Управление организациями |
| `/admin/billing` | `app/admin/billing/page.tsx` | Биллинг: планы, оплаты, подписки |
| `/admin/ads` | `app/admin/ads/page.tsx` | Управление рекламными кампаниями |
| `/admin/settings` | `app/admin/settings/page.tsx` | Настройки админки |

---

## 🔌 API Routes

### Authentication & Users

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/user` | Получить текущего пользователя |
| `POST` | `/api/org/link-user` | Автолинковка user_id с org_users |

---

### Admin

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/admin/check` | Проверка: является ли пользователь админом |
| `GET` | `/api/admin/stats` | Статистика для админ-дашборда |
| `GET` | `/api/admin/organizations` | Список всех организаций |
| `GET` | `/api/admin/organizations/:id` | Детали организации |
| `POST` | `/api/admin/organizations/create` | Создать организацию (с авто-линковкой клиента) |
| `PATCH` | `/api/admin/organizations/:id` | Обновить организацию |
| `POST` | `/api/admin/organizations/:id/toggle-feature` | Включить/выключить фичу |
| `POST` | `/api/admin/organizations/:id/toggle-active` | Включить/выключить организацию |
| `GET` | `/api/admin/organizations/:id/users` | Пользователи организации |
| `POST` | `/api/admin/organizations/:id/users` | Добавить пользователя |
| `DELETE` | `/api/admin/organizations/:id/users/:email` | Удалить пользователя |
| `GET` | `/api/admin/billing/stats` | Статистика биллинга |
| `GET` | `/api/admin/billing/organizations` | Организации для биллинга |
| `POST` | `/api/admin/billing/:orgId/mark-paid` | Пометить как оплачено |
| `PATCH` | `/api/admin/billing/:orgId/plan` | Изменить план |
| `POST` | `/api/admin/seed-test-data` | Заполнить тестовыми данными (только для org "Test") |

---

### Ads (Партнёры)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/ads/active?category=salon` | Активные кампании для категории |
| `POST` | `/api/ads/click` | Трекинг клика по объявлению |
| `GET` | `/api/ads` | Список всех кампаний (админ) |
| `POST` | `/api/ads` | Создать кампанию (админ) |
| `PATCH` | `/api/ads/:id` | Обновить кампанию (админ) |
| `DELETE` | `/api/ads/:id` | Удалить кампанию (админ) |

---

### Payments

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/payments/create-link` | Создать платёжную ссылку (Tranzilla) |
| `POST` | `/api/payments/tranzilla-callback` | Callback от Tranzilla |
| `POST` | `/api/payments/tranzilla-webhook` | Webhook от Tranzilla |
| `POST` | `/api/payments/stripe-checkout` | Создать Stripe Checkout Session |
| `POST` | `/api/payments/stripe-webhook` | Webhook от Stripe |
| `POST` | `/api/payments/stripe-subscription` | Создать подписку через Stripe |

---

### Inventory

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/inventory` | Список транзакций склада |
| `POST` | `/api/inventory` | Создать транзакцию |
| `GET` | `/api/products` | Список товаров |
| `POST` | `/api/products` | Создать товар |
| `GET` | `/api/products/:id` | Детали товара |
| `PATCH` | `/api/products/:id` | Обновить товар |
| `DELETE` | `/api/products/:id` | Soft delete товара |

---

### Services

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/services` | Список услуг организации |
| `POST` | `/api/services` | Создать услугу |
| `PATCH` | `/api/services/:id` | Обновить услугу |
| `DELETE` | `/api/services/:id` | Soft delete услуги |

---

### Care Instructions

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/care-instructions` | Список инструкций |
| `POST` | `/api/care-instructions` | Создать инструкцию |
| `GET` | `/api/care-instructions/:id` | Детали инструкции |
| `PATCH` | `/api/care-instructions/:id` | Обновить инструкцию |
| `DELETE` | `/api/care-instructions/:id` | Soft delete инструкции |

---

### Visits

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/visits/:id/services` | Дополнительные услуги визита |
| `POST` | `/api/visits/:id/services` | Добавить услугу в визит |
| `DELETE` | `/api/visits/:id/services/:serviceId` | Удалить услугу из визита |
| `PATCH` | `/api/visits/:id/status` | Изменить статус визита |

---

### SMS

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/sms/send-campaign` | Отправить SMS-кампанию |
| `GET` | `/api/sms/recipients-count` | Подсчёт получателей |

---

## 🎛️ Функционал (Features)

### Базовые возможности (для всех)

| Фича | Статус | Описание |
|------|--------|----------|
| Клиенты | ✅ Работает | CRUD, поиск, пагинация, client_summary view |
| Dashboard | ✅ Работает | Статистика, карточки, графики |
| Темы | ✅ Работает | 6 цветовых тем |
| Layouts | ✅ Работает | 3 стиля интерфейса (Classic, Modern, Compact) |
| Кастомизация | ✅ Работает | 12+ детальных настроек UI |
| Языки | ✅ Работает | עברית / Русский, авто RTL/LTR |
| Dark Mode | ✅ Работает | Тёмная тема |
| Профиль | ✅ Работает | Редактирование имени, аватара |
| Settings | ✅ Работает | Категории настроек |

---

### Модульные фичи (зависят от плана)

#### ✅ Visits (Визиты)
- Флаг: `features.visits` (boolean)
- Возможности:
  - Создание, редактирование, удаление визитов
  - Статусы: scheduled, in_progress, completed, cancelled
  - Активные визиты с таймером
  - Добавление дополнительных услуг
  - Календарь визитов
  - Кастомизируемые услуги (services)
  - Инструкции по уходу (care instructions)
  - PDF генерация + WhatsApp интеграция

#### ✅ Payments (Платежи)
- Флаг: `features.payments` (boolean)
- Возможности:
  - **Tranzilla:** Создание платёжных ссылок, iframe, webhooks
  - **Stripe:** Checkout Sessions, одноразовые платежи
  - **Наличные:** Cash payments с записью в БД
  - Статусы: pending, completed, failed, refunded
  - Фильтры: статус, метод оплаты, период

#### ✅ Subscriptions (Подписки)
- Флаг: `features.subscriptions` (boolean)
- Возможности:
  - Stripe Subscriptions (monthly, weekly, yearly)
  - Webhook обработка
  - Автоматическое продление

#### ✅ SMS (SMS-кампании)
- Флаг: `features.sms` (boolean)
- Возможности:
  - Отправка через Inforu API
  - Фильтры: все, один клиент, неактивные N дней
  - Подсчёт символов и SMS-частей
  - История кампаний

#### ✅ Analytics (Аналитика)
- Флаг: `features.analytics` (boolean)
- Возможности:
  - Графики: PieChart (методы оплаты), BarChart (revenue)
  - ТОП-5 клиентов
  - Revenue по месяцам
  - Visits по месяцам

#### ✅ Inventory (Склад)
- Флаг: `features.inventory` (boolean)
- Возможности:
  - CRUD товаров
  - Сканер штрихкодов (камера + USB)
  - Транзакции: purchase, sale, return, adjustment, write_off
  - Low stock alerts (dashboard, sidebar, inventory page)
  - QuickSale (быстрая продажа)
  - Интеграция с визитами (продажа товаров в визите)

---

### Админ-панель (только для admin_users)

| Фича | Статус | Описание |
|------|--------|----------|
| Управление организациями | ✅ Работает | CRUD, просмотр, блокировка |
| Биллинг | ✅ Работает | Планы, оплаты, подписки Stripe |
| Рекламные кампании | ✅ Работает | CRUD объявлений |
| Статистика | ✅ Работает | Общая статистика по всем организациям |

---

## 💰 Тарифные планы

### Basic
- **Цена:** ₪99/месяц
- **Фичи:**
  - ✅ Клиенты (unlimited)
  - ✅ Dashboard
  - ✅ Темы и кастомизация
  - ❌ Визиты
  - ❌ Платежи
  - ❌ SMS
  - ❌ Аналитика
  - ❌ Склад

### Pro
- **Цена:** ₪199/месяц
- **Фичи:**
  - ✅ Всё из Basic
  - ✅ Визиты
  - ✅ Платежи (Tranzilla + Stripe)
  - ✅ SMS (100 сообщений/месяц)
  - ✅ Аналитика
  - ❌ Склад

### Enterprise
- **Цена:** ₪399/месяц
- **Фичи:**
  - ✅ Всё из Pro
  - ✅ Склад (inventory)
  - ✅ SMS (unlimited)
  - ✅ Приоритетная поддержка
  - ✅ Кастомные интеграции

---

## 🔗 Интеграции

### 1. Stripe
- **Тип:** Платёжная система
- **Использование:**
  - Checkout Sessions (одноразовые платежи)
  - Subscriptions (recurring payments)
  - Webhooks: `checkout.session.completed`, `customer.subscription.*`
- **Переменные окружения:**
  ```env
  STRIPE_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```
- **Статус:** ✅ Работает (production ready)

---

### 2. Tranzilla
- **Тип:** Израильская платёжная система
- **Использование:**
  - Генерация платёжных ссылок
  - iframe интеграция
  - Callback + Webhook для подтверждения
- **Переменные окружения:**
  ```env
  TRANZILLA_TERMINAL=...
  TRANZILLA_PASSWORD=...
  TRANZILLA_API_URL=https://direct.tranzila.com/...
  ```
- **Статус:** ✅ Работает (production)

**Важно:** `TranzilaPW` НЕ передаётся в публичных URLs (только server-side)

---

### 3. Inforu (SMS)
- **Тип:** SMS-провайдер (Израиль)
- **Использование:**
  - Отправка SMS-кампаний
  - Bulk SMS
- **Переменные окружения:**
  ```env
  INFORU_USERNAME=...
  INFORU_PASSWORD=...
  ```
- **Статус:** ✅ Работает

---

### 4. Supabase
- **Тип:** Backend as a Service
- **Использование:**
  - PostgreSQL база данных
  - Google OAuth (auth.users)
  - Row-Level Security (RLS)
  - Realtime subscriptions (не используется пока)
- **Переменные окружения:**
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1... (для обхода RLS)
  ```
- **Статус:** ✅ Работает

---

### 5. WhatsApp Business
- **Тип:** Мессенджер
- **Использование:**
  - Отправка инструкций по уходу (care instructions)
  - `wa.me` ссылки с предзаполненным текстом
- **Статус:** ✅ Работает (через wa.me API)

---

### 6. jsPDF
- **Тип:** PDF Generation
- **Использование:**
  - Генерация PDF инструкций по уходу
  - Брендированные шаблоны (org name, client name)
- **Статус:** ✅ Работает

---

### 7. Vercel
- **Тип:** Deployment & Hosting
- **Использование:**
  - Auto-deploy from GitHub
  - Edge Functions
  - Analytics
- **Статус:** ✅ Production: https://trinity-sage.vercel.app

---

## 🐛 Текущие баги и TODO

### 🐛 Известные баги

#### ❌ CRITICAL
- **Нет** критических багов на данный момент

#### ⚠️ Средний приоритет
1. **Build verification** — AI не может запустить `npm run build` (permissions), баги обнаруживаются после deploy
2. **Translation duplicates** — Иногда появляются дубликаты ключей в LanguageContext.tsx
   - **Решение:** Всегда проверять grep перед добавлением

#### 🔵 Низкий приоритет
1. **Mobile sidebar animation** — Небольшая задержка при открытии на медленных устройствах
2. **Chart responsive** — На очень маленьких экранах (<350px) графики могут обрезаться
3. **Barcode scanner** — Не все USB-сканеры определяются (зависит от браузера)

---

### 📋 TODO (Roadmap)

#### 🚀 Высокий приоритет
1. **Auth Performance Optimization v2.28.0** (В ПРОЦЕССЕ)
   - Singleton AuthProvider pattern
   - Promise.all для параллельных запросов
   - Убрать pathname dependency
   - Убрать console.logs
   - Только reload на SIGNED_IN/SIGNED_OUT events
   - **Цель:** Снизить 40-60 запросов до 4-8

2. **SQL Migrations Execution**
   - Выполнить `create-services.sql`
   - Выполнить `migrate-visits-to-services.sql`
   - Выполнить `create-visit-services.sql`

3. **LoadingScreen Rollout**
   - Применить LoadingScreen ко всем страницам
   - Dashboard, payments, analytics, sms, stats, partners, admin pages

---

#### 💡 Средний приоритет
1. **Performance Optimization**
   - Client summary lazy loading (убрать JOIN-heavy view)
   - CLS fixes (layout shift в sidebar)
   - Lazy loading для Analytics и Calendar
   - React Query caching (staleTime)

2. **Mobile Improvements**
   - Swipe gestures для calendar
   - Pull-to-refresh для списков
   - Оптимизация изображений (next/image)

3. **Realtime Features**
   - Supabase realtime для активных визитов
   - Live notifications

4. **Export/Import**
   - Экспорт клиентов в Excel
   - Импорт клиентов из CSV
   - Экспорт отчётов в PDF

---

#### 🔮 Низкий приоритет (Future)
1. **Новые интеграции**
   - Telegram notifications
   - Email campaigns (SendGrid)
   - Google Calendar sync
   - WhatsApp Business API (official)

2. **AI Features**
   - Автоматические напоминания клиентам
   - Предсказание загрузки
   - Smart pricing recommendations

3. **Multi-language**
   - Английский язык
   - Арабский язык

4. **White Label**
   - Кастомный домен для организаций
   - Кастомный брендинг

5. **Mobile App**
   - React Native / Flutter
   - iOS + Android

---

## 📊 Метрики проекта

| Метрика | Значение |
|---------|----------|
| **Версия** | v2.28.0 |
| **Языки** | 2 (עברית, Русский) |
| **Таблиц в БД** | 13 |
| **API Routes** | 40+ |
| **Страниц** | 25+ |
| **Компонентов** | 80+ |
| **Translation keys** | 1300+ |
| **Строк кода** | ~30,000 |
| **Цветовых тем** | 6 |
| **UI Layouts** | 3 |

---

## 🔒 Безопасность

### Реализованные меры:

1. **Row-Level Security (RLS)**
   - Все таблицы защищены RLS политиками
   - Пользователи видят только свои данные

2. **Service Role Isolation**
   - Service role key используется ТОЛЬКО server-side
   - Auto-link системы с проверками

3. **OAuth Authentication**
   - Google OAuth через Supabase
   - Нет паролей в системе

4. **API Protection**
   - Middleware проверяет auth на всех защищённых роутах
   - Admin endpoints проверяют `admin_users` table

5. **Environment Variables**
   - Все чувствительные данные в .env
   - Не коммитятся в Git

6. **CSRF Protection**
   - Supabase автоматически защищает от CSRF

---

## 🚀 Deployment

### Production

| Параметр | Значение |
|----------|----------|
| **Platform** | Vercel |
| **URL** | https://trinity-sage.vercel.app |
| **GitHub** | https://github.com/Creepie132/trinity |
| **Branch** | main |
| **Auto-deploy** | ✅ Enabled |
| **Build Command** | `npm run build` |
| **Node Version** | 22.x |

### Environment Variables (Production)

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Stripe:**
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

**Tranzilla:**
- `TRANZILLA_TERMINAL`
- `TRANZILLA_PASSWORD`
- `TRANZILLA_API_URL`

**Inforu:**
- `INFORU_USERNAME`
- `INFORU_PASSWORD`

---

## 📞 Контакты

**Разработчик:** Amber Solutions Systems  
**Email:** creepie1357@gmail.com  
**Telegram:** @Creepie1357  
**Website:** https://trinity-sage.vercel.app/landing

---

## 📝 Changelog

### v2.28.0 (2026-02-14) - В ПРОЦЕССЕ
- 🔧 Auth performance optimization (singleton pattern)
- 📱 Mobile UX improvements (FAB buttons, адаптивные тексты)
- 🎨 Partners page amber glow animation
- 📊 PieChart labels visibility fix
- 🌐 Settings translation fixes

### v2.27.0 (2026-02-13)
- 🛡️ Error boundaries for mobile white screen prevention
- 📄 Care instructions UI enhancements (PDF upload)
- 📞 Landing page contact updates
- 🐛 Bug fixes: translation duplicates, products error logging

### v2.26.0 (2026-02-13)
- ⏱️ Active visit system with live timer
- 🔧 Multi-service tracking in visits
- 🎨 Compact ActiveVisitCard design
- 📝 Custom service dialog

### v2.25.0 (2026-02-12)
- 🛠️ Services management system
- 📄 Care instructions with PDF + WhatsApp
- 🔄 Visit-service integration
- 🌱 Enhanced test data seeder

### v2.24.0 (2026-02-11)
- 📦 Inventory Part 3: Visit-product integration
- 💰 QuickSale dialog
- ↩️ Return product dialog
- ⚠️ Low stock alerts

### v2.23.0 (2026-02-11)
- 📦 Inventory system Part 1 & 2
- 📊 Products + transactions
- 📷 Barcode scanner
- 🔗 Feature flag integration

---

**Документация актуальна на:** 2026-02-14  
**Следующее обновление:** После завершения v2.28.0
