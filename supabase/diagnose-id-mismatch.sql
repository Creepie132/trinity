-- =====================================================
-- Diagnostic Script: Check for User ID Mismatch
-- =====================================================
-- This script helps identify if any org_users records
-- were created with CRM client.id instead of auth user.id

-- PROBLEM: 
-- public.clients.id (CRM) != auth.users.id (Supabase Auth)
-- If org_users.user_id = client.id → Access Denied on login

-- =====================================================
-- 1. Find org_users that DON'T match any auth.users
-- =====================================================
SELECT 
  ou.id AS org_user_id,
  ou.user_id AS "user_id (might be CRM ID!)",
  ou.email,
  ou.org_id,
  ou.role,
  ou.invited_at,
  CASE 
    WHEN au.id IS NULL THEN '❌ NO MATCH in auth.users'
    ELSE '✅ Valid auth user'
  END AS status
FROM public.org_users ou
LEFT JOIN auth.users au ON ou.user_id = au.id
WHERE au.id IS NULL
ORDER BY ou.invited_at DESC;

-- If this returns rows, those are MISMATCHED entries!
-- The user_id is probably a CRM client.id, not an auth.users.id

-- =====================================================
-- 2. Find clients with matching email in auth.users
-- =====================================================
-- This helps identify which CRM clients have logged in
SELECT 
  c.id AS client_crm_id,
  c.first_name,
  c.last_name,
  c.email,
  au.id AS auth_user_id,
  CASE 
    WHEN au.id IS NOT NULL THEN '✅ User exists in auth'
    ELSE '❌ User never logged in'
  END AS auth_status
FROM public.clients c
LEFT JOIN auth.users au ON LOWER(c.email) = LOWER(au.email)
WHERE c.email IS NOT NULL
ORDER BY c.email;

-- =====================================================
-- 3. Fix mismatched org_users entries (RUN CAREFULLY!)
-- =====================================================
-- BACKUP FIRST!
-- This updates org_users.user_id from CRM ID to Auth ID

-- Step 1: Preview what will be updated
SELECT 
  ou.id AS org_user_record_id,
  ou.user_id AS "OLD user_id (CRM ID)",
  au.id AS "NEW user_id (Auth ID)",
  ou.email,
  c.id AS client_crm_id
FROM public.org_users ou
LEFT JOIN auth.users au ON LOWER(ou.email) = LOWER(au.email)
LEFT JOIN public.clients c ON LOWER(c.email) = LOWER(ou.email)
WHERE ou.user_id NOT IN (SELECT id FROM auth.users)
  AND au.id IS NOT NULL;

-- Step 2: BACKUP before fixing (create temp table)
CREATE TEMP TABLE org_users_backup AS
SELECT * FROM public.org_users
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 3: Fix the mismatch (UNCOMMENT to run)
/*
UPDATE public.org_users ou
SET user_id = au.id
FROM auth.users au
WHERE LOWER(ou.email) = LOWER(au.email)
  AND ou.user_id NOT IN (SELECT id FROM auth.users)
  AND au.id IS NOT NULL;
*/

-- Step 4: Verify fix
/*
SELECT 
  ou.id,
  ou.user_id,
  ou.email,
  CASE 
    WHEN au.id IS NOT NULL THEN '✅ Fixed'
    ELSE '❌ Still mismatched'
  END AS fix_status
FROM public.org_users ou
LEFT JOIN auth.users au ON ou.user_id = au.id;
*/

-- =====================================================
-- 4. Prevention: Check new inserts
-- =====================================================
-- You can create a trigger to prevent inserting invalid user_id:

/*
CREATE OR REPLACE FUNCTION check_valid_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Invalid user_id: % does not exist in auth.users', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_org_users_user_id
  BEFORE INSERT OR UPDATE ON public.org_users
  FOR EACH ROW
  EXECUTE FUNCTION check_valid_auth_user();
*/

-- =====================================================
-- Summary
-- =====================================================
-- 1. Run query #1 to find mismatched entries
-- 2. Run query #2 to see which clients have auth accounts
-- 3. Review query #3 preview
-- 4. Create backup (query #3 step 2)
-- 5. Uncomment and run query #3 step 3 to fix
-- 6. Verify with query #3 step 4
-- 7. Consider adding prevention trigger (query #4)
