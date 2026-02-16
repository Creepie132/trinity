-- ============================================================
-- MIGRATION: Update org_users role system
-- Date: 2026-02-16
-- Description: Change role values from (user, admin, manager) 
--              to (user, moderator, owner)
-- ============================================================

-- Step 1: Drop existing constraint
ALTER TABLE org_users 
DROP CONSTRAINT IF EXISTS org_users_role_check;

-- Step 2: Update existing roles to new values
-- admin → owner (администратор организации)
UPDATE org_users 
SET role = 'owner' 
WHERE role = 'admin';

-- manager → moderator (модератор / менеджер смены)
UPDATE org_users 
SET role = 'moderator' 
WHERE role = 'manager';

-- user → user (без изменений)
-- (already correct, no update needed)

-- Step 3: Add new constraint with updated role values
ALTER TABLE org_users 
ADD CONSTRAINT org_users_role_check 
CHECK (role IN ('user', 'moderator', 'owner'));

-- ============================================================
-- ROLE DESCRIPTIONS:
-- ============================================================
-- 'user' (Пользователь / משתמש):
--   - Create/manage visits and clients
--   - Accept payments
--   - Send birthday messages
--   - Change display settings (theme, language, layout)
--
-- 'moderator' (Модератор / מנהל משמרת):
--   - All user permissions +
--   - View analytics
--   - Manage inventory
--   - Send SMS campaigns
--
-- 'owner' (Администратор организации / מנהל):
--   - All moderator permissions +
--   - Manage services
--   - Manage care instructions
--   - Manage booking settings
--   - Manage birthday templates
--   - Manage organization users
--   - Full organization control
-- ============================================================

-- Verification query (run after migration):
-- SELECT role, COUNT(*) FROM org_users GROUP BY role;
