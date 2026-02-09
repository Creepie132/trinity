-- Trinity CRM v2.0 Migration - Part 1
-- Multi-tenancy (Organizations) + Admin Panel + Ad Campaigns
-- Run this in Supabase SQL Editor

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

-- =============================================
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

-- =============================================
-- 3. ADMIN USERS TABLE
-- =============================================
CREATE TABLE admin_users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL
);

-- =============================================
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
-- 5. ADD org_id TO EXISTING TABLES
-- =============================================
ALTER TABLE clients ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE visits ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE sms_campaigns ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE sms_messages ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- =============================================
-- 6. CREATE INDEXES
-- =============================================
CREATE INDEX idx_clients_org_id ON clients(org_id);
CREATE INDEX idx_visits_org_id ON visits(org_id);
CREATE INDEX idx_payments_org_id ON payments(org_id);
CREATE INDEX idx_sms_campaigns_org_id ON sms_campaigns(org_id);
CREATE INDEX idx_ad_campaigns_active ON ad_campaigns(is_active, start_date, end_date);

-- =============================================
-- NOTES:
-- =============================================
-- After running this migration:
-- 1. Existing data will have NULL org_id (need data migration)
-- 2. Update RLS policies to filter by org_id
-- 3. Add auth checks in API routes
-- 4. Create admin panel for managing organizations
-- 5. Implement ad banner rotation logic
