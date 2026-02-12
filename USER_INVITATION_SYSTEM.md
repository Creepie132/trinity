# 👥 User Invitation System

**Version:** 2.18.0  
**Date:** 2026-02-12

---

## 📋 Overview

Система приглашения пользователей позволяет администраторам и владельцам организаций добавлять новых пользователей по email. Пользователи автоматически получают доступ при первом логине через Google Auth.

---

## 🔑 Key Features

### 1. **Pre-Assignment Invitation**
- Создание записи `org_users` с `user_id = null`
- Email сохраняется для последующей привязки
- Роль назначается сразу (owner/manager/user)

### 2. **Auto-Link on First Login**
- При логине через Google проверяется email
- Если найдена запись с `user_id = null` → обновляется на `auth.uid()`
- Пользователь сразу получает доступ к организации

### 3. **Two Access Levels**

**Admin Panel** (`/admin/organizations`):
- Полный доступ ко всем организациям
- Добавление пользователей в любую организацию
- Просмотр всех пользователей

**CRM Settings** (`/settings/users`):
- Доступ только для owner'ов организации
- Управление пользователями своей организации
- Те же возможности (добавить/удалить)

---

## 🚀 User Flow

### Сценарий 1: Добавление нового пользователя

```
1. Owner/Admin открывает страницу управления пользователями
2. Нажимает "הוסף משתמש"
3. Вводит email и выбирает роль
4. Нажимает "הוסף משתמש"

Backend:
├─ Проверка прав доступа (admin или owner)
├─ Проверка дубликатов (email уже в org?)
├─ INSERT org_users (org_id, email, role, user_id=NULL)
└─ Response: { success: true, status: 'pending' }

5. Пользователь видит приглашённого с badge "ממתין"
6. Приглашённый получает уведомление (будущая фича: email/SMS)
```

### Сценарий 2: Первый логин приглашённого

```
1. Приглашённый открывает Trinity
2. Нажимает "Login with Google"
3. Google Auth → callback

Callback Flow:
├─ Exchange code for session
├─ Get user (id, email)
├─ AUTO-LINK: UPDATE org_users 
│  SET user_id = {auth.uid} 
│  WHERE email = {user.email} AND user_id IS NULL
└─ Redirect to dashboard

4. Пользователь видит свою организацию
5. В списке пользователей badge меняется: "ממתין" → "מחובר"
```

---

## 🔧 API Endpoints

### POST /api/org/invite-user

**Назначение:** Пригласить пользователя в организацию

**Request:**
```json
{
  "org_id": "uuid",
  "email": "user@example.com",
  "role": "user" // owner | manager | user
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "המשתמש נוסף בהצלחה",
  "user": {
    "org_id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "user_id": null,
    "joined_at": "2026-02-12T16:00:00Z"
  },
  "status": "pending"
}
```

**Response (Error - Already Exists):**
```json
{
  "error": "המשתמש כבר נמצא בארגון",
  "existing": true,
  "user": {
    "user_id": "uuid",
    "email": "user@example.com",
    "role": "manager"
  }
}
```

**Permissions:**
- ✅ Admin (any organization)
- ✅ Owner (own organization only)
- ❌ Manager, User → 403 Forbidden

---

### DELETE /api/org/invite-user

**Назначение:** Удалить пользователя из организации

**Request:**
```json
{
  "org_id": "uuid",
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "המשתמש הוסר בהצלחה"
}
```

**Response (Error - Self-Removal):**
```json
{
  "error": "לא ניתן להסיר את עצמך מהארגון"
}
```

**Permissions:**
- ✅ Admin (any organization)
- ✅ Owner (own organization only)
- ❌ Cannot remove self

---

## 🗄️ Database Schema

### org_users Table

```sql
CREATE TABLE org_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL until first login
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('owner', 'manager', 'user')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, email) -- Prevent duplicate invitations
)
```

**States:**
- `user_id = NULL` → Pending invitation (badge: "ממתין")
- `user_id = UUID` → Connected user (badge: "מחובר")

---

## 🔒 Security

### Permission Checks

**Who Can Invite:**
```typescript
// Check if user is admin
const { data: adminCheck } = await supabase
  .from('admin_users')
  .select('user_id')
  .eq('user_id', user.id)

// OR check if user is owner of this org
const { data: ownerCheck } = await supabase
  .from('org_users')
  .select('role')
  .eq('org_id', org_id)
  .eq('user_id', user.id)
  .eq('role', 'owner')

if (!adminCheck && !ownerCheck) {
  return 403 // Forbidden
}
```

### Duplicate Prevention

```sql
-- Unique constraint
UNIQUE(org_id, email)

-- Check before insert
SELECT * FROM org_users 
WHERE org_id = $1 AND email = $2
```

### Email Normalization

```typescript
const normalizedEmail = email.toLowerCase().trim()
```

### Self-Removal Prevention

```typescript
if (user.email?.toLowerCase() === normalizedEmail) {
  return { error: 'לא ניתן להסיר את עצמך' }
}
```

---

## 💻 UI Components

### Admin Panel - Organizations Sheet

**Location:** `/admin/organizations`

**Features:**
- Card "משתמשים" with user count
- Button "הוסף משתמש"
- User list with badges (מחובר/ממתין)
- Remove button (trash icon)

**UI Example:**
```
┌─ משתמשים ─────────────────────────┐
│  [הוסף משתמש]                      │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ user@example.com  [מחובר]   │  │
│  │ משתמש               [🗑️]     │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ pending@example.com [ממתין]  │  │
│  │ מנהל                [🗑️]     │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
```

---

### CRM - Settings / Users

**Location:** `/settings/users`

**Features:**
- Owner-only access check
- Add user dialog
- User list with status
- Remove confirmation

