-- ============================================================
-- Migration: shared clients across branches + transfer_requests
-- Run manually in Supabase SQL Editor
-- ============================================================

-- 1) Helper function: return all related org_ids for current user
--    (own org + sibling branches via parent)
CREATE OR REPLACE FUNCTION get_related_org_ids()
RETURNS TABLE(related_org_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_org_ids UUID[];
BEGIN
  -- Collect orgs this user belongs to
  SELECT ARRAY_AGG(org_id) INTO v_user_org_ids
  FROM org_users
  WHERE user_id = auth.uid();

  RETURN QUERY
    -- User's own orgs
    SELECT unnest(v_user_org_ids)

    UNION

    -- All children of those orgs (branches)
    SELECT b.child_org_id
    FROM branches b
    WHERE b.parent_org_id = ANY(v_user_org_ids)
      AND b.is_active = true

    UNION

    -- Parent orgs (if user belongs to a branch child)
    SELECT b2.parent_org_id
    FROM branches b2
    WHERE b2.child_org_id = ANY(v_user_org_ids)
      AND b2.is_active = true;
END;
$$;

-- 2) Update clients RLS policies to include branch family
DROP POLICY IF EXISTS "Users see own org clients" ON clients;
DROP POLICY IF EXISTS "Users insert own org clients" ON clients;
DROP POLICY IF EXISTS "Users update own org clients" ON clients;
DROP POLICY IF EXISTS "Users delete own org clients" ON clients;

CREATE POLICY "Users see org family clients" ON clients
  FOR SELECT
  USING (org_id IN (SELECT related_org_id FROM get_related_org_ids()) OR is_admin());

CREATE POLICY "Users insert org family clients" ON clients
  FOR INSERT
  WITH CHECK (org_id IN (SELECT related_org_id FROM get_related_org_ids()) OR is_admin());

CREATE POLICY "Users update org family clients" ON clients
  FOR UPDATE
  USING (org_id IN (SELECT related_org_id FROM get_related_org_ids()) OR is_admin());

CREATE POLICY "Users delete org family clients" ON clients
  FOR DELETE
  USING (org_id IN (SELECT related_org_id FROM get_related_org_ids()) OR is_admin());

-- 3) Create transfer_requests table
CREATE TABLE IF NOT EXISTS transfer_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_org_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  to_org_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  items        JSONB NOT NULL DEFAULT '[]',
  -- items format: [{ product_id, product_name, quantity, unit }]
  note         TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by   UUID NOT NULL,
  reviewed_by  UUID,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users see their transfer requests" ON transfer_requests
  FOR ALL
  USING (
    from_org_id IN (SELECT related_org_id FROM get_related_org_ids())
    OR
    to_org_id   IN (SELECT related_org_id FROM get_related_org_ids())
  );

CREATE INDEX IF NOT EXISTS idx_transfer_requests_from ON transfer_requests(from_org_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_to   ON transfer_requests(to_org_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_status ON transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_created_by ON transfer_requests(created_by);
