# 📧 Invitation System - Pre-Assignment Feature

**Version:** 1.0.2  
**Date:** 2026-02-10 (Updated 21:18 UTC)  
**Status:** ✅ Implemented + Critical Bug Fixes

---

## 🔴 Critical Bug Fixes

### v1.0.2 (21:18 UTC) - User ID Mismatch 🔴 CRITICAL

**Problem: Client ID ≠ Auth User ID**

When selecting a CRM Client as Organization Owner:
- `public.clients.id` = `9042...` (CRM database UUID)
- `auth.users.id` = `90fd...` (Supabase Auth UUID)
- **These are DIFFERENT UUIDs for the same email!**

**Old Logic (WRONG):**
```typescript
const client = await supabase.from('clients').select('*').eq('id', clientId)
await supabase.from('org_users').insert({
  user_id: client.id // ❌ WRONG! CRM ID, not Auth ID
})
```

**Result:** User logs in with auth.id `90fd...` but org_users has `9042...` → Access Denied

**Fix:**
1. Get client ONLY for email (ignore client.id)
2. Lookup in auth.users by email (`auth.admin.listUsers()`)
3. Use ONLY auth user.id for org_users insert

```typescript
// ✅ CORRECT
const client = await getClient(clientId) // Get email only
const authUsers = await supabase.auth.admin.listUsers()
const authUser = authUsers.users.find(u => u.email === client.email)

if (authUser) {
  // Use AUTH USER ID (not client.id)
  await supabase.from('org_users').insert({
    user_id: authUser.id // ✅ Auth ID from auth.users
  })
}
```

**Changes:**
- ✅ Detailed logging showing CRM ID vs Auth ID
- ✅ Explicit comments: "DO NOT USE client.id for permissions"
- ✅ Response includes both IDs for debugging
- ✅ ALWAYS uses auth.users.id for org_users

---

### v1.0.1 (19:55 UTC) - Previous Fixes

### BUG 1: Duplicate Organizations (Double Submit)
- **Problem:** Button not disabled on click → multiple orgs created
- **Fix:** Added `isSubmitting` state, button disabled during API call
- **Status:** ✅ Fixed

### BUG 2: Access Denied for Existing Users (CRITICAL!)
- **Problem:** Used `get_user_by_email()` RPC which didn't work correctly
- **Scenario:** Existing user → invitation created → trigger never fires → Access Denied
- **Fix:** Changed to `supabase.auth.admin.listUsers()` for proper user lookup
- **Status:** ✅ Fixed

**Updated Logic:**
```typescript
// Use auth.admin.listUsers() instead of RPC
const { data: authUsers } = await supabase.auth.admin.listUsers()
const existingUser = authUsers?.users?.find(
  u => u.email?.toLowerCase() === email.toLowerCase()
)

if (existingUser) {
  // User EXISTS → insert directly into org_users (NO invitation)
  await supabase.from('org_users').insert({ ... })
} else {
  // User NOT EXISTS → create invitation
  await supabase.from('invitations').insert({ ... })
}
```

---

## 🎯 Overview

The **Invitation System** allows admins to create organizations and assign existing CRM clients as owners **even if they haven't logged in yet**. When the client eventually logs in via Google Auth (with matching email), they are **automatically linked** to their organization.

---

## 🚀 How It Works

### User Flow

1. **Admin creates a new organization:**
   - Selects an existing client from the CRM (must have an email)
   - Creates the organization with client as owner

