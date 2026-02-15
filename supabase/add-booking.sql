-- Add booking system tables and columns
-- DO NOT EXECUTE - for documentation only

-- Add slug for public booking pages
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add booking settings with defaults
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS booking_settings JSONB DEFAULT '{
  "enabled": true,
  "advance_days": 30,
  "min_advance_hours": 2,
  "slot_duration": 30,
  "working_hours": {
    "0": null,
    "1": {"start": "09:00", "end": "19:00"},
    "2": {"start": "09:00", "end": "19:00"},
    "3": {"start": "09:00", "end": "19:00"},
    "4": {"start": "09:00", "end": "19:00"},
    "5": {"start": "09:00", "end": "17:00"},
    "6": null
  },
  "break_time": {"start": "13:00", "end": "14:00"},
  "max_bookings_per_slot": 1,
  "require_phone": true,
  "confirmation_message_he": "תודה שקבעת תור! נתראה בקרוב",
  "confirmation_message_ru": "Спасибо за запись! До встречи"
}'::jsonb;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  service_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  price DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS bookings_org_scheduled ON bookings(org_id, scheduled_at);
CREATE INDEX IF NOT EXISTS bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS bookings_org_status_scheduled ON bookings(org_id, status, scheduled_at);

-- Enable RLS on bookings (public read for org, write with validation)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create bookings (public booking page)
CREATE POLICY "Anyone can create bookings" ON bookings
  FOR INSERT
  WITH CHECK (true);

-- Policy: Org users can view their bookings
CREATE POLICY "Org users can view their bookings" ON bookings
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Org users can update their bookings
CREATE POLICY "Org users can update their bookings" ON bookings
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Org users can delete their bookings
CREATE POLICY "Org users can delete their bookings" ON bookings
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE bookings IS 'Public bookings made through /book/[slug] page';
COMMENT ON COLUMN organizations.slug IS 'Public URL slug for booking page (e.g. /book/my-salon)';
COMMENT ON COLUMN organizations.booking_settings IS 'JSON settings for public booking system';
