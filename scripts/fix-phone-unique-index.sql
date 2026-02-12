-- Fix unique phone constraint for multi-tenancy
-- Currently: phone is unique GLOBALLY (wrong!)
-- Should be: phone is unique PER ORGANIZATION (org_id + phone)

-- Step 1: Drop old global unique constraint
DROP INDEX IF EXISTS clients_phone_key;

-- Step 2: Create correct unique index (phone unique within organization)
CREATE UNIQUE INDEX clients_org_phone_unique ON clients(org_id, phone);

-- Verify
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'clients' 
AND indexname LIKE '%phone%';
