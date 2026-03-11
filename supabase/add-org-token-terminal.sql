-- Add per-org Tranzila token terminal credentials
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS tranzila_token_terminal TEXT,
  ADD COLUMN IF NOT EXISTS tranzila_token_password TEXT;
