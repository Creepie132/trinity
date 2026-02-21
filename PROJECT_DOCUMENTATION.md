# Trinity CRM - Полная документация проекта

Дата создания: 2026-02-19

---

## 📁 Структура проекта

### Основные директории

```
clientbase-pro/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Защищённые страницы (требуют авторизации)
│   │   ├── admin/              # Админ-панель
│   │   ├── api/                # API Routes
│   │   ├── book/               # Публичная страница бронирования
│   │   ├── landing/            # Лендинг
│   │   └── login/              # Страница входа
│   ├── components/             # React компоненты
│   ├── contexts/               # React Contexts
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Утилиты и интеграции
│   └── types/                  # TypeScript типы
├── supabase/                   # SQL миграции и схемы
├── public/                     # Статические файлы
└── middleware.ts               # Next.js middleware
```

---

## 🔐 Middleware

**Файл:** `middleware.ts`

### Логика авторизации

Middleware выполняется на **каждом запросе** (кроме статических файлов).

#### Публичные пути (без авторизации):
- `/` - главная страница
- `/login` - страница входа
- `/unauthorized` - страница "нет доступа"
- `/blocked` - страница "организация заблокирована"
- `/landing` - лендинг
- `/callback` - OAuth callback
- `/api/payments/webhook` - Tranzilla webhook
- `/api/payments/stripe-webhook` - Stripe webhook
- `/api/health` - healthcheck
- `/.well-known/*` - для Apple Pay Domain Verification

#### Защищённые пути (требуют сессии):
Все остальные пути (`/dashboard`, `/admin`, `/api/*`, `/book/*`, и т.д.)

### Логика обработки:

```typescript
1. Проверка публичных путей → NextResponse.next()
2. Создание Supabase клиента (SSR mode)
3. Получение сессии через supabase.auth.getSession()
4. Если ошибка/нет сессии:
   - Очистка всех sb-* cookies
   - Редирект на /login?next={pathname}
5. Если сессия существует:
   - Запрос разрешён
   - Дополнительные проверки (org_users, роли) на клиенте
```

### Matcher config:
Исключает: `_next/static`, `_next/image`, `favicon.ico`, и файлы: `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.json`

---

## 🔌 API Routes

Все API routes находятся в `src/app/api/`

### Структура API:

```
src/app/api/
├── admin/                           # Админские эндпоинты
│   ├── assign/route.ts             # Назначение админа на организацию
│   ├── check/route.ts              # Проверка админских прав
│   ├── org-subscription/route.ts   # Управление подписками организаций
│   ├── organizations/
│   │   ├── [orgId]/stats/route.ts # Статистика конкретной организации
│   │   └── create/route.ts        # Создание новой организации
│   └── profile/route.ts            # Профиль админа
├── ads/                            # Рекламная система
│   ├── active/route.ts            # Получение активной рекламы
│   ├── click/route.ts             # Регистрация кликов
│   └── impression/route.ts        # Регистрация показов
├── booking/                        # Публичная система бронирования
│   └── [slug]/
│       ├── route.ts               # Информация об организации
│       ├── book/route.ts          # Создание бронирования
│       └── slots/route.ts         # Доступные слоты
├── care-instructions/              # Инструкции по уходу
│   ├── route.ts                   # CRUD операции
│   └── [id]/route.ts              # Операции с конкретной инструкцией
├── contact/route.ts                # Контактная форма с лендинга
├── health/route.ts                 # Healthcheck endpoint
├── inventory/route.ts              # Управление складом
├── org/                            # Управление организацией
│   ├── invite-user/route.ts       # Приглашение пользователя
│   └── link-user/route.ts         # Привязка существующего пользователя
├── organizations/                  # Организации
│   ├── [orgId]/route.ts           # CRUD конкретной организации
│   └── booking-settings/route.ts  # Настройки бронирования
├── payments/                       # Платёжная система
│   ├── callback/route.ts          # Tranzilla callback
│   ├── create-link/route.ts       # Создание платёжной ссылки
│   ├── stripe-checkout/route.ts   # Stripe checkout session
│   ├── stripe-subscription/route.ts # Stripe подписки
│   ├── stripe-webhook/route.ts    # Stripe webhooks
│   ├── tranzilla-token/route.ts   # Токенизация карт
│   └── webhook/route.ts           # Tranzilla webhooks
├── products/                       # Товары (инвентарь)
│   ├── route.ts                   # CRUD товаров
│   └── [id]/route.ts              # Операции с конкретным товаром
├── services/                       # Услуги
│   ├── route.ts                   # CRUD услуг
│   └── [id]/route.ts              # Операции с конкретной услугой
├── setup-visits/route.ts           # Миграция старых визитов
├── sms/                            # SMS рассылки
│   ├── campaign/route.ts          # Создание кампании
│   └── send/route.ts              # Отправка SMS
├── upload/                         # Загрузка файлов
│   └── banner/route.ts            # Загрузка баннеров
└── visits/                         # Визиты/посещения
    ├── route.ts                   # CRUD визитов
    └── [id]/
        ├── services/route.ts      # Услуги визита
        ├── services/[serviceId]/route.ts # Конкретная услуга
        └── status/route.ts        # Изменение статуса

```

