-- =============================================
-- TRINITY CRM V2 - Tables Structure Only
-- =============================================
-- Version: 2.4.0
-- Date: 2026-02-10
-- Description: Clean table structure with relationships
-- No RLS, no policies, no functions, no indexes
-- =============================================

-- =============================================
-- TABLE 1: ORGANIZATIONS
-- =============================================
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text,
  phone text,
  category text DEFAULT 'other' CHECK (category IN ('salon','carwash','clinic','restaurant','gym','other')),
  plan text DEFAULT 'basic' CHECK (plan IN ('basic','pro','enterprise')),
  is_active boolean DEFAULT true,
  features jsonb DEFAULT '{"sms": true, "payments": true, "analytics": true}'::jsonb,
  billing_status text DEFAULT 'trial' CHECK (billing_status IN ('trial','paid','overdue','cancelled')),
  billing_due_date date,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- TABLE 2: ORG_USERS
-- =============================================
CREATE TABLE org_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'owner' CHECK (role IN ('owner','admin','staff')),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  UNIQUE(org_id, email)
);

-- =============================================
-- TABLE 3: ADMIN_USERS
-- =============================================
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- TABLE 4: AD_CAMPAIGNS
-- =============================================
CREATE TABLE ad_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertiser_name text NOT NULL,
  banner_url text NOT NULL,
  link_url text NOT NULL,
  target_categories text[] DEFAULT ARRAY[]::text[],
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- TABLE 5: CLIENTS
-- =============================================
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  date_of_birth date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- TABLE 6: VISITS
-- =============================================
CREATE TABLE visits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visit_date timestamptz NOT NULL,
  service_description text,
  amount numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- TABLE 7: PAYMENTS
-- =============================================
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES visits(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'ILS' CHECK (currency IN ('ILS','USD','EUR')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  payment_method text,
  payment_link text,
  transaction_id text,
  provider text DEFAULT 'tranzilla',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- TABLE 8: SMS_CAMPAIGNS
-- =============================================
CREATE TABLE sms_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  message text NOT NULL,
  filter_type text DEFAULT 'all' CHECK (filter_type IN ('all','single','inactive_days')),
  filter_value text,
  recipients_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft','sending','completed','failed')),
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- =============================================
-- TABLE 9: SMS_MESSAGES
-- =============================================
CREATE TABLE sms_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed')),
  error text,
  sent_at timestamptz
);

-- =============================================
-- RELATIONSHIPS SUMMARY
-- =============================================
--
-- PARENT → CHILD (1:N)
-- =============================================
-- organizations → org_users
-- organizations → clients
-- organizations → visits
-- organizations → payments
-- organizations → sms_campaigns
-- organizations → sms_messages
--
-- clients → visits
-- clients → payments
-- clients → sms_messages
--
-- visits → payments (optional via visit_id)
--
-- sms_campaigns → sms_messages
--
-- auth.users → org_users
-- auth.users → admin_users (1:1 via UNIQUE)
--
-- =============================================
-- CASCADE BEHAVIOR
-- =============================================
-- ON DELETE CASCADE:
--   organizations → deletes all children
--   clients → deletes visits, payments, sms_messages
--   sms_campaigns → deletes sms_messages
--   auth.users → deletes org_users, admin_users
--
-- ON DELETE SET NULL:
--   visits → sets payments.visit_id = NULL
--
-- =============================================
-- DATA TYPES SUMMARY
-- =============================================
-- uuid - Primary keys and foreign keys
-- text - Strings (names, emails, messages)
-- text[] - Arrays (target_categories)
-- jsonb - JSON objects (features)
-- boolean - True/false flags
-- integer - Counters
-- numeric(10,2) - Decimal numbers (money)
-- date - Dates only (no time)
-- timestamptz - Timestamps with timezone
--
-- =============================================
-- END OF SCHEMA
-- =============================================
