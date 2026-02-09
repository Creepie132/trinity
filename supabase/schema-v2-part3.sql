-- Trinity CRM v2.0 Migration - Part 3
-- RLS for organizations, org_users, admin_users, ad_campaigns + Updated Views
-- Run this AFTER schema-v2-part2.sql in Supabase SQL Editor

-- =============================================
-- 1. ORGANIZATIONS RLS
-- =============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org" 
  ON organizations FOR SELECT 
  USING (id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Admin manage orgs" 
  ON organizations FOR ALL 
  USING (is_admin());

-- =============================================
-- 2. ORG_USERS RLS
-- =============================================
ALTER TABLE org_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org users" 
  ON org_users FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Admin manage org users" 
  ON org_users FOR ALL 
  USING (is_admin());

-- =============================================
-- 3. ADMIN_USERS RLS
-- =============================================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only" 
  ON admin_users FOR ALL 
  USING (is_admin());

-- =============================================
-- 4. AD_CAMPAIGNS RLS
-- =============================================
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All see active ads" 
  ON ad_campaigns FOR SELECT 
  USING (is_active = true OR is_admin());

CREATE POLICY "Admin manage ads" 
  ON ad_campaigns FOR ALL 
  USING (is_admin());

-- =============================================
-- 5. UPDATE CLIENT_SUMMARY VIEW
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
-- NOTES:
-- =============================================
-- Security Model Complete:
-- 1. organizations - Users see only their org, admins see all
-- 2. org_users - Users see users from their orgs, admins manage all
-- 3. admin_users - Only admins can see/manage this table
-- 4. ad_campaigns - All authenticated users see active ads, admins manage
-- 5. client_summary view updated with org_id field
--
-- Next Steps:
-- 1. Test RLS policies with test users
-- 2. Create seed data (test organizations + users)
-- 3. Update frontend to pass org_id in queries
-- 4. Add org selector in UI for users with multiple orgs
-- 5. Build admin panel
