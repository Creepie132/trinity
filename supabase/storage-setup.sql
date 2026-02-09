-- =============================================
-- Storage Setup for Ad Banners
-- Run this in Supabase SQL Editor or Dashboard
-- =============================================

-- Create storage bucket for ad banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-banners', 'ad-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-banners');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-banners' AND auth.role() = 'authenticated');

-- Allow admins to delete
CREATE POLICY "Admin delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'ad-banners' AND EXISTS (
  SELECT 1 FROM admin_users WHERE user_id = auth.uid()
));

-- =============================================
-- NOTES:
-- =============================================
-- After running this:
-- 1. Go to Supabase Dashboard → Storage
-- 2. You should see "ad-banners" bucket
-- 3. Test by uploading a file through the admin panel
-- 4. Banner URLs will be: https://[project].supabase.co/storage/v1/object/public/ad-banners/[filename]
