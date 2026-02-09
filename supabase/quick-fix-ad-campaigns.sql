-- =============================================
-- Quick Fix: Create ad_campaigns table
-- Copy this and paste in Supabase SQL Editor
-- =============================================

-- Create ad_campaigns table
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  advertiser_name text NOT NULL,
  banner_url text NOT NULL,
  link_url text NOT NULL,
  target_categories text[] DEFAULT '{}',
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active 
ON ad_campaigns(is_active, start_date, end_date);

-- Enable RLS
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can see active ads
CREATE POLICY "All see active ads" 
ON ad_campaigns FOR SELECT 
USING (is_active = true OR is_admin());

-- Policy: Admins manage ads (uses is_admin() function)
CREATE POLICY "Admin manage ads" 
ON ad_campaigns FOR ALL 
USING (is_admin());

-- Verify table created
SELECT 
  'ad_campaigns table created!' as status,
  COUNT(*) as initial_count 
FROM ad_campaigns;

-- =============================================
-- Done! Refresh the page /admin/ads
-- =============================================

-- If you get "function is_admin() does not exist":
-- Run the full migration: supabase/schema-v2.sql
