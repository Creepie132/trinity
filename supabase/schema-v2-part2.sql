-- Trinity CRM v2.0 Migration - Part 2
-- Row Level Security (RLS) policies for multi-tenancy
-- Run this AFTER schema-v2-part1.sql in Supabase SQL Editor

-- =============================================
-- 1. DROP OLD POLICIES
-- =============================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON clients;
DROP POLICY IF EXISTS "Allow all for authenticated" ON visits;
DROP POLICY IF EXISTS "Allow all for authenticated" ON payments;
DROP POLICY IF EXISTS "Allow all for authenticated" ON sms_campaigns;
DROP POLICY IF EXISTS "Allow all for authenticated" ON sms_messages;

-- =============================================
-- 2. HELPER FUNCTIONS
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
-- 3. CLIENTS RLS POLICIES
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
-- 4. VISITS RLS POLICIES
-- =============================================
CREATE POLICY "Users see own org visits" 
  ON visits FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org visits" 
  ON visits FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- =============================================
-- 5. PAYMENTS RLS POLICIES
-- =============================================
CREATE POLICY "Users see own org payments" 
  ON payments FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org payments" 
  ON payments FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- =============================================
-- 6. SMS CAMPAIGNS RLS POLICIES
-- =============================================
CREATE POLICY "Users see own org campaigns" 
  ON sms_campaigns FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org campaigns" 
  ON sms_campaigns FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- =============================================
-- 7. SMS MESSAGES RLS POLICIES
-- =============================================
CREATE POLICY "Users see own org messages" 
  ON sms_messages FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users manage own org messages" 
  ON sms_messages FOR ALL 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- =============================================
-- NOTES:
-- =============================================
-- Security Model:
-- 1. Users can only access data from their organization(s)
-- 2. Admins (admin_users table) have access to ALL data
-- 3. Each org_user can belong to multiple organizations
-- 4. Policies use SECURITY DEFINER functions for performance
--
-- Next Steps:
-- 1. Migrate existing data: UPDATE clients SET org_id = (SELECT id FROM organizations LIMIT 1);
-- 2. Make org_id NOT NULL after data migration
-- 3. Add organizations RLS policies
-- 4. Add org_users RLS policies
-- 5. Test with real users
