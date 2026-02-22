-- SQL Migration: Add metadata column to visits table
-- For storing meeting location data (city, address) in meeting mode
-- 
-- OPTIONAL: This is better than storing in notes field
-- If you want cleaner data structure, run this migration:

ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Example data structure:
-- {
--   "city": "Tel Aviv",
--   "address": "Dizengoff 50",
--   "meeting_mode": true
-- }

-- If you don't run this migration, city and address will be stored in notes field
-- as formatted text (current implementation).
