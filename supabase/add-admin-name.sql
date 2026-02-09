-- Add created_at field to admin_users table
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add full_name field to admin_users table
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update existing admin user with a default name
UPDATE admin_users
SET full_name = 'Vlad Khalphin'
WHERE email = 'creepie1357@gmail.com';

-- Add comments to the columns
COMMENT ON COLUMN admin_users.created_at IS 'Date when admin was added';
COMMENT ON COLUMN admin_users.full_name IS 'Full name of the admin user';
