-- Create access_requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  access_expires_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Admins can manage all access requests
CREATE POLICY "Admins can manage access_requests"
  ON access_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Users can see their own requests
CREATE POLICY "Users can see own requests"
  ON access_requests FOR SELECT
  USING (user_id = auth.uid());

-- Add subscription fields to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none'
  CHECK (subscription_status IN ('none', 'trial', 'active', 'expired', 'manual'));

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
