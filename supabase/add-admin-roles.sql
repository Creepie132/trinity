-- Add role column to admin_users table
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';

-- Add CHECK constraint for role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_users_role_check'
  ) THEN
    ALTER TABLE admin_users 
    ADD CONSTRAINT admin_users_role_check 
    CHECK (role IN ('admin', 'moderator'));
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN admin_users.role IS 'Admin role: admin (full access) or moderator (limited access)';

-- Set all existing admins to 'admin' role
UPDATE admin_users
SET role = 'admin'
WHERE role IS NULL;
