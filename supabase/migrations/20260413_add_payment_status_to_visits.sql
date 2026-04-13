-- Migration: add payment_status to visits
-- Purpose: track whether a completed visit has been paid or not
-- Values: paid (default), unpaid (completed-in-debt), partial

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS payment_status TEXT
    NOT NULL
    DEFAULT ''paid''
    CHECK (payment_status IN (''paid'', ''unpaid'', ''partial''));

-- Index for filtering unpaid completed visits (debt report)
CREATE INDEX IF NOT EXISTS idx_visits_payment_status
  ON public.visits (org_id, payment_status)
  WHERE status = ''completed'';

COMMENT ON COLUMN public.visits.payment_status IS
  ''Payment state for a completed visit: paid = normal, unpaid = completed without payment (debt), partial = partially paid'';
