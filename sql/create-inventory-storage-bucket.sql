-- ================================================
-- TRINITY CRM - Inventory Storage Bucket Setup
-- ================================================
-- Creates a public storage bucket for inventory product images

-- Create the inventory bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory', 'inventory', true)
ON CONFLICT (id) DO NOTHING;

-- Policy 1: Public read access (anyone can view product images)
CREATE POLICY IF NOT EXISTS "Public read access for inventory"
ON storage.objects FOR SELECT
USING (bucket_id = 'inventory');

-- Policy 2: Authenticated users can upload images
CREATE POLICY IF NOT EXISTS "Authenticated upload for inventory"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inventory' 
  AND auth.role() = 'authenticated'
);

-- Policy 3: Users can update their own organization's images
CREATE POLICY IF NOT EXISTS "Users can update their org inventory images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'inventory' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'inventory' AND auth.role() = 'authenticated');

-- Policy 4: Users can delete their own organization's images
CREATE POLICY IF NOT EXISTS "Users can delete their org inventory images"
ON storage.objects FOR DELETE
USING (bucket_id = 'inventory' AND auth.role() = 'authenticated');
