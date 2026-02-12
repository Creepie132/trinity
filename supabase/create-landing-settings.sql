-- Create landing_settings table for global landing page configuration
CREATE TABLE IF NOT EXISTS landing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login_button_style TEXT NOT NULL DEFAULT 'orbit' CHECK (login_button_style IN ('orbit', 'pulse')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO landing_settings (login_button_style)
VALUES ('orbit')
ON CONFLICT DO NOTHING;

-- Add RLS policies (public read, admin write)
ALTER TABLE landing_settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings
CREATE POLICY "Anyone can read landing settings"
ON landing_settings
FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can update
CREATE POLICY "Only admins can update landing settings"
ON landing_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_landing_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER landing_settings_updated_at
BEFORE UPDATE ON landing_settings
FOR EACH ROW
EXECUTE FUNCTION update_landing_settings_updated_at();

COMMENT ON TABLE landing_settings IS 'Global settings for landing page (login button style, etc.)';
COMMENT ON COLUMN landing_settings.login_button_style IS 'Style of login button: orbit (rotating gradient border) or pulse (shimmer effect)';
