-- =====================================================
-- TASK 2 & 3: Invitation System for Pre-Assignment
-- =====================================================
-- This table stores pending invitations for clients who haven't logged in yet.
-- When they log in via Google Auth, they'll automatically be linked to their org.

-- 1. Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Prevent duplicate invitations
  UNIQUE(email, org_id)
);

-- Index for fast lookup by email (used by trigger)
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email) WHERE used = FALSE;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at) WHERE used = FALSE;

-- RLS Policies
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON public.invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Admins can update invitations (mark as used, etc.)
CREATE POLICY "Admins can update invitations"
  ON public.invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- 2. Create trigger function to auto-assign on login
CREATE OR REPLACE FUNCTION public.process_invitation_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's a pending invitation for this email
  INSERT INTO public.org_users (org_id, user_id, email, role, invited_at)
  SELECT 
    inv.org_id,
    NEW.id,
    NEW.email,
    inv.role,
    NOW()
  FROM public.invitations inv
  WHERE inv.email = NEW.email
    AND inv.used = FALSE
    AND inv.expires_at > NOW()
  LIMIT 1
  ON CONFLICT (org_id, user_id) DO NOTHING; -- Prevent duplicates

  -- Mark invitation as used
  UPDATE public.invitations
  SET 
    used = TRUE,
    used_at = NOW()
  WHERE email = NEW.email
    AND used = FALSE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_process_invitation ON auth.users;

CREATE TRIGGER on_auth_user_created_process_invitation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.process_invitation_on_signup();

-- 4. Create function to cleanup expired invitations (optional, can be run via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.invitations
  WHERE expires_at < NOW()
    AND used = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invitations TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Invitations system created successfully!';
  RAISE NOTICE '📧 Table: public.invitations';
  RAISE NOTICE '⚡ Trigger: on_auth_user_created_process_invitation';
  RAISE NOTICE '🧹 Cleanup function: cleanup_expired_invitations()';
END $$;
