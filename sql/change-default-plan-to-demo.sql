-- Change default plan from 'basic' to 'demo'
-- This affects new invitations when users are approved

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;

-- Step 2: Add new CHECK constraint that includes 'demo'
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check 
  CHECK (plan IN ('demo', 'basic', 'pro', 'enterprise', 'custom'));

-- Step 3: Change the default value from 'basic' to 'demo'
ALTER TABLE organizations ALTER COLUMN plan SET DEFAULT 'demo';

-- Explanation:
-- - Demo plan: 14 days trial, 10 clients limit, clients module only
-- - This will be the default plan for all newly approved invitations
-- - Existing organizations are NOT affected (only new ones)
