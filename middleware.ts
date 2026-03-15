import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ─── Public paths — O(1) Set lookup ──────────────────────────────────────────
const PUBLIC_PATH_SET = new Set([
  '/', '/login', '/unauthorized', '/blocked', '/landing',
  '/terms', '/policy', '/pricing', '/access-pending',
  '/subscription-expired', '/onboarding', '/callback',
  '/payment-success', '/payment-failed', '/payment/success', '/payment/fail',
])

const PUBLIC_PATH_PREFIXES = [
  '/onboarding/', '/book/', '/invite/', '/.well-known',
  '/api/payments/webhook', '/api/payments/stripe-webhook',
  '/api/payments/tranzila/webhook', '/api/payments/tranzila-success',
  '/api/payments/tranzila-failed', '/api/payments/cardcom-success',
  '/api/payments/tranzila/success', '/api/payments/callback',
  '/api/booking/', '/api/contact', '/api/access/', '/api/health',
]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATH_SET.has(pathname)) return true
  for (const prefix of PUBLIC_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) return true
  }
  return false
}

// ─── CSRF allowed origins ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  'https://ambersol.co.il',
  'https://www.ambersol.co.il',
  'http://localhost:3000',
  'http://localhost:3001',
])

const CSRF_EXEMPT_PREFIXES = [
  '/api/payments/', '/api/booking/', '/api/contact', '/api/access/',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Public paths — no auth needed ──────────────────────────────────────
  if (isPublicPath(pathname)) return NextResponse.next()

  // ── 2. API routes — skip access-check, protected by getAuthContext() ──────
  //    Only do session validation + CSRF here, NOT subscription checks
  const isApiRoute = pathname.startsWith('/api/')

  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // ── 3. Auth check — getSession() reads JWT, NO DB roundtrip ───────────────
  let session = null
  try {
    const result = await supabase.auth.getSession()
    session = result.data.session
  } catch (error) {
    console.error('[middleware] getSession error:', error)
    const cookiesToClear = req.cookies.getAll().filter(
      c => c.name.startsWith('sb-') || c.name.includes('supabase')
    )
    const redirect = NextResponse.redirect(new URL('/login', req.url))
    cookiesToClear.forEach(c => redirect.cookies.delete(c.name))
    return redirect
  }

  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // ── 4. CSRF — only for mutating API calls ─────────────────────────────────
  if (isApiRoute && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const isExempt = CSRF_EXEMPT_PREFIXES.some(p => pathname.startsWith(p))
    if (!isExempt) {
      const origin = req.headers.get('origin')
      const isVercelPreview = origin?.includes('vercel.app') && origin?.includes('trinity')
      if (origin && !ALLOWED_ORIGINS.has(origin) && !isVercelPreview) {
        console.warn('[middleware] CSRF blocked:', { origin, pathname })
        return NextResponse.json({ error: 'CSRF: Invalid origin' }, { status: 403 })
      }
    }
  }

  // ── 5. API routes stop here — no subscription check needed ────────────────
  if (isApiRoute) return response

  // ── 6. Admin routes — skip subscription check ────────────────────────────
  if (pathname.startsWith('/admin')) return response

  // ── 7. Subscription / access check — page routes only ────────────────────
  try {
    // is_admin from JWT app_metadata — NO DB query, reads from token
    const isAdmin = session.user.app_metadata?.is_admin === true
    if (isAdmin) return response

    // org_id from JWT — fast path, no join needed
    const jwtOrgId = session.user.app_metadata?.org_id as string | undefined
    let org: any = null

    if (jwtOrgId) {
      // Single DB query — only subscription fields, no joins
      const { data } = await supabase
        .from('organizations')
        .select('subscription_status, subscription_expires_at, features')
        .eq('id', jwtOrgId)
        .single()
      org = data
    } else {
      // Fallback: user doesn't have org_id in JWT yet (first login edge case)
      const { data: orgUser } = await supabase
        .from('org_users')
        .select('org_id, organizations(subscription_status, subscription_expires_at, features)')
        .eq('user_id', session.user.id)
        .maybeSingle()
      org = (orgUser?.organizations as any)
    }

    const now = new Date()

    const isExpired = org && (
      org.subscription_status === 'inactive' ||
      org.subscription_status === 'expired' ||
      (org.subscription_expires_at &&
        new Date(org.subscription_expires_at) < now &&
        !['active', 'manual', 'demo'].includes(org.subscription_status))
    )

    if (isExpired && pathname !== '/subscription-expired') {
      return NextResponse.redirect(new URL('/subscription-expired', req.url))
    }

    const hasAccess = org && (
      org.subscription_status === 'active' ||
      org.subscription_status === 'manual' ||
      org.subscription_status === 'demo' ||
      (org.subscription_status === 'trial' &&
        org.subscription_expires_at &&
        new Date(org.subscription_expires_at) > now)
    )

    if (!hasAccess && !isExpired && pathname !== '/access-pending') {
      return NextResponse.redirect(new URL('/access-pending', req.url))
    }

    // ── Module access control ────────────────────────────────────────────────
    if (hasAccess && org?.features?.modules) {
      const modules = org.features.modules as Record<string, boolean>
      const MODULE_ROUTES: Record<string, string> = {
        '/payments': 'payments',
        '/inventory': 'inventory',
        '/sms': 'sms',
        '/stats': 'statistics',
        '/reports': 'reports',
        '/subscriptions': 'subscriptions',
        '/booking': 'booking',
        '/settings/booking': 'booking',
        '/loyalty': 'loyalty',
      }
      for (const [route, moduleKey] of Object.entries(MODULE_ROUTES)) {
        if (pathname.startsWith(route)) {
          const hasModule = moduleKey === 'booking'
            ? (modules.booking === true || modules.online_booking === true)
            : modules[moduleKey] === true
          if (!hasModule) {
            return NextResponse.redirect(new URL('/dashboard', req.url))
          }
        }
      }
    }
  } catch (error) {
    console.error('[middleware] Access check error:', error)
    // Allow on error — don't block legitimate users
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)'],
}