2. **System checks if client has logged in:**
   - **IF YES (user exists in `auth.users`):**
     - ✅ Client is immediately assigned to `org_users` with role `owner`
     - Client can log in and see their organization dashboard instantly
   
   - **IF NO (user doesn't exist yet):**
     - 📧 System creates a record in `invitations` table
     - When client logs in via Google (matching email), trigger fires
     - ✅ Client is automatically assigned to `org_users`
     - 🗑️ Invitation is marked as `used`

3. **Client logs in for the first time:**
   - Uses Google Auth with the same email
   - **Database trigger** (`on_auth_user_created_process_invitation`) fires
   - Client is auto-assigned to their organization
   - Redirected to their dashboard immediately

---

## 🗄️ Database Schema

### `public.invitations` Table

| Column       | Type                          | Description                                |
|--------------|-------------------------------|--------------------------------------------|
| `id`         | `UUID` (PK)                   | Unique invitation ID                       |
| `email`      | `TEXT` (NOT NULL)             | Client email address                       |
| `org_id`     | `UUID` (FK → organizations)   | Target organization ID                     |
| `role`       | `TEXT` (DEFAULT 'owner')      | Role to assign (owner/admin/staff)         |
| `invited_at` | `TIMESTAMP WITH TIME ZONE`    | When invitation was created                |
| `expires_at` | `TIMESTAMP WITH TIME ZONE`    | Expiration date (default: 30 days)         |
| `used`       | `BOOLEAN` (DEFAULT FALSE)     | Whether invitation was used                |
| `used_at`    | `TIMESTAMP WITH TIME ZONE`    | When invitation was used                   |
| `invited_by` | `UUID` (FK → auth.users)      | Admin who created the invitation           |

**Indexes:**
- `idx_invitations_email` - Fast lookup by email (WHERE used = FALSE)
- `idx_invitations_expires_at` - Cleanup queries (WHERE used = FALSE)

**Constraints:**
- `UNIQUE(email, org_id)` - Prevent duplicate invitations
- `CHECK(role IN ('owner', 'admin', 'staff'))` - Valid roles only

---

## ⚡ Database Trigger

### Trigger: `on_auth_user_created_process_invitation`

**When:** After INSERT on `auth.users`  
**What it does:**
1. Checks if there's a pending invitation for the new user's email
2. If found (and not expired):
   - Inserts user into `org_users` with the invitation's `org_id` and `role`
   - Marks the invitation as `used = TRUE`
   - Sets `used_at = NOW()`

**Function:** `process_invitation_on_signup()`

```sql
-- Pseudo-code:
ON NEW USER SIGNUP:
  1. SELECT invitation WHERE email = NEW.email AND used = FALSE
  2. IF invitation EXISTS AND NOT expired:
     - INSERT INTO org_users (org_id, user_id, email, role)
     - UPDATE invitations SET used = TRUE, used_at = NOW()
```

---

## 🔧 API Endpoints

### `POST /api/admin/organizations/create`

**Purpose:** Create organization with client assignment (immediate or invitation)

**Request Body:**
```json
{
  "name": "My Business",
  "category": "salon",
  "plan": "pro",
  "clientId": "client-uuid-here"
}
```

**Response (Immediate Assignment):**
```json
{
  "success": true,
  "organization": { "id": "...", "name": "..." },
  "client": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "assignment": {
    "immediate": true,
    "invitation": false,
    "userId": "user-uuid"
  },
  "message": "Organization created and owner assigned immediately"
}
```

**Response (Invitation Created):**
```json
{
  "success": true,
  "organization": { "id": "...", "name": "..." },
  "client": {
    "id": "...",
    "name": "Jane Smith",
    "email": "jane@example.com"
  },
  "assignment": {
    "immediate": false,
    "invitation": true,
    "userId": null
  },
  "message": "Organization created, invitation sent. Owner will be assigned on first login."
}
```

**Error Responses:**
- `401` - Unauthorized (not logged in)
- `403` - Admin access required
- `400` - Missing required fields or client has no email
- `404` - Client not found
- `500` - Internal server error

---

## 📋 Helper Functions

### `get_user_by_email(email_param TEXT)`

**Purpose:** Check if a user with the given email exists in `auth.users`  
**Access:** Admins only (SECURITY DEFINER)

**Usage:**
```sql
SELECT * FROM get_user_by_email('user@example.com');
```

**Returns:**
```sql
TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
```

### `cleanup_expired_invitations()`

**Purpose:** Delete expired, unused invitations (can be run via cron)

**Usage:**
```sql
SELECT cleanup_expired_invitations(); -- Returns count of deleted rows
```

---

## 🎨 UI Changes (Admin Panel)

### Before (Manual Input):
```
[ Business Name ]
[ Owner Email  ]
[ Owner Phone  ]
[ Category     ]
[ Plan         ]
```

### After (Client Selector):
```
[ Select Client (Dropdown) ]  ← Shows all clients with emails
   └─ Format: "First Last (email@example.com)"

[ Business Name ]
[ Category      ]
[ Plan          ]

💡 Tip: If client logged in → assigned immediately
        If not → invitation created, auto-assigned on first login
```

---

## 📊 Monitoring & Maintenance

### Check Pending Invitations
```sql
SELECT 
  email,
  org_id,
  role,
  invited_at,
  expires_at
FROM public.invitations
WHERE used = FALSE
ORDER BY invited_at DESC;
```

### Check Used Invitations
```sql
SELECT 
  email,
  org_id,
  role,
  invited_at,
  used_at,
  (used_at - invited_at) AS time_to_use
FROM public.invitations
WHERE used = TRUE
ORDER BY used_at DESC
LIMIT 20;
```

### Cleanup Expired Invitations (Manual)
```sql
SELECT cleanup_expired_invitations();
```

### Check Trigger Status
```sql
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created_process_invitation';
```

---

## 🔒 Security Considerations

1. **Admin-Only Access:**
   - Only users in `admin_users` can create invitations
   - Only admins can call `get_user_by_email()`

2. **Email Uniqueness:**
   - One invitation per email per organization
   - Prevents spam/duplicate invitations

3. **Expiration:**
   - Invitations expire after 30 days by default
   - Cleanup function available for maintenance

4. **No Public Exposure:**
   - `invitations` table has RLS enabled
   - Only admins can SELECT/INSERT/UPDATE

5. **Idempotent Trigger:**
   - Uses `ON CONFLICT DO NOTHING` to prevent duplicates
   - Safe to run multiple times (won't create duplicate org_users)

---

## 🧪 Testing Checklist

### Test Case 1: Client Already Logged In
1. Create client with email `test1@example.com`
2. Log in as that client via Google Auth
3. Admin creates organization, selects that client as owner
4. ✅ Verify: Client is immediately in `org_users`
5. ✅ Verify: No invitation created
6. ✅ Verify: Client sees organization dashboard on next login

### Test Case 2: Client Not Logged In Yet
1. Create client with email `test2@example.com`
2. DO NOT log in as that client
3. Admin creates organization, selects that client as owner
4. ✅ Verify: Invitation created in `invitations` table
5. ✅ Verify: `used = FALSE`
6. Log in as `test2@example.com` via Google Auth
7. ✅ Verify: Trigger fired, user added to `org_users`
8. ✅ Verify: Invitation marked as `used = TRUE`
9. ✅ Verify: Client sees organization dashboard

### Test Case 3: Expired Invitation
1. Create invitation manually with `expires_at` in the past
2. Log in with matching email
3. ✅ Verify: Trigger does NOT assign (expired check)
4. ✅ Verify: User sees "no organization" or onboarding

### Test Case 4: Duplicate Prevention
1. Create organization A, assign client X (creates invitation)
2. Try to create organization B, assign same client X
3. ✅ Verify: Error or graceful handling (UNIQUE constraint)

---

## 📁 Files Changed

### Database Migrations
- `supabase/create-invitations-table.sql` - Table + trigger + policies
- `supabase/create-get-user-by-email-function.sql` - Helper function

### API Routes
- `src/app/api/admin/organizations/create/route.ts` - New endpoint

### UI Components
- `src/app/admin/organizations/page.tsx` - Client selector UI

### Hooks
- `src/hooks/useAdmin.ts` - (No changes needed, using fetch directly)

---

## 🔄 Migration Steps

1. **Run SQL migrations:**
   ```bash
   # In Supabase Dashboard SQL Editor
   -- Run create-get-user-by-email-function.sql first
   -- Run create-invitations-table.sql second
   ```

2. **Deploy code:**
   ```bash
   git add .
   git commit -m "feat: invitation system for pre-assignment"
   git push origin main
   ```

3. **Verify in production:**
   - Check trigger exists: `pg_trigger` query
   - Create test organization with new client
   - Log in as that client, verify auto-assignment

---

## 🎉 Benefits

1. **No Manual Work:** Clients are auto-assigned on first login
2. **Zero Friction:** No need to send emails or ask clients to "accept invitation"
3. **Admin Control:** Admins prepare everything, clients just log in
4. **Future-Proof:** Works even if client logs in weeks/months later
5. **Audit Trail:** `invited_at`, `used_at` timestamps for tracking

---

## 📚 Related Documentation

- [Google Auth Setup](./GOOGLE_AUTH.md)
- [Organization Management](./ORGANIZATIONS.md)
- [RLS Policies](./RLS_POLICIES.md)

---

**Questions?** Contact the dev team or check the trigger logs in `pg_stat_activity`.
