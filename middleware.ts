import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = ['/login', '/unauthorized', '/blocked', '/landing', '/terms', '/policy', '/pricing', '/access-pending', '/subscription-expired', '/onboarding']
const CALLBACK_PATH = '/callback'
const WEBHOOK_PATH = '/api/payments/webhook'
const STRIPE_WEBHOOK_PATH = '/api/payments/stripe-webhook'
const TRANZILA_WEBHOOK_PATH = '/api/payments/tranzila/webhook'
const TRANZILA_SUCCESS_PATH = '/api/payments/tranzila-success'
const TRANZILA_FAILED_PATH = '/api/payments/tranzila-failed'
const CARDCOM_SUCCESS_PATH = '/api/payments/cardcom-success'
const PAYMENT_SUCCESS_PATH = '/payment-success'
const PAYMENT_FAILED_PATH = '/payment-failed'
const HEALTH_PATH = '/api/health'
const ACCESS_API_PATH = '/api/access'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow root page
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Allow public routes
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname === CALLBACK_PATH ||
    pathname.startsWith(CALLBACK_PATH + '?') ||
    pathname === WEBHOOK_PATH ||
    pathname.startsWith(WEBHOOK_PATH + '/') ||
    pathname === STRIPE_WEBHOOK_PATH ||
    pathname.startsWith(STRIPE_WEBHOOK_PATH + '/') ||
    pathname === TRANZILA_WEBHOOK_PATH ||
    pathname.startsWith(TRANZILA_WEBHOOK_PATH + '/') ||
    pathname === TRANZILA_SUCCESS_PATH ||
    pathname.startsWith(TRANZILA_SUCCESS_PATH + '/') ||
    pathname === TRANZILA_FAILED_PATH ||
    pathname === CARDCOM_SUCCESS_PATH ||
    pathname === PAYMENT_SUCCESS_PATH ||
    pathname === PAYMENT_FAILED_PATH ||
    pathname === HEALTH_PATH ||
    pathname.startsWith(ACCESS_API_PATH + '/') ||
    pathname.startsWith('/book/') ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/.well-known')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // FIX: Handle stale/invalid auth cookies
  let session = null
  try {
    const result = await supabase.auth.getSession()
    session = result.data.session
  } catch (error) {
    // If getSession throws error (stale cookies, invalid JWT, etc.)
    // Clear all supabase cookies and redirect to login
    console.error('[middleware] getSession error (clearing cookies):', error)
    
    // Clear all supabase-related cookies
    const cookiesToClear = req.cookies.getAll().filter(
      (cookie) => cookie.name.startsWith('sb-') || cookie.name.includes('supabase')
    )
    
    const redirectResponse = NextResponse.redirect(new URL('/login', req.url))
    cookiesToClear.forEach((cookie) => {
      redirectResponse.cookies.delete(cookie.name)
    })
    
    return redirectResponse
  }

  // No session or invalid session → redirect to login
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Session exists → CSRF protection for API routes
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    // Исключаем webhooks и публичные API (они приходят от внешних сервисов)
    const csrfExempt = [
      "/api/payments/webhook",
      "/api/payments/stripe-webhook",
      "/api/payments/tranzila/webhook",
      "/api/payments/tranzila/success",
      "/api/payments/callback",
      "/api/booking/",
      "/api/contact",
      "/api/access/",
    ]

    const isExempt = csrfExempt.some(p => pathname.startsWith(p))

    if (!isExempt) {
      const origin = req.headers.get("origin")
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ambersol.co.il"

      if (origin && !origin.startsWith(appUrl) && !origin.startsWith("https://www.ambersol.co.il")) {
        console.warn('[middleware] CSRF blocked:', { origin, pathname })
        return NextResponse.json({ error: "CSRF: Invalid origin" }, { status: 403 })
      }
    }
  }

  // Check access control (subscription/trial status)
  // Skip for admin routes and static paths
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
    try {
      // Check if user is admin from JWT claims (no DB query!)
      const isAdmin = session.user.app_metadata?.is_admin === true
      
      // Fallback: check admin_users table if not in JWT
      let adminUser = null
      if (!isAdmin) {
        const { data } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle()
        adminUser = data
      }

      // Admins always have access
      if (!isAdmin && !adminUser) {
        // Try to get org data from JWT claims first
        const jwtOrgId = session.user.app_metadata?.org_id
        
        let org: any = null
        
        if (jwtOrgId) {
          // Fast path: org_id from JWT, fetch only org data (no join needed)
          const { data: orgData } = await supabase
            .from('organizations')
            .select('subscription_status, subscription_expires_at, features')
            .eq('id', jwtOrgId)
            .single()
          org = orgData
        } else {
          // Fallback: old way via org_users join
          const { data: orgUser } = await supabase
            .from('org_users')
            .select('org_id, organizations(subscription_status, subscription_expires_at, features)')
            .eq('user_id', session.user.id)
            .maybeSingle()
          org = orgUser?.organizations
        }

        const now = new Date()

        // Check if subscription is expired
        const isExpired = org && (
          org.subscription_status === 'expired' ||
          (org.subscription_expires_at && new Date(org.subscription_expires_at) < now)
        )

        if (isExpired && pathname !== '/subscription-expired') {
          const url = req.nextUrl.clone()
          url.pathname = '/subscription-expired'
          return NextResponse.redirect(url)
        }

        // Check if user has active access
        // 'active' and 'manual' always have access (manual = manually managed, no expiry check)
        // 'trial' requires valid (non-expired) expiry date
        const hasAccess = org && (
          org.subscription_status === 'active' ||
          org.subscription_status === 'manual' ||
          (org.subscription_status === 'trial' && org.subscription_expires_at && new Date(org.subscription_expires_at) > now)
        )

        if (!hasAccess && !isExpired && pathname !== '/access-pending') {
          const url = req.nextUrl.clone()
          url.pathname = '/access-pending'
          return NextResponse.redirect(url)
        }

        // Module-based access control (Trinity requirement)
        if (hasAccess && org?.features?.modules) {
          const modules = org.features.modules as Record<string, boolean>
          
          // Map routes to module keys
          const moduleRoutes: Record<string, string> = {
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

          // Check if current route requires a module
          for (const [route, moduleKey] of Object.entries(moduleRoutes)) {
            if (pathname.startsWith(route)) {
              // For booking, check both 'booking' and 'online_booking' module keys
              const hasModule = moduleKey === 'booking' 
                ? (modules.booking === true || modules.online_booking === true)
                : modules[moduleKey] === true

              if (!hasModule) {
                // Module is disabled, redirect to dashboard
                console.log(`[middleware] Module ${moduleKey} access denied for route ${pathname}`)
                const url = req.nextUrl.clone()
                url.pathname = '/dashboard'
                return NextResponse.redirect(url)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[middleware] Access check error:', error)
      // On error, allow access to avoid blocking legitimate users
    }
  }

  // All other checks (admin, org_users, org status) happen on client side
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)'],
}
