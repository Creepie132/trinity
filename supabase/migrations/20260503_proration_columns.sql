-- Trinity CRM: Proration billing columns
-- 03.05.2026

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS pending_plan        text,
  ADD COLUMN IF NOT EXISTS pending_plan_price  numeric(10,2),
  ADD COLUMN IF NOT EXISTS pending_plan_date   date;

COMMENT ON COLUMN organizations.pending_plan       IS 'Scheduled plan change (downgrade) — applied at pending_plan_date';
COMMENT ON COLUMN organizations.pending_plan_price IS 'New monthly price for pending plan change';
COMMENT ON COLUMN organizations.pending_plan_date  IS 'Date from which the pending plan takes effect (downgrade = next billing date)';
