-- Add unique index on (org_id, email) to prevent duplicate invitations
-- This ensures one email can't be added to the same org multiple times

-- Step 1: Check for existing duplicates (clean them up first if any)
DO $$
DECLARE
  v_duplicate_count INT;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT org_id, lower(email) as email, COUNT(*) as cnt
    FROM org_users
    GROUP BY org_id, lower(email)
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_duplicate_count > 0 THEN
    RAISE NOTICE '⚠️  Found % duplicate (org_id, email) pairs', v_duplicate_count;
    RAISE NOTICE '   Keeping the first entry (by joined_at) for each duplicate';
    
    -- Delete duplicates (keep oldest by joined_at)
    DELETE FROM org_users
    WHERE id IN (
      SELECT id
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY org_id, lower(email)
                 ORDER BY joined_at ASC NULLS LAST, created_at ASC NULLS LAST
               ) as rn
        FROM org_users
      ) ranked
      WHERE rn > 1
    );
    
    RAISE NOTICE '✅ Cleaned up duplicates';
  ELSE
    RAISE NOTICE '✅ No duplicates found';
  END IF;
END $$;

-- Step 2: Create unique index on (org_id, lower(email))
-- lower() makes it case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS org_users_org_email_unique 
ON org_users (org_id, lower(email));

RAISE NOTICE '✅ Created unique index: org_users_org_email_unique';

-- Step 3: Also add index on (user_id) for faster lookups
CREATE INDEX IF NOT EXISTS org_users_user_id_idx 
ON org_users (user_id) 
WHERE user_id IS NOT NULL;

RAISE NOTICE '✅ Created index: org_users_user_id_idx';

-- Step 4: Add check constraint to ensure email is lowercase
-- (optional, helps prevent case-sensitivity issues)
ALTER TABLE org_users 
ADD CONSTRAINT IF NOT EXISTS org_users_email_lowercase 
CHECK (email = lower(email));

RAISE NOTICE '✅ Added constraint: org_users_email_lowercase';

-- Verification
SELECT 
  'org_users' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT org_id) as unique_orgs,
  COUNT(DISTINCT lower(email)) as unique_emails,
  COUNT(*) FILTER (WHERE user_id IS NULL) as pending_links
FROM org_users;
