-- ========================================
-- FIX: RLS Policies for Organizations Table
-- Allows admins to create/manage organizations
-- ========================================

-- 1. DROP existing policies if any
DROP POLICY IF EXISTS "Admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Admins full access to organizations" ON organizations;

-- 2. Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 3. Allow admins to do everything with organizations
CREATE POLICY "Admins full access to organizations"
  ON organizations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Allow org users to view their own organization (read-only)
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid())
  );

-- 5. Allow org owners to update their own organization
CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT org_id FROM org_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ========================================
-- VERIFY POLICIES
-- ========================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY policyname;
