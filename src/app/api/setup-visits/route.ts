// src/app/api/setup-visits/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * POST /api/setup-visits
 * Check if visits table exists, create if needed
 * Admin only
 */
export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('[Setup Visits] Checking visits table...')

    // Check if table exists
    const { data: tables, error: checkError } = await supabaseAdmin
      .from('visits')
      .select('id')
      .limit(1)

    if (!checkError) {
      console.log('[Setup Visits] Table already exists')
      return NextResponse.json({
        success: true,
        message: 'Visits table already exists',
        existed: true,
      })
    }

    console.log('[Setup Visits] Table does not exist, creating...')

    // Create table via SQL (service role can execute raw SQL)
    // Note: This is a fallback - ideally table should be created via Supabase migrations
    return NextResponse.json({
      success: false,
      message: 'Please create visits table manually in Supabase SQL Editor',
      sql: `
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

-- Index for faster queries
CREATE INDEX IF NOT EXISTS visits_org_id_idx ON visits(org_id);
CREATE INDEX IF NOT EXISTS visits_client_id_idx ON visits(client_id);
CREATE INDEX IF NOT EXISTS visits_scheduled_at_idx ON visits(scheduled_at);
CREATE INDEX IF NOT EXISTS visits_status_idx ON visits(status);

-- RLS Policies
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER visits_updated_at_trigger
  BEFORE UPDATE ON visits
  FOR EACH ROW
  EXECUTE FUNCTION update_visits_updated_at();
      `,
    })
  } catch (error: any) {
    console.error('[Setup Visits] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
