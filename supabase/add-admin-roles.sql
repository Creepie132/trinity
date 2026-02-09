-- Add role column to admin_users table
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'moderator'));

-- Add comment
COMMENT ON COLUMN admin_users.role IS 'Admin role: admin (full access) or moderator (limited access)';

-- Set all existing admins to 'admin' role
UPDATE admin_users
SET role = 'admin'
WHERE role IS NULL;
