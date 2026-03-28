-- Migration: add enabled_payment_methods to organizations
-- Run in Supabase SQL Editor
-- Created: 2026-03-28

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS enabled_payment_methods jsonb DEFAULT '["cash","card","bit","bank_transfer","check"]'::jsonb;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name = 'enabled_payment_methods';
