-- Migration: add theme column to profiles
-- Run via: supabase db push OR execute manually in Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme TEXT
DEFAULT 'command_center'
CHECK (theme IN ('command_center','editorial_luxury','neon_industrial','warm_organic'));