### Детали по ключевым API:


#### Admin API
- **Проверка прав:** `/api/admin/check` - проверяет наличие пользователя в `admin_users`
- **Управление организациями:** создание, статистика, назначение подписок
- **Профиль админа:** получение/обновление данных из `admin_users`

#### Booking API (публичный)
- **Без авторизации:** доступен по slug организации
- **Эндпоинты:** информация о компании, доступные слоты, создание бронирования
- **Автоматически создаёт:** клиента + визит в БД

#### Payments API
- **Tranzilla:** токенизация, webhook callback
- **Stripe:** checkout sessions, подписки, webhooks
- **Внутренние:** создание платёжных ссылок, cash payments

#### SMS API
- **Провайдер:** Inforu (израильский SMS шлюз)
- **Функционал:** массовые рассылки, фильтрация по активности клиентов

---

## 🗄️ Схема базы данных

**Версия:** Trinity CRM V2.4.0  
**Дата:** 2026-02-10

### Основные таблицы:

```sql
-- 1. ORGANIZATIONS - организации/компании
CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  category text CHECK (category IN ('salon','carwash','clinic','restaurant','gym','other')),
  plan text CHECK (plan IN ('basic','pro','enterprise')),
  is_active boolean DEFAULT true,
  features jsonb DEFAULT '{"sms": true, "payments": true, "analytics": true}',
  billing_status text CHECK (billing_status IN ('trial','paid','overdue','cancelled')),
  billing_due_date date,
  created_at timestamptz
);

-- 2. ORG_USERS - пользователи организаций
CREATE TABLE org_users (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text CHECK (role IN ('owner','admin','staff')),
  invited_at timestamptz,
  joined_at timestamptz,
  UNIQUE(org_id, email)
);

-- 3. ADMIN_USERS - системные администраторы
CREATE TABLE admin_users (
  id uuid PRIMARY KEY,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text CHECK (role IN ('admin', 'moderator')),
  created_at timestamptz
);

-- 4. AD_CAMPAIGNS - рекламные кампании
CREATE TABLE ad_campaigns (
  id uuid PRIMARY KEY,
  advertiser_name text NOT NULL,
  banner_url text NOT NULL,
  link_url text NOT NULL,
  target_categories text[],
  start_date date,
  end_date date,
  is_active boolean,
  clicks integer,
  impressions integer,
  created_at timestamptz
);

-- 5. CLIENTS - клиенты
CREATE TABLE clients (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  date_of_birth date,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
);

-- 6. VISITS - визиты/посещения
CREATE TABLE visits (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  visit_date timestamptz NOT NULL,
  service_description text,
  amount numeric(10,2),
  notes text,
  created_at timestamptz
);

-- 7. PAYMENTS - платежи
CREATE TABLE payments (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES visits(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text CHECK (currency IN ('ILS','USD','EUR')),
  status text CHECK (status IN ('pending','completed','failed','refunded')),
  payment_method text,
  payment_link text,
  transaction_id text,
  provider text DEFAULT 'tranzilla',
  paid_at timestamptz,
  created_at timestamptz
);

-- 8. SMS_CAMPAIGNS - SMS кампании
CREATE TABLE sms_campaigns (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  message text NOT NULL,
  filter_type text CHECK (filter_type IN ('all','single','inactive_days')),
  filter_value text,
  recipients_count integer,
  sent_count integer,
  failed_count integer,
  status text CHECK (status IN ('draft','sending','completed','failed')),
  created_at timestamptz,
  sent_at timestamptz
);

-- 9. SMS_MESSAGES - отдельные SMS сообщения
CREATE TABLE sms_messages (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  phone text NOT NULL,
  message text NOT NULL,
  status text CHECK (status IN ('pending','sent','delivered','failed')),
  error text,
  sent_at timestamptz
);

-- 10. SERVICES - услуги (новая система)
CREATE TABLE services (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2),
  duration_minutes integer,
  color text,
  is_active boolean DEFAULT true,
  created_at timestamptz
);

-- 11. VISIT_SERVICES - связь визитов и услуг (M:M)
CREATE TABLE visit_services (
  id uuid PRIMARY KEY,
  visit_id uuid REFERENCES visits(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  price numeric(10,2),
  total_amount numeric(10,2),
  created_at timestamptz
);

-- 12. PRODUCTS - товары/инвентарь
CREATE TABLE products (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  barcode text,
  sku text,
  category text,
  purchase_price numeric(10,2),
  selling_price numeric(10,2),
  stock_quantity integer DEFAULT 0,
  min_stock_level integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz,
  updated_at timestamptz
);

-- 13. INVENTORY_TRANSACTIONS - движения инвентаря
CREATE TABLE inventory_transactions (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  type text CHECK (type IN ('purchase','sale','adjustment','return')),
  quantity integer NOT NULL,
  unit_price numeric(10,2),
  total_amount numeric(10,2),
  reference_id uuid, -- visit_id or external reference
  notes text,
  created_at timestamptz
);

-- 14. CARE_INSTRUCTIONS - инструкции по уходу
CREATE TABLE care_instructions (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz,
  updated_at timestamptz
);

-- 15. BOOKING_SETTINGS - настройки публичного бронирования
CREATE TABLE booking_settings (
  id uuid PRIMARY KEY,
  org_id uuid UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  is_enabled boolean DEFAULT false,
  working_hours jsonb DEFAULT '{}',
  slot_duration_minutes integer DEFAULT 30,
  advance_booking_days integer DEFAULT 30,
  created_at timestamptz,
  updated_at timestamptz
);

-- 16. ORG_SUBSCRIPTIONS - подписки организаций (Stripe)
CREATE TABLE org_subscriptions (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text CHECK (plan IN ('basic','pro','enterprise')),
  status text CHECK (status IN ('active','past_due','canceled','incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz,
  updated_at timestamptz
);

-- 17. LANDING_SETTINGS - настройки лендинга
CREATE TABLE landing_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hero_title text DEFAULT 'Trinity CRM',
  hero_subtitle text,
  banner_url text,
  updated_at timestamptz DEFAULT now()
);
```

