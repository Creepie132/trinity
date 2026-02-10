# Fix: "Missing orgId 0" Error When Adding Client

## Problem

When trying to add a new client, the system threw an error:
```
Missing orgId 0
```

This happened because the `orgId` was not being properly fetched from the database.

## Root Cause

The `useAuth()` hook was querying the `org_users` table by **email** instead of **user_id**:

```typescript
// ❌ WRONG - querying by email
const { data: orgRow } = await supabase
  .from('org_users')
  .select('org_id')
  .eq('email', user.email)  // <-- Problem!
  .maybeSingle()
```

**Why this was wrong:**
1. The `org_users` table has a `user_id` column that references `auth.users(id)`
2. Querying by email is unreliable if:
   - Email is not set in `org_users`
   - Email case doesn't match
   - There are duplicate emails across organizations

## Solution

### 1. Fixed `useAuth()` Hook

Changed the query to use `user_id` instead of `email`:

```typescript
// ✅ CORRECT - querying by user_id
const { data: orgRow } = await supabase
  .from('org_users')
  .select('org_id')
  .eq('user_id', user.id)  // <-- Fixed!
  .maybeSingle()
```

**File:** `src/hooks/useAuth.ts`

### 2. Improved Error Handling in `useAddClient()`

Added better validation and error messages:

```typescript
export function useAddClient() {
  const { orgId, isLoading } = useAuth()

  return useMutation({
    mutationFn: async (client) => {
      // Wait for auth to finish loading
      if (isLoading) {
        throw new Error('אנא המתן, הנתונים נטענים...')
      }
      
      // Validate orgId exists
      if (!orgId || orgId === '0') {
        throw new Error('לא נמצא ארגון למשתמש הנוכחי. אנא פנה לתמיכה.')
      }

      // Continue with insert...
    }
  })
}
```

**File:** `src/hooks/useClients.ts`

### 3. Enhanced `AddClientDialog` Component

Added loading state and warning message:

```typescript
export function AddClientDialog({ open, onOpenChange }) {
  const { orgId, isLoading: authLoading } = useAuth()
  
  // Show warning if orgId is missing
  {!authLoading && !orgId && (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
      ⚠️ לא נמצא ארגון למשתמש. אנא פנה לתמיכה.
    </div>
  )}

  // Disable submit button until orgId is loaded
  <Button 
    type="submit" 
    disabled={addClient.isPending || authLoading || !orgId}
  >
    {authLoading ? 'טוען...' : addClient.isPending ? 'שומר...' : 'שמור'}
  </Button>
}
```

**File:** `src/components/clients/AddClientDialog.tsx`

## Database Verification

### Check if your user has an org_users record:

```sql
-- Run in Supabase SQL Editor (while logged in)
SELECT 
  ou.*,
  o.name as org_name
FROM org_users ou
JOIN organizations o ON o.id = ou.org_id
WHERE ou.user_id = auth.uid();
```

**Expected result:** One or more rows with your organization details.

**If no rows:** You need to add yourself to `org_users`:

```sql
INSERT INTO org_users (org_id, user_id, email, role, joined_at)
VALUES (
  '<your-org-id>',           -- Get from organizations table
  auth.uid(),                -- Your user ID
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  'owner',
  NOW()
);
```

### Auto-fix missing user_id in org_users:

If you have records in `org_users` with `user_id = NULL`:

```sql
UPDATE org_users
SET 
  user_id = auth_users.id,
  joined_at = COALESCE(joined_at, NOW())
FROM (SELECT id, email FROM auth.users) AS auth_users
WHERE 
  org_users.email = auth_users.email 
  AND org_users.user_id IS NULL;
```

**Full diagnostic script:** See `supabase/fix-org-users-data.sql`

## Testing

After applying the fix:

1. **Logout** and **login** again to clear cache
2. Open developer console (F12)
3. Try to add a client
4. Check console for debug messages:
   - `Adding client with orgId: <uuid>` ✅ Good!
   - `Missing orgId 0` ❌ Still broken (run SQL fix)

## Files Changed

1. ✅ `src/hooks/useAuth.ts` - Fixed query to use `user_id`
2. ✅ `src/hooks/useClients.ts` - Added better error handling
3. ✅ `src/components/clients/AddClientDialog.tsx` - Added loading state
4. ✅ `supabase/fix-org-users-data.sql` - SQL diagnostic script

## Prevention

To prevent this issue in the future:

1. **Always** populate `user_id` in `org_users` when creating records
2. Use `auth.uid()` in SQL inserts, not email matching
3. Set up a database constraint (optional):

```sql
-- Make user_id NOT NULL (after fixing existing data)
ALTER TABLE org_users 
ALTER COLUMN user_id SET NOT NULL;
```

## Summary

✅ **Fixed:** Query now uses `user_id` instead of `email`  
✅ **Improved:** Better error messages and loading states  
✅ **Added:** SQL diagnostic script for troubleshooting  
✅ **Result:** Clients can now be added without "Missing orgId 0" error

---

**Version:** 2.4.1  
**Date:** 2026-02-10  
**Author:** OpenClaw Assistant
