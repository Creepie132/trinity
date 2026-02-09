-- ========================================
-- FIX: RLS Policies for admin_users and org_users
-- Proper access control for user management tables
-- ========================================

-- =============================================
-- 1. ADMIN_USERS TABLE
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage admin_users" ON admin_users;
DROP POLICY IF EXISTS "Users can view themselves" ON admin_users;

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin_users table
CREATE POLICY "Admins can view all admin_users"
  ON admin_users FOR SELECT
  USING (is_admin());

-- Only admins can manage admin_users
CREATE POLICY "Admins can manage admin_users"
  ON admin_users FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can view themselves (for profile display)
CREATE POLICY "Users can view themselves"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid());

-- =============================================
-- 2. ORG_USERS TABLE
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all org_users" ON org_users;
DROP POLICY IF EXISTS "Admins can manage org_users" ON org_users;
DROP POLICY IF EXISTS "Users can view their own org" ON org_users;
DROP POLICY IF EXISTS "Owners can manage their org users" ON org_users;

-- Enable RLS
ALTER TABLE org_users ENABLE ROW LEVEL SECURITY;

-- Admins can view all org_users
CREATE POLICY "Admins can view all org_users"
  ON org_users FOR SELECT
  USING (is_admin());

-- Admins can manage all org_users
CREATE POLICY "Admins can manage org_users"
  ON org_users FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can view org_users from their organization
CREATE POLICY "Users can view their org members"
  ON org_users FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid())
  );

-- Org owners can manage users in their organization
CREATE POLICY "Owners can manage their org users"
  ON org_users FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ========================================
-- VERIFY POLICIES
-- ========================================

-- Check admin_users policies
SELECT 
  'admin_users' as table_name,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'admin_users'
ORDER BY policyname;

-- Check org_users policies
SELECT 
  'org_users' as table_name,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'org_users'
ORDER BY policyname;
