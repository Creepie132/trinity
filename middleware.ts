import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = ['/login', '/unauthorized', '/blocked', '/landing', '/terms', '/policy']
const CALLBACK_PATH = '/callback'
const WEBHOOK_PATH = '/api/payments/webhook'
const STRIPE_WEBHOOK_PATH = '/api/payments/stripe-webhook'
const TRANZILA_WEBHOOK_PATH = '/api/payments/tranzila/webhook'
const HEALTH_PATH = '/api/health'

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
    pathname === HEALTH_PATH ||
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

  // All other checks (admin, org_users, org status) happen on client side
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)'],
}
