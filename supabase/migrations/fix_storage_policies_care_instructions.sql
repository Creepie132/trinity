-- Ensure storage bucket exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'care-instructions'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('care-instructions', 'care-instructions', true);
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload care instruction files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to care instruction files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete care instruction files" ON storage.objects;

-- Create new policies with correct names
CREATE POLICY "care_instructions_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'care-instructions');

CREATE POLICY "care_instructions_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'care-instructions');

CREATE POLICY "care_instructions_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'care-instructions')
WITH CHECK (bucket_id = 'care-instructions');

CREATE POLICY "care_instructions_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'care-instructions');
