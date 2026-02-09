-- =============================================
-- TRINITY CRM v2.0 - Complete Migration
-- =============================================
-- Multi-tenancy + Organizations + Admin Panel + Ad Campaigns + RLS
-- Run this in Supabase SQL Editor
-- 
-- Author: Amber Solutions Systems
-- Date: 2026-02-08
-- =============================================

-- =============================================
-- PART 1: CREATE NEW TABLES
-- =============================================

-- 1. ORGANIZATIONS TABLE
-- =============================================
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
-- =============================================
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
-- =============================================
CREATE TABLE admin_users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL
);

-- 4. AD CAMPAIGNS TABLE
-- =============================================
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

-- =============================================
-- PART 2: ADD org_id TO EXISTING TABLES
-- =============================================
ALTER TABLE clients ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE visits ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE sms_campaigns ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE sms_messages ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- =============================================
-- PART 3: CREATE INDEXES
-- =============================================
CREATE INDEX idx_clients_org_id ON clients(org_id);
CREATE INDEX idx_visits_org_id ON visits(org_id);
CREATE INDEX idx_payments_org_id ON payments(org_id);
CREATE INDEX idx_sms_campaigns_org_id ON sms_campaigns(org_id);
CREATE INDEX idx_ad_campaigns_active ON ad_campaigns(is_active, start_date, end_date);

-- =============================================
-- PART 4: DROP OLD RLS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON clients;
DROP POLICY IF EXISTS "Allow all for authenticated" ON visits;
DROP POLICY IF EXISTS "Allow all for authenticated" ON payments;
DROP POLICY IF EXISTS "Allow all for authenticated" ON sms_campaigns;
DROP POLICY IF EXISTS "Allow all for authenticated" ON sms_messages;

-- =============================================
-- PART 5: CREATE HELPER FUNCTIONS
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
-- PART 6: RLS POLICIES - CLIENTS
-- =============================================
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

-- =============================================
-- PART 7: RLS POLICIES - VISITS
-- =============================================
CREATE POLICY "Users see own org visits" 
  ON visits FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org visits" 
  ON visits FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- =============================================
-- PART 8: RLS POLICIES - PAYMENTS
-- =============================================
CREATE POLICY "Users see own org payments" 
  ON payments FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org payments" 
  ON payments FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- =============================================
-- PART 9: RLS POLICIES - SMS CAMPAIGNS
-- =============================================
CREATE POLICY "Users see own org campaigns" 
  ON sms_campaigns FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org campaigns" 
  ON sms_campaigns FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- =============================================
-- PART 10: RLS POLICIES - SMS MESSAGES
-- =============================================
CREATE POLICY "Users see own org messages" 
  ON sms_messages FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org messages" 
  ON sms_messages FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- =============================================
-- PART 11: RLS POLICIES - ORGANIZATIONS
-- =============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org" 
  ON organizations FOR SELECT 
  USING (id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Admin manage orgs" 
  ON organizations FOR ALL 
  USING (is_admin());

-- =============================================
-- PART 12: RLS POLICIES - ORG_USERS
-- =============================================
ALTER TABLE org_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org users" 
  ON org_users FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Admin manage org users" 
  ON org_users FOR ALL 
  USING (is_admin());

-- =============================================
-- PART 13: RLS POLICIES - ADMIN_USERS
-- =============================================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only" 
  ON admin_users FOR ALL 
  USING (is_admin());

-- =============================================
-- PART 14: RLS POLICIES - AD_CAMPAIGNS
-- =============================================
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All see active ads" 
  ON ad_campaigns FOR SELECT 
  USING (is_active = true OR is_admin());

CREATE POLICY "Admin manage ads" 
  ON ad_campaigns FOR ALL 
  USING (is_admin());

-- =============================================
-- PART 15: UPDATE VIEWS
-- =============================================
DROP VIEW IF EXISTS client_summary;

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
-- MIGRATION COMPLETE
-- =============================================
-- Next Steps:
-- 1. Create test organization:
--    INSERT INTO organizations (name, email, category) VALUES ('Test Business', 'test@example.com', 'salon') RETURNING id;
--
-- 2. Migrate existing data (replace <org_id> with actual ID):
--    UPDATE clients SET org_id = '<org_id>';
--    UPDATE visits SET org_id = '<org_id>';
--    UPDATE payments SET org_id = '<org_id>';
--    UPDATE sms_campaigns SET org_id = '<org_id>';
--    UPDATE sms_messages SET org_id = '<org_id>';
--
-- 3. Make org_id NOT NULL (after data migration):
--    ALTER TABLE clients ALTER COLUMN org_id SET NOT NULL;
--    ALTER TABLE visits ALTER COLUMN org_id SET NOT NULL;
--    ALTER TABLE payments ALTER COLUMN org_id SET NOT NULL;
--    ALTER TABLE sms_campaigns ALTER COLUMN org_id SET NOT NULL;
--    ALTER TABLE sms_messages ALTER COLUMN org_id SET NOT NULL;
--
-- 4. Create admin user (replace <user_id> and <email>):
--    INSERT INTO admin_users (user_id, email) VALUES ('<user_id>', '<email>');
--
-- 5. Create org user (replace <org_id>, <user_id>, <email>):
--    INSERT INTO org_users (org_id, user_id, email, role, joined_at) 
--    VALUES ('<org_id>', '<user_id>', '<email>', 'owner', NOW());
--
-- Security Model:
-- - Users can only see/manage data from their organization(s)
-- - Admins have full access to all data
-- - Ad campaigns visible to all authenticated users (active only)
-- - Organizations and users managed by admins only
