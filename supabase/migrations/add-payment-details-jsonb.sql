-- Migration: add payment_details JSONB to payments table
-- Stores structured data for check and bank_transfer methods.
--
-- Structure for 'check':
--   { "checks": [ { "check_number": "...", "bank": "...", "branch": "...", "account": "...",
--                   "due_date": "YYYY-MM-DD", "amount": 500, "front_url": "...", "back_url": "..." } ] }
--
-- Structure for 'bank_transfer':
--   { "reference": "...", "transfer_date": "YYYY-MM-DD", "receipt_url": "..." }

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT NULL;

-- Index for JSONB queries (e.g. search by check_number or reference)
CREATE INDEX IF NOT EXISTS idx_payments_details_gin
  ON payments USING gin (payment_details)
  WHERE payment_details IS NOT NULL;

COMMENT ON COLUMN payments.payment_details IS
  'Structured payment metadata: checks array for check method, reference/receipt for bank_transfer';
