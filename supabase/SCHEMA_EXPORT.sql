-- =============================================
-- TRINITY CRM - Complete Database Schema Export
-- =============================================
-- Version: 2.4.0
-- Date: 2026-02-10
-- Description: Full schema with all tables, columns, and relationships
-- Author: Amber Solutions Systems
-- =============================================

-- =============================================
-- CORE TABLES
-- =============================================

-- 1. ORGANIZATIONS TABLE
-- Multi-tenant isolation, each organization is a separate customer
CREATE TABLE organizations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
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

-- 2. ORGANIZATION USERS TABLE
-- Users belonging to organizations (multi-user per org)
CREATE TABLE org_users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'owner' CHECK (role IN ('owner','admin','staff')),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  UNIQUE(org_id, email)
);

-- 3. ADMIN USERS TABLE
-- Super-admins with access to admin panel
CREATE TABLE admin_users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
  created_at timestamptz DEFAULT now()
);

-- 4. AD CAMPAIGNS TABLE
-- Banner advertisements with targeting
CREATE TABLE ad_campaigns (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  advertiser_name text NOT NULL,
  banner_url text NOT NULL,
  link_url text NOT NULL,
  target_categories text[] DEFAULT '{}',
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. CLIENTS TABLE
-- Customer records per organization
CREATE TABLE clients (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
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

-- 6. VISITS TABLE
-- Service visits by clients
CREATE TABLE visits (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  visit_date timestamptz NOT NULL,
  service_description text,
  amount numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 7. PAYMENTS TABLE
-- Payment records and transactions
CREATE TABLE payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
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

-- 8. SMS CAMPAIGNS TABLE
-- SMS marketing campaigns
CREATE TABLE sms_campaigns (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
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

-- 9. SMS MESSAGES TABLE
-- Individual SMS messages
CREATE TABLE sms_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES sms_campaigns(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed')),
  error text,
  sent_at timestamptz
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_clients_org_id ON clients(org_id);
CREATE INDEX idx_visits_org_id ON visits(org_id);
CREATE INDEX idx_visits_client_id ON visits(client_id);
CREATE INDEX idx_payments_org_id ON payments(org_id);
CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_sms_campaigns_org_id ON sms_campaigns(org_id);
CREATE INDEX idx_sms_messages_campaign_id ON sms_messages(campaign_id);
CREATE INDEX idx_ad_campaigns_active ON ad_campaigns(is_active, start_date, end_date);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get all organization IDs for current user
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF uuid AS $$
  SELECT org_id 
  FROM org_users 
  WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- ORGANIZATIONS POLICIES
CREATE POLICY "Users see own org" 
  ON organizations FOR SELECT 
  USING (id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Admin manage orgs" 
  ON organizations FOR ALL 
  USING (is_admin());

-- ORG_USERS POLICIES
CREATE POLICY "Users see own org users" 
  ON org_users FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Admin manage org users" 
  ON org_users FOR ALL 
  USING (is_admin());

-- ADMIN_USERS POLICIES
CREATE POLICY "Admin only" 
  ON admin_users FOR ALL 
  USING (is_admin());

-- AD_CAMPAIGNS POLICIES
CREATE POLICY "All see active ads" 
  ON ad_campaigns FOR SELECT 
  USING (is_active = true OR is_admin());

CREATE POLICY "Admin manage ads" 
  ON ad_campaigns FOR ALL 
  USING (is_admin());

-- CLIENTS POLICIES
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

-- VISITS POLICIES
CREATE POLICY "Users see own org visits" 
  ON visits FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org visits" 
  ON visits FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- PAYMENTS POLICIES
CREATE POLICY "Users see own org payments" 
  ON payments FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org payments" 
  ON payments FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- SMS_CAMPAIGNS POLICIES
CREATE POLICY "Users see own org campaigns" 
  ON sms_campaigns FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org campaigns" 
  ON sms_campaigns FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- SMS_MESSAGES POLICIES
CREATE POLICY "Users see own org messages" 
  ON sms_messages FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org messages" 
  ON sms_messages FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- =============================================
-- VIEWS
-- =============================================

-- Client summary with aggregated stats
CREATE OR REPLACE VIEW client_summary AS
SELECT 
  c.id,
  c.org_id,
  c.first_name,
  c.last_name,
  c.phone,
  c.email,
  c.date_of_birth,
  c.address,
  c.notes,
  c.created_at,
  MAX(v.visit_date) AS last_visit,
  COUNT(DISTINCT v.id) AS total_visits,
  COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS total_paid
FROM clients c
LEFT JOIN visits v ON v.client_id = c.id
LEFT JOIN payments p ON p.client_id = c.id
GROUP BY c.id;

-- =============================================
-- TABLE RELATIONSHIPS DIAGRAM
-- =============================================
-- 
-- organizations (1) ──< (N) org_users
--      │
--      │ (1)
--      │
--      └──< (N) clients ──< (N) visits
--               │              │
--               │ (1)          │ (1)
--               │              │
--               └──< (N) payments
--                    │
--                    └── (0..1) visit_id → visits
--      
-- organizations (1) ──< (N) sms_campaigns ──< (N) sms_messages
--                                                  │
--                                                  └── (N) → clients
--
-- auth.users (1) ──< (N) org_users
-- auth.users (1) ──< (N) admin_users
--
-- ad_campaigns (independent, no FK relationships)
--
-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations (SaaS customers)';
COMMENT ON TABLE org_users IS 'Users belonging to organizations';
COMMENT ON TABLE admin_users IS 'Super-admins with full system access';
COMMENT ON TABLE ad_campaigns IS 'Banner advertisement campaigns';
COMMENT ON TABLE clients IS 'Customer records';
COMMENT ON TABLE visits IS 'Service visits by customers';
COMMENT ON TABLE payments IS 'Payment transactions';
COMMENT ON TABLE sms_campaigns IS 'SMS marketing campaigns';
COMMENT ON TABLE sms_messages IS 'Individual SMS messages';

COMMENT ON COLUMN admin_users.role IS 'Admin role: admin (full access) or moderator (limited access)';
COMMENT ON COLUMN admin_users.full_name IS 'Full name of the admin user';
COMMENT ON COLUMN organizations.features IS 'JSONB object controlling feature access: {"sms": bool, "payments": bool, "analytics": bool}';
COMMENT ON COLUMN organizations.is_active IS 'Organization active status (for blocking)';

-- =============================================
-- END OF SCHEMA EXPORT
-- =============================================
