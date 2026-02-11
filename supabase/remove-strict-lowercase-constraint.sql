-- TEMPORARY FIX: Remove strict lowercase constraint
-- It's blocking new user signups when email has uppercase letters

-- Drop the strict constraint
ALTER TABLE org_users 
DROP CONSTRAINT IF EXISTS org_users_email_lowercase;

RAISE NOTICE '✅ Removed strict lowercase constraint (will normalize in application code instead)';

-- Add a trigger to auto-lowercase email on INSERT/UPDATE instead
CREATE OR REPLACE FUNCTION normalize_org_users_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-lowercase email on insert/update
  NEW.email := lower(NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_org_users_email_trigger ON org_users;

CREATE TRIGGER normalize_org_users_email_trigger
BEFORE INSERT OR UPDATE ON org_users
FOR EACH ROW
EXECUTE FUNCTION normalize_org_users_email();

RAISE NOTICE '✅ Added trigger to auto-normalize email on insert/update';
