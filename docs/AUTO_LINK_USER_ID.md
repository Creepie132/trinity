# Auto-Link User ID System

## Problem

When creating an organization or invitation, we add users to `public.org_users` with only their email:
- `user_id = null` (user hasn't logged in yet)
- `email = 'user@example.com'`

After Google OAuth login:
- User appears in `auth.users` with a `uid`
- But `org_users.user_id` is still `null`
- Access checks fail: `WHERE user_id = auth.uid()` → no match → "no access" error

## Solution

Auto-link `org_users.user_id` after first login using `/api/org/link-user`.

### Flow

```
1. Admin creates org → org_users entry with user_id=null, email="user@example.com"
2. User clicks "Login with Google"
3. Google OAuth → auth.users entry created (uid + email)
4. useAuth hook → calls /api/org/link-user
5. API uses service role to: UPDATE org_users SET user_id=uid WHERE email=email AND user_id IS NULL
6. Now access checks work: org_users.user_id = auth.uid() ✅
```

## Implementation

### 1. Service Role Client

**File:** `src/lib/supabase-service.ts`

```typescript
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Bypasses RLS
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

⚠️ **DANGER:** Service role bypasses RLS - use only in server-side code!

### 2. Link User API

**File:** `src/app/api/org/link-user/route.ts`

**Endpoint:** `POST /api/org/link-user`

**Logic:**
1. Get current user session (uid + email)
2. Use service role to find `org_users` with matching email and `user_id = null`
3. Update `user_id = uid` for all matching entries
4. Return success + list of linked organizations

**Response:**
```json
{
  "ok": true,
  "linked": true,
  "user_id": "uuid",
  "email": "user@example.com",
  "organizations": [
    { "org_id": "uuid", "role": "owner", "email": "user@example.com" }
  ],
  "count": 1
}
```

### 3. useAuth Hook Integration

**File:** `src/hooks/useAuth.ts`

After successful authentication:
```typescript
// Step 2.5: Auto-link org_users.user_id
const linkResponse = await fetch('/api/org/link-user', { method: 'POST' })
if (linkResponse.ok) {
  const result = await linkResponse.json()
  if (result.linked) {
    console.log('Successfully linked user_id to', result.count, 'org(s)')
  }
}
```

### 4. Database Schema

**Unique Index (prevents duplicates):**
```sql
CREATE UNIQUE INDEX org_users_org_email_unique 
ON org_users (org_id, lower(email));
```

**Performance Index:**
```sql
CREATE INDEX org_users_user_id_idx 
ON org_users (user_id) 
WHERE user_id IS NOT NULL;
```

**Check Constraint (enforce lowercase):**
```sql
ALTER TABLE org_users 
ADD CONSTRAINT org_users_email_lowercase 
CHECK (email = lower(email));
```

## Usage

### Creating Organization with New User

**Before fix:**
```typescript
// Admin creates org → org_users entry created
INSERT INTO org_users (org_id, email, role) 
VALUES ('org-id', 'user@example.com', 'owner')
// user_id = null

// User logs in → auth.users entry created
// But org_users.user_id is still null → access denied ❌
```

**After fix:**
```typescript
// Admin creates org → org_users entry created with user_id=null
INSERT INTO org_users (org_id, email, role, user_id) 
VALUES ('org-id', 'user@example.com', 'owner', NULL)

// User logs in → Google OAuth
// → useAuth hook → /api/org/link-user → auto-update:
UPDATE org_users 
SET user_id = 'auth-uid' 
WHERE email = 'user@example.com' AND user_id IS NULL

// Now access checks work ✅
```

### Email Normalization

All emails are stored in **lowercase** to prevent case-sensitivity issues:

```typescript
const normalizedEmail = client.email.toLowerCase()

// Create org
INSERT INTO organizations (email) VALUES (normalizedEmail)

// Create org_users
INSERT INTO org_users (email) VALUES (normalizedEmail)

// Lookup in auth.users
const authUser = authUsers.find(u => u.email?.toLowerCase() === normalizedEmail)
```

## Environment Setup

Add to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find:**
1. Supabase Dashboard → Project Settings → API
2. Copy "service_role" key (NOT anon key!)
3. ⚠️ **NEVER commit this key to git!**

## Testing

### Test 1: New User (First Login)

1. Admin creates org, assigns email `test@example.com`
2. Check database: `SELECT * FROM org_users WHERE email='test@example.com'`
   - Should show: `user_id = null`
3. User logs in with Google (`test@example.com`)
4. Check console: `[useAuth] Successfully linked user_id to 1 org(s)`
5. Check database again: `user_id` should now be populated ✅

### Test 2: Existing User

1. User already logged in → `auth.users` entry exists
2. Admin creates org, assigns this user
3. Check database: `user_id` should be immediately populated (no link needed) ✅

### Test 3: Multiple Organizations

1. Create 2 orgs, both with same email `user@example.com`, `user_id = null`
2. User logs in
3. Check: Both `org_users` entries should have `user_id` populated ✅

## Troubleshooting

### "Unauthorized" Error

**Symptom:** User logs in but still can't access dashboard

**Fix:**
1. Check console logs: `[useAuth] Link-user result:`
2. If error → check `SUPABASE_SERVICE_ROLE_KEY` is set
3. If `linked: false` → check `org_users` table for email match

### Duplicate Key Error

**Symptom:** `ERROR: duplicate key value violates unique constraint "org_users_org_email_unique"`

**Fix:**
1. User already exists in this org
2. Check: `SELECT * FROM org_users WHERE email='...' AND org_id='...'`
3. Either update existing entry or use different email

### RLS Still Blocking

**Symptom:** `user_id` updated but still can't read `org_users`

**Fix:**
1. Check RLS policy:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'org_users'
   ```
2. Should allow: `USING (user_id = auth.uid())`
3. If missing, create policy:
   ```sql
   CREATE POLICY "Users can view their orgs"
   ON org_users FOR SELECT
   USING (user_id = auth.uid())
   ```

## Security Notes

- ✅ Service role key is used only on server (API route)
- ✅ Client can't bypass RLS (uses regular anon key)
- ✅ Email matching is case-insensitive + normalized
- ✅ Unique index prevents duplicate invitations
- ✅ Non-fatal errors (won't break login if link fails)

## Future Improvements

1. **Bulk linking:** Admin tool to manually link all pending users
2. **Invitation expiry:** Auto-delete `org_users` entries after 30 days if not linked
3. **Email verification:** Only link if email is verified in `auth.users`
4. **Audit log:** Track when user_id was auto-linked (timestamp, IP)
