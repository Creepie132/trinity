-- =============================================
-- FIX: org_users table - ensure user_id is set
-- =============================================
-- This script helps diagnose and fix missing user_id values in org_users
-- Run this in Supabase SQL Editor
-- =============================================

-- STEP 1: Check current state
-- =============================================
-- This shows all org_users records and their user_id status
SELECT 
  id,
  org_id,
  user_id,
  email,
  role,
  invited_at,
  joined_at,
  CASE 
    WHEN user_id IS NULL THEN '❌ Missing user_id'
    ELSE '✅ Has user_id'
  END as status
FROM org_users
ORDER BY created_at DESC;

-- STEP 2: Find matching auth.users for org_users without user_id
-- =============================================
-- This query shows which org_users can be linked to auth.users by email
SELECT 
  ou.id as org_user_id,
  ou.email as org_email,
  ou.user_id as current_user_id,
  au.id as auth_user_id,
  CASE 
    WHEN au.id IS NOT NULL AND ou.user_id IS NULL THEN '🔧 CAN FIX'
    WHEN au.id IS NOT NULL AND ou.user_id IS NOT NULL THEN '✅ Already linked'
    WHEN au.id IS NULL THEN '⚠️  No matching auth user'
  END as fix_status
FROM org_users ou
LEFT JOIN auth.users au ON au.email = ou.email
ORDER BY ou.created_at DESC;

-- STEP 3: Auto-fix missing user_id (if email matches)
-- =============================================
-- WARNING: Only run this if STEP 2 shows fixable records!
-- This updates org_users.user_id where it's NULL but a matching auth.users exists

UPDATE org_users
SET 
  user_id = auth_users.id,
  joined_at = CASE 
    WHEN joined_at IS NULL THEN NOW() 
    ELSE joined_at 
  END
FROM (
  SELECT id, email 
  FROM auth.users
) AS auth_users
WHERE 
  org_users.email = auth_users.email 
  AND org_users.user_id IS NULL;

-- STEP 4: Verify the fix
-- =============================================
SELECT 
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_missing_user_id
FROM org_users;

-- STEP 5: If you need to manually add a user to org_users
-- =============================================
-- Replace the placeholders with actual values:
-- 
-- INSERT INTO org_users (org_id, user_id, email, role, joined_at)
-- VALUES (
--   '<your-org-id>',           -- Get from organizations table
--   '<user-id-from-auth>',      -- Get from auth.users
--   'user@example.com',         -- User's email
--   'owner',                    -- Role: owner/admin/staff
--   NOW()                       -- Current timestamp
-- );

-- STEP 6: Check if current logged-in user has org_users record
-- =============================================
-- Run this in Supabase Dashboard (logged in):
SELECT 
  ou.*,
  o.name as org_name,
  o.category
FROM org_users ou
JOIN organizations o ON o.id = ou.org_id
WHERE ou.user_id = auth.uid();

-- If this returns no rows, you need to add yourself:
-- INSERT INTO org_users (org_id, user_id, email, role, joined_at)
-- SELECT 
--   '<org-id>',  -- Replace with your org ID
--   auth.uid(),
--   (SELECT email FROM auth.users WHERE id = auth.uid()),
--   'owner',
--   NOW();

-- =============================================
-- COMMON ISSUES AND SOLUTIONS
-- =============================================
-- 
-- Issue 1: "Missing orgId 0" when adding client
-- Cause: user_id is NULL in org_users, so useAuth() can't find the org
-- Fix: Run STEP 3 above to auto-link by email
-- 
-- Issue 2: User exists in auth.users but not in org_users
-- Cause: User was created but never added to an organization
-- Fix: Run STEP 5 to manually add them
-- 
-- Issue 3: Multiple org_users records for same email
-- Cause: User is member of multiple organizations
-- Fix: This is normal! useAuth() will return the first org_id
--       Consider adding org switcher UI if needed
-- 
-- =============================================
