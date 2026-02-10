-- =====================================================
-- AVATAR SUPPORT MIGRATION
-- Add avatar_url to org_users and setup storage
-- =====================================================

-- 1. Add avatar_url column to org_users
ALTER TABLE org_users 
ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN org_users.avatar_url IS 'Public URL to user profile picture stored in Supabase Storage';

-- 2. Create avatars storage bucket (run this in Supabase Dashboard -> Storage or via client library)
-- NOTE: This SQL cannot create storage buckets. You must create it manually:
-- Bucket name: avatars
-- Public: true
-- File size limit: 2MB
-- Allowed MIME types: image/png, image/jpeg, image/jpg, image/webp, image/gif

-- 3. Storage policies (run AFTER creating the bucket in Dashboard)
-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all avatars
CREATE POLICY "Public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Index for faster queries
CREATE INDEX IF NOT EXISTS idx_org_users_avatar_url ON org_users(avatar_url) WHERE avatar_url IS NOT NULL;

-- =====================================================
-- INSTRUCTIONS:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Go to Storage in Supabase Dashboard
-- 3. Create bucket: "avatars" (public, 2MB limit)
-- 4. Re-run storage policies section above
-- =====================================================
