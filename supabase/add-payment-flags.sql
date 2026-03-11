-- Migration: add payments_enabled and recurring_enabled to organizations
-- Run manually in Supabase SQL Editor

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS payments_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recurring_enabled BOOLEAN NOT NULL DEFAULT false;