### Связи между таблицами:

```
organizations (1) → (N) org_users
organizations (1) → (N) clients
organizations (1) → (N) visits
organizations (1) → (N) payments
organizations (1) → (N) sms_campaigns
organizations (1) → (N) services
organizations (1) → (N) products
organizations (1) → (1) booking_settings

clients (1) → (N) visits
clients (1) → (N) payments

visits (1) → (N) visit_services
visits (1) → (N) payments (optional via visit_id)

services (1) → (N) visit_services

products (1) → (N) inventory_transactions

sms_campaigns (1) → (N) sms_messages

auth.users (1) → (N) org_users
auth.users (1) → (1) admin_users
```

### Cascade поведение:

- **DELETE organizations** → удаляет все связанные данные (clients, visits, payments, etc.)
- **DELETE clients** → удаляет visits, payments, sms_messages
- **DELETE visits** → устанавливает payments.visit_id = NULL
- **DELETE auth.users** → удаляет org_users и admin_users

---

## 🔒 Row Level Security (RLS) Policies

### Вспомогательные функции:

```sql
-- Получить все организации текущего пользователя
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF uuid AS $$
  SELECT org_id 
  FROM org_users 
  WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Проверить, является ли пользователь админом
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### RLS политики по таблицам:

#### 1. ORGANIZATIONS

```sql
-- Админы имеют полный доступ ко всем организациям
CREATE POLICY "Admins full access to organizations"
  ON organizations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Пользователи видят только свои организации
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid())
  );

