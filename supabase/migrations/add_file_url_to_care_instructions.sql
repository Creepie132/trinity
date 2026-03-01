-- Add file_url column to care_instructions table
ALTER TABLE care_instructions ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Create storage bucket for care instructions PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('care-instructions', 'care-instructions', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to care-instructions bucket
CREATE POLICY "Allow authenticated users to upload care instruction files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'care-instructions');

-- Allow public read access to care instruction files
CREATE POLICY "Allow public read access to care instruction files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'care-instructions');

-- Allow authenticated users to delete their own organization's files
CREATE POLICY "Allow authenticated users to delete care instruction files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'care-instructions');
