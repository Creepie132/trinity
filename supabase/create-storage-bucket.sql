-- =============================================
-- Quick Fix: Create ad-banners bucket
-- Copy and paste this in Supabase SQL Editor
-- =============================================

-- Step 1: Create public bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-banners', 
  'ad-banners', 
  true,  -- Public access
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- Step 2: Verify bucket created
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'ad-banners';

-- Should return:
-- id         | name       | public | file_size_limit
-- -----------|------------|--------|----------------
-- ad-banners | ad-banners | true   | 5242880

-- =============================================
-- That's it! Bucket is ready.
-- Now restart your dev server: npm run dev
-- =============================================