-- Владельцы могут обновлять свою организацию
CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
```

#### 2. ORG_USERS

```sql
-- Пользователи видят только членов своих организаций
CREATE POLICY "Users see own org users" 
  ON org_users FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- Админы управляют всеми org_users
CREATE POLICY "Admin manage org users" 
  ON org_users FOR ALL 
  USING (is_admin());
```

#### 3. ADMIN_USERS

```sql
-- Только админы видят таблицу админов
CREATE POLICY "Admin only" 
  ON admin_users FOR ALL 
  USING (is_admin());
```

#### 4. AD_CAMPAIGNS

```sql
-- RLS ОТКЛЮЧЕН (временно для публичного доступа)
ALTER TABLE ad_campaigns DISABLE ROW LEVEL SECURITY;

-- Было (закомментировано):
-- CREATE POLICY "All see active ads" 
--   ON ad_campaigns FOR SELECT 
--   USING (is_active = true);
-- 
-- CREATE POLICY "Admin manage ads" 
--   ON ad_campaigns FOR ALL 
--   USING (is_admin());
```

#### 5. CLIENTS

```sql
CREATE POLICY "Users see own org clients" 
  ON clients FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users insert own org clients" 
  ON clients FOR INSERT 
  WITH CHECK (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users update own org clients" 
  ON clients FOR UPDATE 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users delete own org clients" 
  ON clients FOR DELETE 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());
```

#### 6. VISITS

```sql
CREATE POLICY "Users see own org visits" 
  ON visits FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org visits" 
  ON visits FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());
```

#### 7. PAYMENTS

```sql
CREATE POLICY "Users see own org payments" 
  ON payments FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org payments" 
  ON payments FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());
```

#### 8. SMS_CAMPAIGNS & SMS_MESSAGES

```sql
CREATE POLICY "Users see own org campaigns" 
  ON sms_campaigns FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org campaigns" 
  ON sms_campaigns FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users see own org messages" 
  ON sms_messages FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org messages" 
  ON sms_messages FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());
```

#### 9. SERVICES

```sql
CREATE POLICY "Users can view their org's services" 
  ON services FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users can insert services in their org" 
  ON services FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users can update their org's services" 
  ON services FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users can delete their org's services" 
  ON services FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());
```

#### 10. VISIT_SERVICES

```sql
CREATE POLICY visit_services_select_policy 
  ON visit_services FOR SELECT
  USING (
    visit_id IN (
      SELECT id FROM visits 
      WHERE org_id IN (SELECT get_user_org_ids())
    ) OR is_admin()
  );

CREATE POLICY visit_services_insert_policy 
  ON visit_services FOR INSERT
  WITH CHECK (
    visit_id IN (
      SELECT id FROM visits 
      WHERE org_id IN (SELECT get_user_org_ids())
    ) OR is_admin()
  );

CREATE POLICY visit_services_update_policy 
  ON visit_services FOR UPDATE
  USING (
    visit_id IN (
      SELECT id FROM visits 
      WHERE org_id IN (SELECT get_user_org_ids())
    ) OR is_admin()
  );

CREATE POLICY visit_services_delete_policy 
  ON visit_services FOR DELETE
  USING (
    visit_id IN (
      SELECT id FROM visits 
      WHERE org_id IN (SELECT get_user_org_ids())
    ) OR is_admin()
  );
```

#### 11. PRODUCTS & INVENTORY_TRANSACTIONS

```sql
CREATE POLICY "Users can view their org's products" 
  ON products FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users can insert products in their org" 
  ON products FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users can update their org's products" 
  ON products FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users can delete their org's products" 
  ON products FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- Аналогично для inventory_transactions
CREATE POLICY "Users can view their org's transactions" 
  ON inventory_transactions FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users can insert transactions in their org" 
  ON inventory_transactions FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()) OR is_admin());
