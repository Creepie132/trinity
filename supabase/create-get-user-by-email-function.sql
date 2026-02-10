-- =====================================================
-- Helper function to check if user exists in auth.users
-- =====================================================
-- This is needed because auth.users is not directly accessible via Supabase client.
-- Only admins and service_role can call this function.

CREATE OR REPLACE FUNCTION public.get_user_by_email(email_param TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Return user if exists
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at
  FROM auth.users u
  WHERE u.email = email_param
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Function get_user_by_email created successfully!';
  RAISE NOTICE '🔍 Usage: SELECT * FROM get_user_by_email(''user@example.com'');';
END $$;
