# 📚 Trinity Project — Complete Structure & Documentation

**Project:** clientbase-pro (Trinity v2.42.0)  
**Last Updated:** 2026-02-21 12:30 UTC  
**Repository:** https://github.com/Creepie132/trinity  
**Current Commit:** `13cb0d4`

---

## 📁 Project Structure

```
clientbase-pro/
├── src/
│   ├── app/
│   │   ├── (dashboard)/              # Protected pages (requires auth)
│   │   │   ├── analytics/            # Analytics page
│   │   │   ├── clients/              # Client management
│   │   │   │   └── import/           # CSV import
│   │   │   ├── dashboard/            # Main dashboard
│   │   │   ├── debug-admin/          # Admin debug tools
│   │   │   ├── inventory/            # Inventory management
│   │   │   ├── partners/             # Partner management
│   │   │   ├── payments/             # Payment history
│   │   │   ├── profile/              # User profile
│   │   │   ├── reports/              # Reports page
│   │   │   ├── settings/             # Settings hub
│   │   │   │   ├── birthday-templates/
│   │   │   │   ├── booking/
│   │   │   │   ├── care-instructions/
│   │   │   │   ├── customize/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── display/
│   │   │   │   ├── language/
│   │   │   │   ├── loyalty/
│   │   │   │   ├── notifications/
│   │   │   │   ├── service-colors/
│   │   │   │   ├── services/
│   │   │   │   ├── templates/
│   │   │   │   └── users/           # Owner-only
│   │   │   ├── settings-new/
│   │   │   ├── sms/                  # SMS campaigns
│   │   │   ├── stats/                # Statistics
│   │   │   ├── visits/               # Visit management
│   │   │   ├── layout.tsx
│   │   │   └── loading.tsx
│   │   ├── admin/                    # Super-admin panel
│   │   │   ├── ads/                  # Ad campaigns
│   │   │   ├── billing/              # Billing management
│   │   │   ├── organizations/        # Org management
│   │   │   ├── settings/             # Admin settings
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── api/                      # API Routes (56 endpoints)
│   │   │   ├── admin/
│   │   │   │   ├── assign/route.ts
│   │   │   │   ├── check/route.ts
│   │   │   │   ├── org-subscription/route.ts
│   │   │   │   ├── organizations/
│   │   │   │   │   ├── [orgId]/stats/route.ts
│   │   │   │   │   └── create/route.ts
│   │   │   │   ├── profile/route.ts
│   │   │   │   └── seed-test-data/route.ts
│   │   │   ├── ads/
│   │   │   │   ├── active/route.ts
│   │   │   │   ├── click/route.ts
│   │   │   │   └── impression/route.ts
│   │   │   ├── booking/              # Public booking
│   │   │   │   └── [slug]/
│   │   │   │       ├── book/route.ts
│   │   │   │       ├── route.ts
│   │   │   │       └── slots/route.ts
│   │   │   ├── care-instructions/
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── route.ts
│   │   │   ├── clients/
│   │   │   │   ├── [id]/gdpr-delete/route.ts
│   │   │   │   └── import/route.ts
│   │   │   ├── contact/route.ts       # Landing contact form
│   │   │   ├── cron/
│   │   │   │   ├── birthdays/route.ts
│   │   │   │   └── reminders/route.ts
│   │   │   ├── dashboard/
│   │   │   │   ├── debts/route.ts
│   │   │   │   ├── reports/route.ts
│   │   │   │   ├── revenue/route.ts
│   │   │   │   ├── stats/route.ts
│   │   │   │   ├── top-services/route.ts
│   │   │   │   └── visits-chart/route.ts
│   │   │   ├── export/route.ts
│   │   │   ├── health/route.ts        # Health check
│   │   │   ├── inventory/route.ts
│   │   │   ├── loyalty/
│   │   │   │   ├── points/route.ts
│   │   │   │   └── settings/route.ts
│   │   │   ├── org/
│   │   │   │   ├── invite-user/route.ts
│   │   │   │   └── link-user/route.ts
│   │   │   ├── organizations/
│   │   │   │   ├── [orgId]/route.ts
│   │   │   │   └── booking-settings/route.ts
│   │   │   ├── payments/
│   │   │   │   ├── callback/route.ts
│   │   │   │   ├── create-link/route.ts
│   │   │   │   ├── stripe-checkout/route.ts
│   │   │   │   ├── stripe-subscription/route.ts
│   │   │   │   ├── stripe-webhook/route.ts
│   │   │   │   ├── tranzilla-token/route.ts
│   │   │   │   └── webhook/route.ts
│   │   │   ├── products/
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── route.ts
│   │   │   ├── search/route.ts
│   │   │   ├── services/
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── route.ts
│   │   │   ├── setup-visits/route.ts
│   │   │   ├── sms/
│   │   │   │   ├── campaign/route.ts
│   │   │   │   └── send/route.ts
│   │   │   ├── templates/route.ts
│   │   │   ├── upload/
│   │   │   │   └── banner/route.ts
│   │   │   └── visits/
│   │   │       ├── [id]/
│   │   │       │   ├── services/
│   │   │       │   │   ├── [serviceId]/route.ts
│   │   │       │   │   └── route.ts
│   │   │       │   └── status/route.ts
│   │   │       └── route.ts
│   │   ├── blocked/                  # Blocked org page
│   │   ├── book/[slug]/              # Public booking UI
│   │   ├── callback/                 # OAuth callback
│   │   ├── landing/                  # Landing page
│   │   ├── login/                    # Login page
│   │   ├── policy/                   # Privacy policy (multilingual)
│   │   ├── terms/                    # Terms of service (multilingual)
│   │   ├── unauthorized/             # No access
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Root page
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   └── globals.css               # Global styles + Neural Grid
│   ├── components/                   # React components (50+)
│   │   ├── admin/
│   │   ├── ads/
│   │   ├── birthdays/
│   │   ├── care-instructions/
│   │   ├── clients/
│   │   ├── inventory/
│   │   ├── landing/
│   │   ├── layout/
│   │   ├── payments/
│   │   ├── profile/
│   │   ├── providers/
│   │   ├── services/
│   │   ├── sms/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── user/
│   │   ├── visits/
│   │   ├── AiChatWidget.tsx          # AI Chat + FAQ + Builder
│   │   ├── ChatButton.tsx            # Lottie animation
│   │   ├── ConditionalChatWidget.tsx # Conditional rendering
│   │   └── ErrorBoundary.tsx
│   ├── contexts/                     # React Contexts
│   │   ├── AuthContext.tsx           # Auth + role
│   │   ├── LanguageContext.tsx       # i18n (Hebrew/Russian/English)
│   │   └── ThemeContext.tsx          # Dark/Light mode
│   ├── hooks/                        # Custom hooks (20+)
│   │   ├── useAdmin.ts
│   │   ├── useAdminProfile.ts
│   │   ├── useAuth.ts
│   │   ├── useBirthdays.ts
│   │   ├── useBookings.ts
│   │   ├── useCareInstructions.ts
│   │   ├── useClients.ts
│   │   ├── useFeatures.ts            # Module features
│   │   ├── useInventory.ts
│   │   ├── useIsAdmin.ts
│   │   ├── useOrganization.ts
│   │   ├── usePayments.ts
│   │   ├── usePermissions.ts         # Role-based permissions
│   │   ├── useProducts.ts
│   │   ├── useServices.ts
│   │   ├── useSms.ts
│   │   ├── useStats.ts
│   │   └── useVisitServices.ts
│   ├── lib/                          # Utilities & integrations
│   │   ├── api-auth.ts               # API auth helpers
│   │   ├── avatar-upload.ts          # Supabase Storage
│   │   ├── emails.ts                 # Resend email
│   │   ├── inforu.ts                 # SMS integration
│   │   ├── pdf-generator.ts          # PDF reports
│   │   ├── rate-limit.ts             # Rate limiting
│   │   ├── stripe.ts                 # Stripe payments
│   │   ├── supabase-browser.ts       # Client-side Supabase
│   │   ├── supabase-service.ts       # Server-side Supabase
│   │   ├── supabase.ts               # Supabase client
│   │   ├── tranzilla.ts              # Israeli payments
│   │   └── utils.ts                  # General utilities
│   └── types/                        # TypeScript types
│       ├── database.ts               # Supabase types
│       ├── inventory.ts
│       ├── services.ts
│       └── visits.ts
├── supabase/                         # SQL migrations & schema
│   ├── migrations/
│   ├── SCHEMA_EXPORT.sql             # Full schema
│   ├── TRINITY_V2_TABLES_ONLY.sql    # Tables only
│   ├── add-booking.sql
│   ├── create-inventory.sql
│   ├── create-services.sql
│   ├── create-visit-services.sql
│   └── (20+ migration files)
├── public/
│   ├── animations/
│   │   ├── ai-button.json            # Lottie (4.6MB)
│   │   └── ai-button.json.backup
│   └── logo.png
├── middleware.ts                     # Auth + routing + CSRF
├── next.config.ts                    # Next.js config + security headers
├── tailwind.config.ts                # Tailwind CSS
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
├── CLAUDE.md                         # Project memory (7444 lines)
├── PROJECT_DOCUMENTATION.md          # Full docs (993 lines)
├── PROJECT_STRUCTURE.md              # This file
└── README.md                         # Project README
```

