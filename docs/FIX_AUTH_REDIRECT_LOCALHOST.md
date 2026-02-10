# Fix: Auth Callback Redirects to Localhost in Production

## Critical Bug

**Symptom:** After successful login on Vercel (https://trinity-sage.vercel.app), the auth callback redirected to `http://localhost:3001`, breaking the production login flow.

**Impact:** Users couldn't log in on production - stuck in infinite redirect loop or "This site can't be reached" error.

## Root Cause

The `/callback` route used `process.env.NEXT_PUBLIC_APP_URL` for redirect base URL:

```typescript
// ❌ WRONG - hardcoded or env variable
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin
return NextResponse.redirect(new URL('/admin', baseUrl))
```

**Problems with this approach:**
1. `NEXT_PUBLIC_APP_URL` was likely set to `http://localhost:3001` locally
2. This environment variable may not be set correctly in Vercel
3. Even if set, it's static - doesn't adapt to different deployment environments
4. Using `url.origin` from `new URL(request.url)` can be unreliable

## Solution

Use `request.nextUrl.origin` instead - it **dynamically resolves** to the actual domain:

```typescript
// ✅ CORRECT - dynamic origin detection
const origin = request.nextUrl.origin
return NextResponse.redirect(`${origin}/admin`)
```

**Why this works:**
- On localhost: `origin = "http://localhost:3001"`
- On Vercel: `origin = "https://trinity-sage.vercel.app"`
- No environment variables needed
- Works automatically in any deployment environment

## Code Changes

### Before (Broken):

```typescript
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  
  // ❌ Uses env variable or fallback
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin
  
  // ❌ Queries by email
  const { data: admin } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .maybeSingle()
  
  // ❌ Redirect with baseUrl
  return NextResponse.redirect(new URL('/admin', baseUrl))
}
```

### After (Fixed):

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  
  // ✅ Dynamic origin from request
  const origin = request.nextUrl.origin
  
  // ✅ Queries by user_id (FK)
  const { data: admin } = await supabase
    .from('admin_users')
    .select('email')
    .eq('user_id', user.id)
    .maybeSingle()
  
  // ✅ Direct string interpolation
  return NextResponse.redirect(`${origin}/admin`)
}
```

## Additional Fixes

While fixing the redirect issue, also corrected:

### 1. Email-based queries → user_id queries
```typescript
// ❌ Before
.eq('email', email)

// ✅ After
.eq('user_id', user.id)
```

This ensures consistency with other auth fixes (v2.4.1, v2.4.2).

### 2. NextRequest type
```typescript
// ✅ Using NextRequest instead of Request
export async function GET(request: NextRequest)
```

Provides better typing for `nextUrl` property.

### 3. Direct searchParams access
```typescript
// ✅ More direct
const { searchParams } = request.nextUrl
const code = searchParams.get('code')
```

## Testing

### Localhost (Development):
```bash
1. Run: npm run dev
2. Login via Supabase
3. Verify redirect: http://localhost:3001/admin or http://localhost:3001/
4. Check console - no errors
```

### Vercel (Production):
```bash
1. Deploy to Vercel
2. Login via https://trinity-sage.vercel.app
3. Verify redirect: https://trinity-sage.vercel.app/admin or /
4. NO redirect to localhost!
```

## Environment Variables (Optional)

You can now **remove** `NEXT_PUBLIC_APP_URL` from:
- `.env.local` (local development)
- Vercel Environment Variables (production)

It's no longer needed!

## Redirect Flow

```
1. User clicks "Login" → Supabase auth page
2. User authenticates → Supabase redirects to /callback?code=xxx
3. Callback exchanges code for session
4. Callback checks:
   - Is admin? → redirect to /admin
   - Is org user? → redirect to /
   - Neither? → redirect to /unauthorized
5. All redirects use request.nextUrl.origin (dynamic!)
```

## Related Files

- ✅ `src/app/callback/route.ts` - Auth callback handler (THIS FILE)
- ✅ `middleware.ts` - Already fixed in v2.4.2
- ✅ `src/lib/api-auth.ts` - Already fixed in v2.4.2
- ✅ `src/hooks/useAuth.ts` - Already fixed in v2.4.1

## Summary

✅ **Fixed:** Auth callback now uses dynamic origin  
✅ **Removed:** Dependency on NEXT_PUBLIC_APP_URL env variable  
✅ **Improved:** Email queries → user_id queries for consistency  
✅ **Result:** Login works on both localhost AND production automatically

**Before:** Redirect to localhost broke production login  
**After:** Redirect to actual domain, production login works! 🎉

---

**Version:** 2.4.3  
**Date:** 2026-02-10  
**Priority:** CRITICAL (Production blocker)  
**Author:** OpenClaw Assistant