```

#### 12. CARE_INSTRUCTIONS

```sql
CREATE POLICY "Users can view their org's instructions" 
  ON care_instructions FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users can insert instructions in their org" 
  ON care_instructions FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users can update their org's instructions" 
  ON care_instructions FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users can delete their org's instructions" 
  ON care_instructions FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());
```

#### 13. BOOKING_SETTINGS

```sql
-- Публичный доступ для чтения (по slug)
CREATE POLICY "Anyone can read booking settings"
  ON booking_settings FOR SELECT
  USING (is_enabled = true);

-- Только org_users могут управлять настройками своей организации
CREATE POLICY "Org users can manage their booking settings"
  ON booking_settings FOR ALL
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());
```

#### 14. LANDING_SETTINGS

```sql
-- Публичный доступ для чтения
CREATE POLICY "Anyone can read landing settings"
  ON landing_settings FOR SELECT
  USING (true);

-- Только админы могут обновлять
CREATE POLICY "Only admins can update landing settings"
  ON landing_settings FOR UPDATE
  USING (is_admin());
```

#### 15. ORG_SUBSCRIPTIONS

```sql
-- Только владельцы организации и админы
CREATE POLICY "Org owners can view their subscription"
  ON org_subscriptions FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    ) OR is_admin()
  );

-- Только админы могут управлять подписками
CREATE POLICY "Admins can manage all subscriptions"
  ON org_subscriptions FOR ALL
  USING (is_admin());
```

### Общие принципы RLS:

1. **Изоляция по организациям:** Каждая организация видит только свои данные
2. **Админы имеют полный доступ:** `is_admin()` обходит все ограничения
3. **Роли внутри организации:** owner > admin > staff (на уровне приложения)
4. **Публичные эндпоинты:** booking, landing_settings - доступны без авторизации
5. **Безопасность по умолчанию:** RLS включен на всех таблицах (кроме ad_campaigns)

---

## 🔌 Интеграции

### 1. Supabase
- **Аутентификация:** Email/Password через `@supabase/ssr`
- **База данных:** PostgreSQL с RLS
- **Storage:** Для аватаров и баннеров
- **Real-time:** Подписки на изменения (не используется активно)

### 2. Платёжные системы

#### Tranzilla (основной - Израиль)
- **Файл:** `src/lib/tranzilla.ts`
- **Функции:**
  - Создание платёжных ссылок
  - Токенизация карт
  - Обработка webhooks
- **Endpoints:**
  - `/api/payments/create-link`
  - `/api/payments/tranzilla-token`
  - `/api/payments/callback`
  - `/api/payments/webhook`

#### Stripe (международный)
- **Файл:** `src/lib/stripe.ts`
- **Функции:**
  - Checkout sessions
  - Подписки (recurring billing)
  - Webhooks для обновления статусов
- **Endpoints:**
  - `/api/payments/stripe-checkout`
  - `/api/payments/stripe-subscription`
  - `/api/payments/stripe-webhook`

### 3. SMS (Inforu)
- **Файл:** `src/lib/inforu.ts`
- **API:** `https://api.inforu.co.il`
- **Функции:**
  - Массовая рассылка SMS
  - Фильтрация клиентов (все/один/неактивные N дней)
  - Отслеживание статусов доставки
- **Endpoints:**
  - `/api/sms/send` - отправка одного SMS
  - `/api/sms/campaign` - создание и запуск кампании

### 4. Email (Resend)
- **Файл:** `src/lib/emails.ts`
- **Используется для:**
  - Приглашения пользователей в организацию
  - Уведомления о платежах
  - Системные уведомления

### 5. Lottie Animation
- **Библиотека:** `lottie-react`
- **Использование:** AI chat button на лендинге
- **Файл анимации:** `public/animations/ai-button.json` (4.6MB)
- **Компонент:** `src/components/ChatButton.tsx`

---

## 🔑 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Tranzilla
TRANZILLA_TERMINAL_NAME=xxx
TRANZILLA_API_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Inforu SMS
INFORU_USERNAME=xxx
INFORU_PASSWORD=xxx

# Resend Email
RESEND_API_KEY=re_xxx