---

## 🔌 API Routes (56 endpoints)

### Admin Routes (`/api/admin/*`)

**Authentication:** Super-admin only (validates `admin_users` table)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/check` | GET | Validate admin access |
| `/api/admin/assign` | POST | Assign user to organization |
| `/api/admin/profile` | GET | Get admin profile |
| `/api/admin/org-subscription` | POST | Manage org subscription |
| `/api/admin/organizations/create` | POST | Create new organization |
| `/api/admin/organizations/[orgId]` | GET/PATCH/DELETE | Manage organization |
| `/api/admin/organizations/[orgId]/stats` | GET | Get org statistics |
| `/api/admin/seed-test-data` | POST | Seed test data |

### Ads Routes (`/api/ads/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ads/active` | GET | Get active ad campaigns |
| `/api/ads/click` | POST | Track ad click |
| `/api/ads/impression` | POST | Track ad impression |

### Booking Routes (`/api/booking/*`)

**Public:** No authentication required

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/booking/[slug]` | GET | Get booking page data |
| `/api/booking/[slug]/slots` | GET | Get available time slots |
| `/api/booking/[slug]/book` | POST | Create booking |

### Care Instructions Routes (`/api/care-instructions/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/care-instructions` | GET/POST | List/Create care instructions |
| `/api/care-instructions/[id]` | GET/PATCH/DELETE | Manage instruction |

### Client Routes (`/api/clients/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients/import` | POST | Import clients from CSV |
| `/api/clients/[id]/gdpr-delete` | DELETE | GDPR data deletion |

### Contact Route

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contact` | POST | Landing page contact form |

### Cron Routes (`/api/cron/*`)

**Authentication:** Vercel Cron secret

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cron/birthdays` | GET | Send birthday messages |
| `/api/cron/reminders` | GET | Send appointment reminders |

### Dashboard Routes (`/api/dashboard/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | Dashboard stats |
| `/api/dashboard/revenue` | GET | Revenue data |
| `/api/dashboard/debts` | GET | Outstanding debts |
| `/api/dashboard/reports` | GET | Reports summary |
| `/api/dashboard/top-services` | GET | Top services by revenue |
| `/api/dashboard/visits-chart` | GET | Visit chart data |

### Export Route

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/export` | POST | Export data to CSV/Excel |

### Health Check

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check endpoint |

### Inventory Routes (`/api/inventory/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/inventory` | GET/POST/PATCH/DELETE | Manage inventory transactions |

### Loyalty Routes (`/api/loyalty/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/loyalty/points` | GET/POST | Manage loyalty points |
| `/api/loyalty/settings` | GET/PATCH | Loyalty program settings |

### Organization Routes (`/api/org/*`, `/api/organizations/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/org/invite-user` | POST | Invite user to org |
| `/api/org/link-user` | POST | Link user to org |
| `/api/organizations/[orgId]` | GET/PATCH | Manage organization |
| `/api/organizations/booking-settings` | GET/PATCH | Booking settings |

### Payment Routes (`/api/payments/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/create-link` | POST | Create Tranzilla payment link |
| `/api/payments/tranzilla-token` | POST | Get Tranzilla token |
| `/api/payments/callback` | POST | Tranzilla callback |
| `/api/payments/webhook` | POST | Tranzilla webhook |
| `/api/payments/stripe-checkout` | POST | Create Stripe session |
| `/api/payments/stripe-subscription` | POST | Stripe subscription |
| `/api/payments/stripe-webhook` | POST | Stripe webhook |

### Product Routes (`/api/products/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET/POST | List/Create products |
| `/api/products/[id]` | GET/PATCH/DELETE | Manage product |

### Search Route

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search` | GET | Global search |

### Service Routes (`/api/services/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services` | GET/POST | List/Create services |
| `/api/services/[id]` | GET/PATCH/DELETE | Manage service |

### Setup Visits Route

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/setup-visits` | POST | Setup demo visits |

### SMS Routes (`/api/sms/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sms/campaign` | POST | Create SMS campaign |
| `/api/sms/send` | POST | Send individual SMS |

### Template Route

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates` | GET/POST/PATCH/DELETE | Manage templates |

### Upload Routes (`/api/upload/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload/banner` | POST | Upload banner image |

### Visit Routes (`/api/visits/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/visits` | GET/POST | List/Create visits |
| `/api/visits/[id]/status` | PATCH | Update visit status |
| `/api/visits/[id]/services` | GET/POST | Manage visit services |
| `/api/visits/[id]/services/[serviceId]` | PATCH/DELETE | Manage specific service |

---

## 🗄️ Database Schema (Supabase PostgreSQL)

### Core Tables

#### `organizations`
```sql
CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE,
    phone text,
    category text,
    plan text DEFAULT 'free',
    features jsonb DEFAULT '{
      "clients": true,
      "visits": true,
      "booking": false,
      "inventory": false,
      "payments": false,
      "sms": false,
      "statistics": false,
      "reports": false,
      "subscriptions": false,
      "telegram": false,
      "loyalty": false,
      "birthday": false
    }'::jsonb,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### `org_users`
```sql
CREATE TABLE public.org_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    role text DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'owner')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, org_id)
);
```

#### `admin_users`
```sql
CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    name text,
    email text UNIQUE,
    role text DEFAULT 'admin',
    created_at timestamptz DEFAULT now()
);
```

#### `clients`
```sql
CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    email text,
    birth_date date,
    notes text,
    gender text,
    total_spent numeric DEFAULT 0,
    total_visits integer DEFAULT 0,
    loyalty_points integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### `visits`
```sql
CREATE TABLE public.visits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    scheduled_at timestamptz,
    completed_at timestamptz,
    status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    notes text,
    total_price numeric DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### `visit_services`
```sql
CREATE TABLE public.visit_services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    visit_id uuid REFERENCES visits(id) ON DELETE CASCADE,
    service_id uuid REFERENCES services(id),
    service_name text,
    price numeric,
    employee_name text,
    created_at timestamptz DEFAULT now()
);
```

#### `services`
```sql
CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric,
    duration integer,
    color text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### `products`
```sql
CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric,
    cost numeric,
    stock integer DEFAULT 0,
    category text,
    barcode text,
    image_url text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### `inventory_transactions`
```sql
CREATE TABLE public.inventory_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    type text CHECK (type IN ('purchase', 'sale', 'adjustment', 'return')),
    quantity integer NOT NULL,
    price numeric,
    client_id uuid REFERENCES clients(id),
    notes text,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);
```

#### `payments`
```sql
CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    visit_id uuid REFERENCES visits(id),
    amount numeric NOT NULL,
    payment_method text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    provider text,
    transaction_id text,
    paid_at timestamptz,
    created_at timestamptz DEFAULT now()
);
```

#### `sms_campaigns`
```sql
CREATE TABLE public.sms_campaigns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    message text NOT NULL,
    scheduled_at timestamptz,
    sent_at timestamptz,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
    total_recipients integer DEFAULT 0,
    total_sent integer DEFAULT 0,
    total_failed integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);
```

#### `sms_messages`
```sql
CREATE TABLE public.sms_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    phone text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    sent_at timestamptz,
    delivered_at timestamptz,
    error_message text,
    created_at timestamptz DEFAULT now()
);
```

#### `care_instructions`
```sql
CREATE TABLE public.care_instructions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    service_id uuid REFERENCES services(id),
    instructions text NOT NULL,
    sent_at timestamptz,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);
```

#### `booking_settings`
```sql
CREATE TABLE public.booking_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    slug text UNIQUE,
    enabled boolean DEFAULT false,
    business_name text,
    description text,
    working_hours jsonb,
    advance_booking_days integer DEFAULT 30,
    slot_duration integer DEFAULT 30,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### `org_subscriptions`
```sql
CREATE TABLE public.org_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    plan text NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    auto_renew boolean DEFAULT true,
    payment_method text,
    last_payment_at timestamptz,
    created_at timestamptz DEFAULT now()
);
```

#### `ad_campaigns`
```sql
CREATE TABLE public.ad_campaigns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    type text CHECK (type IN ('banner', 'modal', 'notification')),
    target_plan text,
    target_features jsonb,
    content jsonb NOT NULL,
    active boolean DEFAULT true,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    start_date timestamptz,
    end_date timestamptz,
    created_at timestamptz DEFAULT now()
);
```

#### `landing_settings`
```sql
CREATE TABLE public.landing_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    hero_title text,
    hero_subtitle text,
    features jsonb,
    testimonials jsonb,
    contact_email text,
    contact_phone text,
    social_links jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### Database Views

#### `client_summary`
```sql
CREATE VIEW client_summary AS
SELECT 
    c.id,
    c.org_id,
    c.name,
    c.phone,
    c.email,
    c.birth_date,
    c.notes,
    c.gender,
    c.loyalty_points,
    COUNT(v.id) as total_visits,
    COALESCE(SUM(p.amount), 0) as total_spent,
    MAX(v.scheduled_at) as last_visit_date,
    c.created_at,
    c.updated_at
FROM clients c
LEFT JOIN visits v ON v.client_id = c.id
LEFT JOIN payments p ON p.client_id = c.id AND p.status = 'completed'
GROUP BY c.id;
```

---

## 🔒 Row Level Security (RLS) Policies

### Helper Functions

```sql
-- Get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY
  SELECT org_id FROM org_users WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RLS Policies by Table

#### `organizations`
```sql
-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "admin_all" ON organizations
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can see their orgs
CREATE POLICY "user_select" ON organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_org_ids()));

-- Owners can update their org
CREATE POLICY "owner_update" ON organizations
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
```

#### `org_users`
```sql
ALTER TABLE org_users ENABLE ROW LEVEL SECURITY;

-- Users can see members of their orgs
CREATE POLICY "user_select" ON org_users
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

-- Owners can manage users in their org
CREATE POLICY "owner_all" ON org_users
  FOR ALL TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Admins can do anything
CREATE POLICY "admin_all" ON org_users
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
```

#### `clients`
```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Users can access clients in their orgs
CREATE POLICY "user_all" ON clients
  FOR ALL TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

-- Admins can access all
CREATE POLICY "admin_all" ON clients
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
```

#### `visits`
```sql
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Users can access visits for their org's clients
CREATE POLICY "user_all" ON visits
  FOR ALL TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (SELECT get_user_org_ids())
    )
  );
```

#### `visit_services`
```sql
ALTER TABLE visit_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_all" ON visit_services
  FOR ALL TO authenticated
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN clients c ON c.id = v.client_id
      WHERE c.org_id IN (SELECT get_user_org_ids())
    )
  );
```

#### `services`
```sql
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_all" ON services
  FOR ALL TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));
```

#### `products` & `inventory_transactions`
```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_all" ON products
  FOR ALL TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "user_all" ON inventory_transactions
  FOR ALL TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));
```

#### `payments`
```sql
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_all" ON payments
  FOR ALL TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));
```

#### `sms_campaigns` & `sms_messages`
```sql
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_all" ON sms_campaigns
  FOR ALL TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "user_all" ON sms_messages
  FOR ALL TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM sms_campaigns WHERE org_id IN (SELECT get_user_org_ids())
    )
  );
```

#### `booking_settings` (Public SELECT)
```sql
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

-- Public can read by slug
CREATE POLICY "public_select" ON booking_settings
  FOR SELECT TO anon, authenticated
  USING (enabled = true);

-- Users can manage their org's settings
CREATE POLICY "user_all" ON booking_settings
  FOR ALL TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));
```

---

## 🔐 Middleware Configuration

**File:** `middleware.ts`

### Public Paths (No Auth Required)
```typescript
const PUBLIC_PATHS = [
  '/login',
  '/unauthorized',
  '/blocked',
  '/landing',
  '/terms',      // v2.40.0
  '/policy',     // v2.40.0
]

const CALLBACK_PATH = '/callback'
const WEBHOOK_PATH = '/api/payments/webhook'
const STRIPE_WEBHOOK_PATH = '/api/payments/stripe-webhook'
const HEALTH_PATH = '/api/health'
```

### Matcher (Files to Process)
```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)'
  ],
}
```

### Authentication Flow
```typescript
1. Check if path is public → allow
2. Get Supabase session
3. If no session → redirect to /login
4. If session exists → continue
5. CSRF protection for non-GET API routes
```

### CSRF Protection
```typescript
// API routes (non-GET) require same-origin
const csrfExempt = [
  "/api/payments/webhook",
  "/api/payments/stripe-webhook",
  "/api/payments/callback",
  "/api/booking/",
  "/api/contact",
]

// Check origin matches app URL
const origin = req.headers.get("origin")
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ambersol.co.il"

if (origin && !origin.startsWith(appUrl)) {
  return NextResponse.json({ error: "CSRF: Invalid origin" }, { status: 403 })
}
```

---

## 🔑 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# App
NEXT_PUBLIC_APP_URL=https://ambersol.co.il

# Payments
TRANZILLA_TERMINAL_NAME=xxx
TRANZILLA_API_KEY=xxx
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# SMS
INFORU_USERNAME=xxx
INFORU_PASSWORD=xxx

# Email
RESEND_API_KEY=re_xxx

# Cron
CRON_SECRET=xxx
```

---

## 📦 Key Dependencies

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.47.10",
    "@tanstack/react-query": "^5.62.7",
    "next": "^15.1.4",
    "react": "^19.0.0",
    "stripe": "^17.5.0",
    "recharts": "^2.15.0",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2"
  }
}
```

---

## 🏗️ Architecture

### Multi-Tenancy
- **Organization-based:** Each business is an `organization`
- **RLS Isolation:** Database-level tenant separation
- **Function-based:** `get_user_org_ids()` enforces boundaries

### Authentication
- **Supabase Auth:** JWT tokens
- **Middleware:** Session validation on every request
- **Context:** `AuthContext` provides user + role

### Role Hierarchy
```
super-admin (admin_users)
  └─ owner (org_users)
      └─ moderator (org_users)
          └─ user (org_users)
```

### State Management
- **React Query:** Server state caching
- **Context API:** Global state (auth, language, theme)
- **Local State:** Component-specific

---

## 🚀 Deployment

### Vercel
- **Auto-deploy:** Push to `main` → Production
- **Build Command:** `npm run build`
- **Output:** Static + Serverless

### Supabase
- **Database:** PostgreSQL with RLS
- **Auth:** Built-in authentication
- **Storage:** File uploads (avatars, banners)

---

## 🎯 Feature Flags (Modular System)

```typescript
interface OrganizationFeatures {
  clients: boolean       // Client management
  visits: boolean        // Visit scheduling
  booking: boolean       // Public booking
  inventory: boolean     // Product inventory
  payments: boolean      // Payment processing
  sms: boolean           // SMS campaigns
  statistics: boolean    // /stats page
  reports: boolean       // /analytics page
  subscriptions: boolean // Recurring billing
  telegram: boolean      // Telegram notifications
  loyalty: boolean       // Loyalty points
  birthday: boolean      // Birthday messages
}
```

**Default:** `clients`, `visits` enabled  
**Premium:** All features enabled

---

## 📝 Recent Changes (v2.40.0 - v2.42.0)

### v2.42.0 (2026-02-21)
- ✅ Added "Setup Fee" section to `/policy` (Russian + English)

### v2.41.0 (2026-02-21)
- ✅ Multilingual support for `/terms` and `/policy` (Hebrew, Russian, English)
- ✅ Language switcher in headers

### v2.40.0 (2026-02-21)
- ✅ Created `/terms` and `/policy` pages
- ✅ Updated footer with payment icons + legal links
- ✅ Added consent checkbox in AI chat builder
- ✅ Neural grid background with animated nodes

### v2.39.0 (2026-02-21)
- ✅ Fixed critical header layout bug (logo overlap)
- ✅ Added `flexShrink: 0`, `gap: 32px`, `padding-right: 40px`

### v2.38.0 (2026-02-21)
- ✅ Added Assistant font for Hebrew header navigation

### v2.37.0 (2026-02-21)
- ✅ Inter font + proper spacing for Russian header

---

**End of Documentation**

*For live updates, see `CLAUDE.md` (project memory)*
