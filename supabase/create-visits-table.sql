-- Create visits table
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  price DECIMAL(10, 2),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS visits_org_id_idx ON visits(org_id);
CREATE INDEX IF NOT EXISTS visits_client_id_idx ON visits(client_id);
CREATE INDEX IF NOT EXISTS visits_scheduled_at_idx ON visits(scheduled_at);
CREATE INDEX IF NOT EXISTS visits_status_idx ON visits(status);

-- RLS Policies
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their org visits" ON visits;
DROP POLICY IF EXISTS "Users can create visits in their org" ON visits;
DROP POLICY IF EXISTS "Users can update their org visits" ON visits;
DROP POLICY IF EXISTS "Users can delete their org visits" ON visits;

-- Users can view visits from their organization
CREATE POLICY "Users can view their org visits"
  ON visits FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- Users can insert visits in their organization
CREATE POLICY "Users can create visits in their org"
  ON visits FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- Users can update visits in their organization
CREATE POLICY "Users can update their org visits"
  ON visits FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- Users can delete visits from their organization
CREATE POLICY "Users can delete their org visits"
  ON visits FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_visits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS visits_updated_at_trigger ON visits;

CREATE TRIGGER visits_updated_at_trigger
  BEFORE UPDATE ON visits
  FOR EACH ROW
  EXECUTE FUNCTION update_visits_updated_at();
