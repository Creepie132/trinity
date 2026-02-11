-- FIX: Database error saving new user
-- Problem: Trigger tries to insert email with original case, but constraint requires lowercase

-- Option 1: Update trigger to use lower(email)
CREATE OR REPLACE FUNCTION process_invitation_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_invitation RECORD;
  v_normalized_email TEXT;
BEGIN
  -- Normalize email to lowercase
  v_normalized_email := lower(NEW.email);
  
  RAISE NOTICE '[TRIGGER] New user signed up: % (normalized: %)', NEW.email, v_normalized_email;
  
  -- Find pending invitation for this email (case-insensitive)
  SELECT * INTO v_invitation
  FROM invitations 
  WHERE lower(email) = v_normalized_email
    AND used = FALSE 
    AND expires_at > NOW()
  LIMIT 1;
  
  IF v_invitation IS NOT NULL THEN
    RAISE NOTICE '[TRIGGER] Found invitation for org: %', v_invitation.org_id;
    
    -- Check if already in org_users (from auto-link or manual assignment)
    IF NOT EXISTS (
      SELECT 1 FROM org_users 
      WHERE org_id = v_invitation.org_id 
        AND user_id = NEW.id
    ) THEN
      -- Insert into org_users with lowercase email
      INSERT INTO org_users (org_id, user_id, email, role)
      VALUES (v_invitation.org_id, NEW.id, v_normalized_email, v_invitation.role)
      ON CONFLICT (org_id, user_id) DO NOTHING;
      
      RAISE NOTICE '[TRIGGER] Assigned user to org via invitation';
    ELSE
      RAISE NOTICE '[TRIGGER] User already in org_users (skipped)';
    END IF;
    
    -- Mark invitation as used
    UPDATE invitations
    SET used = TRUE, used_at = NOW()
    WHERE id = v_invitation.id;
    
    RAISE NOTICE '[TRIGGER] Invitation marked as used';
  ELSE
    RAISE NOTICE '[TRIGGER] No pending invitation found (user may be invited later)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (if exists, drop and recreate)
DROP TRIGGER IF EXISTS on_auth_user_created_process_invitation ON auth.users;

CREATE TRIGGER on_auth_user_created_process_invitation
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION process_invitation_on_signup();

RAISE NOTICE '✅ Trigger updated to handle lowercase emails';
