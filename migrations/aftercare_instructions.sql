-- Create aftercare_instructions table
CREATE TABLE IF NOT EXISTS aftercare_instructions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  title_ru text,
  content text NOT NULL,
  content_ru text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_aftercare_instructions_org_id ON aftercare_instructions(org_id);
CREATE INDEX IF NOT EXISTS idx_aftercare_instructions_created_at ON aftercare_instructions(created_at DESC);

-- Add RLS policies
ALTER TABLE aftercare_instructions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their organization's aftercare instructions
CREATE POLICY "Users can view org aftercare instructions"
  ON aftercare_instructions
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert aftercare instructions for their organization
CREATE POLICY "Users can insert org aftercare instructions"
  ON aftercare_instructions
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their organization's aftercare instructions
CREATE POLICY "Users can update org aftercare instructions"
  ON aftercare_instructions
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their organization's aftercare instructions
CREATE POLICY "Users can delete org aftercare instructions"
  ON aftercare_instructions
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM org_users
      WHERE user_id = auth.uid()
    )
  );
