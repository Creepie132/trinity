-- Add full_name field to admin_users table
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update existing admin user with a default name
UPDATE admin_users
SET full_name = 'Vlad Khalphin'
WHERE email = 'creepie1357@gmail.com';

-- Add comment to the column
COMMENT ON COLUMN admin_users.full_name IS 'Full name of the admin user';