**Access Control:**
```typescript
useEffect(() => {
  supabase
    .from('org_users')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()
    .then(({ data }) => {
      setIsOwner(data?.role === 'owner')
    })
}, [orgId, user])

if (!isOwner) {
  return <AccessDenied />
}
```

---

## 📊 Roles

### Owner (בעלים)
- **Access:** Full access to everything
- **Can:**
  - Manage users (add/remove)
  - Access all features
  - Change organization settings
  - View all data

### Manager (מנהל)
- **Access:** Management level
- **Can:**
  - Manage clients
  - Process payments
  - Send SMS campaigns
  - View analytics
- **Cannot:**
  - Manage users
  - Change organization settings

### User (משתמש)
- **Access:** Read-only
- **Can:**
  - View clients
  - View payments
  - View stats
- **Cannot:**
  - Edit anything
  - Manage users
  - Process payments

---

## 🧪 Testing

### Test 1: Invite New User

```bash
# 1. Login as Owner
# 2. Go to /settings/users
# 3. Click "הוסף משתמש"
# 4. Enter: test@example.com, Role: user
# 5. Click "הוסף משתמש"

# Expected Result:
# - User appears in list with badge "ממתין"
# - Toast: "המשתמש נוסף בהצלחה"
```

### Test 2: First Login (Auto-Link)

```bash
# 1. Logout
# 2. Open incognito/private window
# 3. Login with test@example.com (Google)
# 4. After redirect, check:
#    - Redirected to dashboard (not /unauthorized)
#    - Can see organization name in sidebar

# 5. Login as Owner again
# 6. Go to /settings/users
# 7. Check test@example.com
#    - Badge should be "מחובר" (was "ממתין")
```

### Test 3: Duplicate Prevention

```bash
# 1. Try to invite test@example.com again
# Expected:
# - Error toast: "המשתמש כבר נמצא בארגון"
# - User not added twice
```

### Test 4: Permission Check

```bash
# 1. Login as Manager (not Owner)
# 2. Go to /settings/users
# Expected:
# - Access denied message
# - "רק בעלי ארגון יכולים לנהל משתמשים"
```

### Test 5: Self-Removal Prevention

```bash
# 1. Login as Owner
# 2. Go to /settings/users
# 3. Try to remove yourself
# Expected:
# - Confirmation blocked
# - Error: "לא ניתן להסיר את עצמך"
```

---

## 🔍 Debug & Monitoring

### Check User Status

```sql
-- Check pending invitations
SELECT email, role, user_id, joined_at
FROM org_users
WHERE org_id = 'uuid' AND user_id IS NULL
ORDER BY joined_at DESC;

-- Check connected users
SELECT email, role, user_id, joined_at
FROM org_users
WHERE org_id = 'uuid' AND user_id IS NOT NULL
ORDER BY joined_at DESC;
```

### Callback Logs

```javascript
// In callback/route.ts
console.log('[Callback] Auto-linking user_id for email:', user.email)
console.log('[Callback] ✅ Auto-linked user to', linkedRows.length, 'organization(s)')
console.log('[Callback] Organizations:', linkedRows.map(r => r.org_id))
```

### API Logs

```javascript
// In /api/org/invite-user
console.log('[Invite User] Request:', { org_id, email, role, inviter })
console.log('[Invite User] ✅ Permission check passed')
console.log('[Invite User] ✅ User invited successfully:', newUser)
```

---

## 🐛 Troubleshooting

### User Not Auto-Linked

**Symptom:** User logs in but stays "ממתין"

**Debug:**
1. Check callback logs:
```bash
vercel logs --follow | grep "Auto-link"
```

2. Check database:
```sql
SELECT * FROM org_users 
WHERE email = 'user@example.com';
```

3. Verify email match:
```sql
-- Auth email
SELECT id, email FROM auth.users 
WHERE email = 'user@example.com';

-- Org user email
SELECT id, email, user_id FROM org_users 
WHERE email = 'user@example.com';
```

**Solution:**
- Emails must match exactly (case-insensitive)
- Check callback logs for errors
- Manual fix:
```sql
UPDATE org_users 
SET user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
WHERE email = 'user@example.com' AND user_id IS NULL;
```

---

### Permission Denied

**Symptom:** "Only admins or organization owners can invite users"

**Debug:**
```sql
-- Check if user is admin
SELECT * FROM admin_users WHERE user_id = 'auth-uid';

-- Check if user is owner
SELECT * FROM org_users 
WHERE org_id = 'org-id' 
  AND user_id = 'auth-uid' 
  AND role = 'owner';
```

**Solution:**
- User must be either admin OR owner of this specific org
- Manager/User roles cannot invite

---

### Cannot Remove User

**Symptom:** Delete fails silently or shows error

**Debug:**
```javascript
// Check if trying to remove self
user.email === targetEmail // Should be false
```

**Solution:**
- Cannot remove yourself
- Use different account to remove this user

---

## 📚 Related Documentation

- [Auto-Link System](docs/AUTO_LINK_USER_ID.md)
- [Invitation System](docs/INVITATION_SYSTEM.md)
- [Multi-Tenancy](supabase/RELATIONSHIPS.md)

---

## ✅ Production Checklist

Before deploying:

- [ ] Environment variables set
- [ ] Unique constraint on org_users(org_id, email)
- [ ] RLS policies correct on org_users
- [ ] Callback auto-link code tested
- [ ] Permission checks tested
- [ ] UI tested (Admin + CRM)
- [ ] Role system documented
- [ ] Email normalization working
- [ ] Self-removal prevention working
- [ ] Duplicate prevention working

---

**Version History:**
- v2.18.0 (2026-02-12) - Initial user invitation system
- Auto-link on first login
- Admin + CRM user management
- Role-based access control