# App
NEXT_PUBLIC_APP_URL=https://ambersol.co.il
```

---

## 📦 Основные зависимости

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "@supabase/ssr": "^0.x",
    "@supabase/supabase-js": "^2.x",
    "@stripe/stripe-js": "^3.x",
    "stripe": "^14.x",
    "lottie-react": "^2.x",
    "@tanstack/react-query": "^5.x",
    "tailwindcss": "^3.x",
    "lucide-react": "^0.x",
    "sonner": "^1.x" // toast notifications
  }
}
```

---

## 🏗️ Архитектурные решения

### 1. Multi-tenancy модель
- **Уровень изоляции:** Organization
- **Механизм:** RLS policies на уровне БД
- **Связь:** `org_users` таблица для membership
- **Роли:** owner/admin/staff (проверка на клиенте)

### 2. Авторизация
- **Middleware:** Проверка сессии Supabase
- **RLS:** Автоматическая изоляция данных на уровне БД
- **Admin:** Отдельная таблица `admin_users` для системных админов
- **Public routes:** `/landing`, `/book/[slug]`, webhooks

### 3. Файловая структура Next.js
- **App Router:** `src/app/`
- **Route Groups:** `(dashboard)` для защищённых страниц
- **Parallel routes:** Не используются
- **Server Components:** По умолчанию, "use client" где нужны hooks

### 4. State Management
- **Server State:** `@tanstack/react-query` для кэширования API данных
- **Client State:** React Context (Auth, Language, Theme)
- **Form State:** React useState + native form handling

### 5. Styling
- **Tailwind CSS:** Утилитарные классы
- **shadcn/ui:** Компоненты UI (dialog, sheet, button, etc.)
- **CSS Modules:** Не используются
- **Global styles:** Минимальные в `globals.css`

---

## 🚀 Deployment

### Vercel (Production)
- **URL:** https://ambersol.co.il
- **Auto-deploy:** На push в `main` ветку
- **Environment:** Production env vars в Vercel dashboard
- **Build command:** `npm run build`
- **Output:** `.next/` (автоматически)

### Supabase (Database)
- **Регион:** US East (можно изменить)
- **План:** Free tier / Pro (в зависимости от нагрузки)
- **Бэкапы:** Автоматические ежедневные (на Pro плане)
- **Миграции:** Ручной запуск SQL скриптов через SQL Editor

---

## 🐛 Известные проблемы и решения

### 1. npm install fails локально
**Проблема:** ENOTEMPTY errors, SIGKILL  
**Решение:** Использовать Vercel для сборки, локально работать без переустановки

### 2. Middleware блокирует .json файлы
**Проблема:** Lottie анимации не загружались  
**Решение:** Добавлен `.json` в matcher exclusions (commit 0212558)

### 3. RLS блокирует публичные эндпоинты
**Проблема:** Booking page не работала  
**Решение:** Отдельные политики для публичного доступа + проверки в API routes

### 4. Stale auth cookies
**Проблема:** Невалидные JWT токены вызывали ошибки  
**Решение:** Try-catch в middleware с очисткой всех `sb-*` cookies

### 5. Красные лучи вокруг AI кнопки
**Проблема:** Lottie анимация рисует за пределами границ  
**Решение:** Уменьшен масштаб всех слоёв на 15% (commit e1f4133)

---

## 📝 Git Workflow

```bash
# Основная ветка
main → автодеплой на Vercel

# Commits format (примеры):
# feat: Add booking public page
# fix: Middleware blocking .json files
# refactor: Update RLS policies for services
# docs: Add API documentation
```

**Репозиторий:** `github.com/Creepie132/trinity`  
**Автор:** ambersolutions.systems@gmail.com  

---

## 📚 Полезные ссылки

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Inforu API Docs:** https://www.inforu.co.il/api

---

**Документация создана:** 2026-02-19  
**Версия проекта:** Trinity CRM V2.4.0

---

## 🎯 Следующие шаги (Roadmap)

- [ ] Добавить поддержку WhatsApp бронирования
- [ ] Интеграция с Google Calendar
- [ ] Мобильное приложение (React Native)
- [ ] Расширенная аналитика и отчёты
- [ ] Multi-language поддержка интерфейса
- [ ] API для сторонних интеграций
- [ ] Система лояльности клиентов

---

_Этот документ создан автоматически на основе анализа кодовой базы Trinity CRM._

