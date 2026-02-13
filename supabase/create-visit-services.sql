-- ================================================
-- TRINITY CRM - Visit Services Table
-- Store multiple services per visit (main + additional)
-- Version: 2.26.0
-- ================================================

-- Create visit_services table
CREATE TABLE IF NOT EXISTS visit_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  service_name_ru TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_visit_services_visit_id ON visit_services(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_services_service_id ON visit_services(service_id);

-- RLS Policies
ALTER TABLE visit_services ENABLE ROW LEVEL SECURITY;

-- Users can view visit_services for visits in their organization
CREATE POLICY visit_services_select_policy ON visit_services
  FOR SELECT
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      INNER JOIN org_users ou ON v.org_id = ou.org_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Users can insert visit_services for visits in their organization
CREATE POLICY visit_services_insert_policy ON visit_services
  FOR INSERT
  WITH CHECK (
    visit_id IN (
      SELECT v.id FROM visits v
      INNER JOIN org_users ou ON v.org_id = ou.org_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Users can update visit_services for visits in their organization
CREATE POLICY visit_services_update_policy ON visit_services
  FOR UPDATE
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      INNER JOIN org_users ou ON v.org_id = ou.org_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Users can delete visit_services for visits in their organization
CREATE POLICY visit_services_delete_policy ON visit_services
  FOR DELETE
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      INNER JOIN org_users ou ON v.org_id = ou.org_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- ================================================
-- Add started_at column to visits table
-- Track when visit actually started (not just scheduled)
-- ================================================

ALTER TABLE visits ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Create index for querying in_progress visits
CREATE INDEX IF NOT EXISTS idx_visits_status_started_at ON visits(status, started_at) WHERE status = 'in_progress';

-- ================================================
-- Utility Functions
-- ================================================

-- Function to calculate total price for a visit (including visit_services)
CREATE OR REPLACE FUNCTION calculate_visit_total_price(visit_id_param UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(price), 0)
  INTO total
  FROM visit_services
  WHERE visit_id = visit_id_param;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total duration for a visit (including visit_services)
CREATE OR REPLACE FUNCTION calculate_visit_total_duration(visit_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(duration_minutes), 0)
  INTO total
  FROM visit_services
  WHERE visit_id = visit_id_param;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Trigger to auto-update visit price/duration when visit_services change
-- ================================================

CREATE OR REPLACE FUNCTION update_visit_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_visit_id UUID;
BEGIN
  -- Get visit_id from NEW or OLD record
  IF TG_OP = 'DELETE' THEN
    v_visit_id := OLD.visit_id;
  ELSE
    v_visit_id := NEW.visit_id;
  END IF;

  -- Update visit price and duration
  UPDATE visits
  SET 
    price = calculate_visit_total_price(v_visit_id),
    duration_minutes = calculate_visit_total_duration(v_visit_id)
  WHERE id = v_visit_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS visit_services_update_visit_totals ON visit_services;
CREATE TRIGGER visit_services_update_visit_totals
AFTER INSERT OR UPDATE OR DELETE ON visit_services
FOR EACH ROW
EXECUTE FUNCTION update_visit_totals();

-- ================================================
-- NOTES
-- ================================================
-- This migration creates:
-- 1. visit_services table for storing multiple services per visit
-- 2. started_at column in visits table
-- 3. RLS policies for visit_services
-- 4. Utility functions for calculating totals
-- 5. Trigger to auto-update visit price/duration

-- DO NOT RUN AUTOMATICALLY - Execute manually in Supabase SQL Editor when ready
