-- Fix client_summary view to use correct column names
-- Problem: view uses visit_date (old) instead of scheduled_at (actual)
-- This causes last_visit and total_visits to always be null/0

DROP VIEW IF EXISTS client_summary CASCADE;

CREATE OR REPLACE VIEW client_summary AS
SELECT 
  c.id,
  c.org_id,
  c.first_name,
  c.last_name,
  c.phone,
  c.email,
  c.date_of_birth,
  c.address,
  c.notes,
  c.created_at,
  MAX(v.scheduled_at) AS last_visit,
  COUNT(DISTINCT v.id) AS total_visits,
  COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS total_paid
FROM clients c
LEFT JOIN visits v ON v.client_id = c.id AND v.org_id = c.org_id
LEFT JOIN payments p ON p.client_id = c.id AND p.org_id = c.org_id
GROUP BY c.id, c.org_id, c.first_name, c.last_name, c.phone, c.email, c.date_of_birth, c.address, c.notes, c.created_at;

-- Grant permissions
GRANT SELECT ON client_summary TO authenticated;
